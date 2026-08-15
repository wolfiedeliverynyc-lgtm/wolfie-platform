import pytest
from unittest.mock import MagicMock, patch
from database import transaction
from database.schemas import User, DriverLocation
from services.matching import SmartMatchingEngine
from services.mapbox import MapboxClient
import uuid

def test_matching_engine_success(client):
    # Setup drivers in database
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(DriverLocation).delete()
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            
            # Create three available drivers
            d1 = User(id=f"drv_1_{uid}", email=f"d1_{uid}@test.com", password_hash="hash", full_name="Driver One", role="driver", phone="+111", is_active=True, is_available=True, rating=4.5, vehicle_type="car")
            d2 = User(id=f"drv_2_{uid}", email=f"d2_{uid}@test.com", password_hash="hash", full_name="Driver Two", role="driver", phone="+222", is_active=True, is_available=True, rating=5.0, vehicle_type="car")
            d3 = User(id=f"drv_3_{uid}", email=f"d3_{uid}@test.com", password_hash="hash", full_name="Driver Three", role="driver", phone="+333", is_active=True, is_available=True, rating=4.0, vehicle_type="car")
            
            tx_session.add_all([d1, d2, d3])
            tx_session.flush()
            
            # Setup their locations
            # Pickup location is at 40.7128, -73.9566
            # d2 is closest by Haversine, then d1, then d3.
            loc1 = DriverLocation(driver_id=d1.id, lat=40.7028, lng=-73.9666)
            loc2 = DriverLocation(driver_id=d2.id, lat=40.7100, lng=-73.9500)
            loc3 = DriverLocation(driver_id=d3.id, lat=40.6900, lng=-73.9700)
            
            tx_session.add_all([loc1, loc2, loc3])
            tx_session.commit()

        # Mock Mapbox client
        mock_mapbox = MagicMock(spec=MapboxClient)
        # distance_matrix returns driving distance in km to the destinations list (size 1)
        # Candidate list will be sorted by Haversine distance: [d2, d1, d3]
        # For d2: 0.8 km driving distance
        # For d1: 1.2 km driving distance
        # For d3: 2.5 km driving distance
        mock_mapbox.distance_matrix.return_value = [[0.8], [1.2], [2.5]]

        engine = SmartMatchingEngine(mock_mapbox, config={})
        
        # Test finding best driver
        best = engine.find_best_driver(
            order_id="order_123",
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )
        
        assert best is not None
        assert best["id"] == d2.id
        assert best["distance_km"] == 0.8
        
        # Verify Mapbox Matrix API was called with the correct sorted order of candidates (d2 first, then d1, then d3)
        mock_mapbox.distance_matrix.assert_called_once()
        sources_arg = mock_mapbox.distance_matrix.call_args[0][0]
        assert len(sources_arg) == 3
        assert sources_arg[0]["lat"] == 40.7100
        assert sources_arg[1]["lat"] == 40.7028
        assert sources_arg[2]["lat"] == 40.6900


def test_matching_engine_mapbox_failure(client):
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            d1 = User(id=f"drv_f_{uid}", email=f"f1_{uid}@test.com", password_hash="hash", full_name="Driver F1", role="driver", phone="+111", is_active=True, is_available=True, rating=4.8)
            tx_session.add_all([d1])
            tx_session.flush()
            loc1 = DriverLocation(driver_id=d1.id, lat=40.7028, lng=-73.9666)
            tx_session.add(loc1)
            tx_session.commit()

        # Mock Mapbox client that raises error
        mock_mapbox = MagicMock(spec=MapboxClient)
        mock_mapbox.distance_matrix.side_effect = Exception("Mapbox API Timeout")

        engine = SmartMatchingEngine(mock_mapbox, config={})
        
        # Exception should be caught and fallback to Haversine
        best = engine.find_best_driver(
            order_id="order_456",
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )
        assert best is not None


def test_matching_engine_mapbox_mock_mode(client):
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            d1 = User(id=f"drv_m_{uid}", email=f"m1_{uid}@test.com", password_hash="hash", full_name="Driver M1", role="driver", phone="+111", is_active=True, is_available=True, rating=4.8)
            tx_session.add_all([d1])
            tx_session.flush()
            loc1 = DriverLocation(driver_id=d1.id, lat=40.7028, lng=-73.9666)
            tx_session.add(loc1)
            tx_session.commit()
            
        # Setup Mapbox client with empty token (mock mode active)
        mapbox_client = MapboxClient(token="")
        engine = SmartMatchingEngine(mapbox_client, config={})
        
        # Exception should be caught and fallback to Haversine
        best = engine.find_best_driver(
            order_id="order_789",
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )
        assert best is not None


