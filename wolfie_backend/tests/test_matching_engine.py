import pytest
from unittest.mock import MagicMock
from database import transaction
from database.schemas import User, DriverLocation
from services.matching import SmartMatchingEngine
from services.mapbox import MapboxClient
import uuid

def test_matching_engine_success(client):
    # Setup drivers in database
    with client.application.app_context():
        with transaction() as tx_session:
            uid = str(uuid.uuid4())[:8]
            
            # Create three available drivers
            d1 = User(email=f"d1_{uid}@test.com", password_hash="hash", full_name="Driver One", role="driver", phone="+111", is_active=True, is_available=True, rating=4.8)
            d2 = User(email=f"d2_{uid}@test.com", password_hash="hash", full_name="Driver Two", role="driver", phone="+222", is_active=True, is_available=True, rating=4.5)
            d3 = User(email=f"d3_{uid}@test.com", password_hash="hash", full_name="Driver Three", role="driver", phone="+333", is_active=True, is_available=True, rating=5.0)
            
            tx_session.add_all([d1, d2, d3])
            tx_session.flush()
            
            # Setup their locations
            # Let's say:
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
        # Let's return driving distances for [d2, d1, d3]:
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
        # Let's check scoring:
        # score = dist_km - rating * 0.3
        # score(d2) = 0.8 - 4.5 * 0.3 = 0.8 - 1.35 = -0.55
        # score(d1) = 1.2 - 4.8 * 0.3 = 1.2 - 1.44 = -0.24
        # score(d3) = 2.5 - 5.0 * 0.3 = 2.5 - 1.5 = 1.0
        # d2 has the lowest score, so d2 should be matched!
        assert best["id"] == d2.id
        assert best["distance_km"] == 0.8
        
        # Verify Mapbox Matrix API was called with the correct sorted order of candidates (d2 first, then d1, then d3)
        mock_mapbox.distance_matrix.assert_called_once()
        sources_arg = mock_mapbox.distance_matrix.call_args[0][0]
        assert len(sources_arg) == 3
        # Check that d2 (lat=40.7100) is first, d1 (lat=40.7028) is second, d3 (lat=40.6900) is third
        assert sources_arg[0]["lat"] == 40.7100
        assert sources_arg[1]["lat"] == 40.7028
        assert sources_arg[2]["lat"] == 40.6900


def test_matching_engine_mapbox_failure(client):
    with client.application.app_context():
        # Mock Mapbox client that raises error
        mock_mapbox = MagicMock(spec=MapboxClient)
        mock_mapbox.distance_matrix.side_effect = Exception("Mapbox API Timeout")

        engine = SmartMatchingEngine(mock_mapbox, config={})
        
        # The exception must propagate out and NOT be swallowed
        with pytest.raises(Exception, match="Mapbox API Timeout"):
            engine.find_best_driver(
                order_id="order_456",
                pickup_coords={"lat": 40.7128, "lng": -73.9566}
            )


def test_matching_engine_mapbox_mock_mode(client):
    with client.application.app_context():
        # Setup Mapbox client with empty token (mock mode active)
        mapbox_client = MapboxClient(token="")
        engine = SmartMatchingEngine(mapbox_client, config={})
        
        # The ValueError must propagate out and NOT be swallowed
        with pytest.raises(ValueError, match="Mapbox token is not configured"):
            engine.find_best_driver(
                order_id="order_789",
                pickup_coords={"lat": 40.7128, "lng": -73.9566}
            )