def test_matching_engine_traffic_duration_vs_distance(client):
    """
    Verify that a driver with shorter traffic duration (ETA) is selected over a closer
    driver who is severely delayed in traffic congestion.
    """
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            
            # Driver Close (Stuck in traffic)
            d_stuck = User(
                id=f"drv_stuck_{uid}",
                email=f"stuck_{uid}@test.com", password_hash="hash",
                full_name="Driver Stuck In Traffic", role="driver", phone="+111000",
                is_active=True, is_available=True, rating=4.9
            )
            # Driver Clear (On highway/fast route)
            d_fast = User(
                id=f"drv_fast_{uid}",
                email=f"fast_{uid}@test.com", password_hash="hash",
                full_name="Driver Fast Highway", role="driver", phone="+222000",
                is_active=True, is_available=True, rating=4.8
            )
            tx_session.add_all([d_stuck, d_fast])
            tx_session.flush()

            loc_stuck = DriverLocation(driver_id=d_stuck.id, lat=40.7150, lng=-73.9550)
            loc_fast  = DriverLocation(driver_id=d_fast.id, lat=40.7350, lng=-73.9350)
            tx_session.add_all([loc_stuck, loc_fast])
            tx_session.commit()

        mock_mapbox = MagicMock(spec=MapboxClient)
        # traffic_matrix returns:
        # Candidate 0 (d_stuck): 1.0 km, 25.0 min (traffic jam)
        # Candidate 1 (d_fast): 3.2 km, 4.5 min (clear road)
        mock_mapbox.traffic_matrix.return_value = [
            [{"distance_km": 1.0, "duration_min": 25.0}],
            [{"distance_km": 3.2, "duration_min": 4.5}]
        ]

        engine = SmartMatchingEngine(mock_mapbox, config={})

        best = engine.find_best_driver(
            order_id="order_traffic_test",
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )

        assert best is not None
        # Must select d_fast due to 4.5 min ETA vs 25 min ETA!
        assert best["id"] == d_fast.id
        assert best["eta_minutes"] == 4.5
        assert best["distance_km"] == 3.2


def test_matching_engine_max_radius_cutoff(client):
    """
    Verify that drivers farther than MATCHING_MAX_RADIUS_KM are not matched.
    """
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            
            # Driver is 70 km away (far outside delivery city)
            d_far = User(
                id=f"drv_far_{uid}",
                email=f"far_{uid}@test.com", password_hash="hash",
                full_name="Driver Very Far", role="driver", phone="+999000",
                is_active=True, is_available=True, rating=5.0
            )
            tx_session.add(d_far)
            tx_session.flush()

            # Far coordinates (~70 km away)
            loc_far = DriverLocation(driver_id=d_far.id, lat=41.3500, lng=-73.9500)
            tx_session.add(loc_far)
            tx_session.commit()

        mock_mapbox = MagicMock(spec=MapboxClient)
        engine = SmartMatchingEngine(mock_mapbox, config={"MATCHING_MAX_RADIUS_KM": 15.0})

        # Pickup in Brooklyn
        best = engine.find_best_driver(
            order_id="order_radius_test",
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )

        # Must return None rather than assigning an impossible 70km driver!
        assert best is None


def test_matching_engine_gps_warning_cooldown(client):
    """
    Verify that an online driver with missing GPS receives at most 1 warning during cooldown.
    """
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            
            # Driver with no GPS location record
            d_nogps = User(
                id=f"drv_nogps_{uid}",
                email=f"nogps_{uid}@test.com", password_hash="hash",
                full_name="Driver No GPS", role="driver", phone="+888000",
                is_active=True, is_available=True, rating=5.0
            )
            tx_session.add(d_nogps)
            tx_session.commit()

        mock_mapbox = MagicMock(spec=MapboxClient)
        engine = SmartMatchingEngine(mock_mapbox, config={})

        with patch("tasks.notify.send_sms.delay") as mock_sms, \
             patch("routes.notifications.push_notification") as mock_push:

            # First match call -> triggers warning
            engine.find_best_driver("order_gps_1", {"lat": 40.7128, "lng": -73.9566})
            assert mock_sms.call_count == 1
            assert mock_push.call_count == 1

            # Second match call within cooldown -> should NOT trigger another warning
            engine.find_best_driver("order_gps_2", {"lat": 40.7128, "lng": -73.9566})
            assert mock_sms.call_count == 1
            assert mock_push.call_count == 1


def test_matching_engine_vehicle_hard_rules(client):
    """
    Verify vehicle type hard rules:
    - walker excluded if distance > 4 km or items > 10
    - bike excluded if items > 10
    """
    from database.schemas import Order
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            
            # Setup walker, bike, and car drivers
            d_walker = User(id=f"drv_w_{uid}", email=f"w_{uid}@test.com", password_hash="hash", full_name="Walker Driver", role="driver", phone="+1", is_active=True, is_available=True, rating=5.0, vehicle_type="walker")
            d_bike = User(id=f"drv_b_{uid}", email=f"b_{uid}@test.com", password_hash="hash", full_name="Bike Driver", role="driver", phone="+2", is_active=True, is_available=True, rating=5.0, vehicle_type="bike")
            d_car = User(id=f"drv_c_{uid}", email=f"c_{uid}@test.com", password_hash="hash", full_name="Car Driver", role="driver", phone="+3", is_active=True, is_available=True, rating=5.0, vehicle_type="car")
            
            # Setup customer and restaurant to satisfy foreign keys
            customer = User(id=f"cust_{uid}", email=f"cust_{uid}@test.com", password_hash="hash", full_name="Customer", role="customer", phone="+9")
            restaurant = User(id=f"rest_{uid}", email=f"rest_{uid}@test.com", password_hash="hash", full_name="Restaurant", role="restaurant", phone="+8", restaurant_name="Test Rest")
            
            tx_session.add_all([d_walker, d_bike, d_car, customer, restaurant])
            tx_session.flush()
            
            # Geolocation: 5 km away
            loc_w = DriverLocation(driver_id=d_walker.id, lat=40.7500, lng=-73.9500)
            loc_b = DriverLocation(driver_id=d_bike.id, lat=40.7500, lng=-73.9500)
            loc_c = DriverLocation(driver_id=d_car.id, lat=40.7500, lng=-73.9500)
            tx_session.add_all([loc_w, loc_b, loc_c])
            
            # Setup orders
            o_small = Order(id=f"ord_s_{uid}", customer_id=customer.id, restaurant_id=restaurant.id, status="pending", items=[{"name": "Item", "quantity": 3}], payment_method="cash", total=10.0, pickup_lat=40.7128, pickup_lng=-73.9566, pickup_address="123 Pickup St", delivery_address="456 Delivery St")
            o_large = Order(id=f"ord_l_{uid}", customer_id=customer.id, restaurant_id=restaurant.id, status="pending", items=[{"name": "Item", "quantity": 12}], payment_method="cash", total=10.0, pickup_lat=40.7128, pickup_lng=-73.9566, pickup_address="123 Pickup St", delivery_address="456 Delivery St")
            tx_session.add_all([o_small, o_large])
            tx_session.commit()

        mock_mapbox = MagicMock(spec=MapboxClient)
        # return driving distance 5.0 km
        mock_mapbox.distance_matrix.return_value = [[5.0], [5.0], [5.0]]

        engine = SmartMatchingEngine(mock_mapbox, config={})

        # Test 1: Distance > 4 km (walker should be excluded, bike or car matched)
        best_far = engine.find_best_driver(
            order_id=o_small.id,
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )
        assert best_far is not None
        assert best_far["id"] != d_walker.id  # Walker excluded due to 5km distance > 4km

        # Test 2: Large order (items > 10) (walker and bike excluded, car matched)
        best_large = engine.find_best_driver(
            order_id=o_large.id,
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )
        assert best_large is not None
        assert best_large["id"] == d_car.id  # Walker & Bike both excluded


def test_matching_engine_vehicle_preferences(client):
    """
    Verify vehicle type preference scoring:
    - walker preferred over car for < 1 km due to 2.0 km score bonus
    """
    with client.application.app_context():
        with transaction() as tx_session:
            tx_session.query(User).filter(User.role == "driver").update({"is_available": False})
            uid = str(uuid.uuid4())[:8]
            
            # Both drivers have 5.0 rating
            d_walker = User(id=f"drv_wp_{uid}", email=f"wp_{uid}@test.com", password_hash="hash", full_name="Walker Driver", role="driver", phone="+1", is_active=True, is_available=True, rating=5.0, vehicle_type="walker")
            d_car = User(id=f"drv_cp_{uid}", email=f"cp_{uid}@test.com", password_hash="hash", full_name="Car Driver", role="driver", phone="+2", is_active=True, is_available=True, rating=5.0, vehicle_type="car")
            
            tx_session.add_all([d_walker, d_car])
            tx_session.flush()
            
            # Geolocation: 0.5 km away
            loc_w = DriverLocation(driver_id=d_walker.id, lat=40.7150, lng=-73.9550)
            loc_c = DriverLocation(driver_id=d_car.id, lat=40.7150, lng=-73.9550)
            tx_session.add_all([loc_w, loc_c])
            tx_session.commit()

        mock_mapbox = MagicMock(spec=MapboxClient)
        # distance 0.5 km, duration 3.0 min for both
        mock_mapbox.traffic_matrix.return_value = [
            [{"distance_km": 0.5, "duration_min": 3.0}],
            [{"distance_km": 0.5, "duration_min": 3.0}]
        ]

        engine = SmartMatchingEngine(mock_mapbox, config={})

        best = engine.find_best_driver(
            order_id="order_pref_test",
            pickup_coords={"lat": 40.7128, "lng": -73.9566}
        )

        assert best is not None
        # Walker wins due to bonus!
        assert best["id"] == d_walker.id
