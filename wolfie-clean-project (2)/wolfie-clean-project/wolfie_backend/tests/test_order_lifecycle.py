import pytest
from dotenv import load_dotenv
load_dotenv()
from database import get_db_session, transaction
from database.schemas import User, Order, Address, Favorite, ChatMessage
from database.repositories import OrderRepository, UserRepository

def test_order_creation_and_lifecycle(client):
    with client.application.app_context():
        from database.session import get_db_session
        session = get_db_session()

        # 1. Seed customer, restaurant, and driver
        import uuid
        uid = str(uuid.uuid4())[:8]
        with transaction() as tx_session:
            # Create customer
            customer = User(
                email=f"cust_test_{uid}@wolfie.delivery",
                password_hash="pbkdf2:sha256:...",
                full_name="Alice Customer",
                phone="+1234567890",
                role="customer",
                is_active=True
            )
            # Create restaurant
            restaurant = User(
                email=f"rest_test_{uid}@wolfie.delivery",
                password_hash="pbkdf2:sha256:...",
                full_name="Wolfie Diner",
                restaurant_name="Wolfie Diner",
                phone="+1987654321",
                role="restaurant",
                is_open=True,
                is_active=True,
                commission_rate=0.15
            )
            # Create driver
            driver = User(
                email=f"driver_test_{uid}@wolfie.delivery",
                password_hash="pbkdf2:sha256:...",
                full_name="Bob Rider",
                phone="+1555555555",
                role="driver",
                is_available=True,
                is_active=True,
                kyc_status="approved"
            )
            tx_session.add_all([customer, restaurant, driver])
            tx_session.flush()

            customer_id = customer.id
            restaurant_id = restaurant.id
            driver_id = driver.id

        # 2. Add Saved Address for Customer
        with transaction() as tx_session:
            addr = Address(
                user_id=customer_id,
                street="123 Alpha St",
                city="Brooklyn",
                label="Home",
                is_default=True
            )
            tx_session.add(addr)

        # Verify address exists in DB
        addresses = session.query(Address).filter(Address.user_id == customer_id).all()
        assert len(addresses) == 1
        assert addresses[0].street == "123 Alpha St"

        # 3. Create Order
        items = [{"name": "Burger", "price": 10.0, "quantity": 2}]
        pricing = {
            "subtotal": 20.0,
            "delivery_fee": 3.99,
            "service_fee": 1.99,
            "driver_payout": 4.50,
            "restaurant_commission": 3.00,
            "total": 25.98
        }
        route_info = {"distance_km": 1.5, "duration_min": 12}

        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.create(
                customer_id=customer_id,
                restaurant_id=restaurant_id,
                items=items,
                pickup_address="456 Diner Rd",
                delivery_address="123 Alpha St",
                payment_method="card",
                pricing=pricing,
                route_info=route_info
            )
            order_id = order.id

        # Verify order is created as pending
        order = session.query(Order).filter(Order.id == order_id).first()
        assert order is not None
        assert order.status == "pending"
        assert len(order.items) == 1

        # 4. Assign Driver (Transition to Assigned)
        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.get(order_id)
            order_repo.assign_driver(order, driver_id)

        order = session.query(Order).filter(Order.id == order_id).first()
        assert order.status == "assigned"
        assert order.driver_id == driver_id

        # 5. Restaurant Accepts Order (Transition to Accepted)
        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.get(order_id)
            order_repo.transition(order, "accepted", actor_role="restaurant", actor_id=restaurant_id)

        order = session.query(Order).filter(Order.id == order_id).first()
        assert order.status == "accepted"

        # 6. Restaurant Starts Preparing (Transition to Preparing)
        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.get(order_id)
            order_repo.transition(order, "preparing", actor_role="restaurant", actor_id=restaurant_id)

        order = session.query(Order).filter(Order.id == order_id).first()
        assert order.status == "preparing"

        # 7. Restaurant Marks Ready (Transition to Ready)
        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.get(order_id)
            order_repo.transition(order, "ready", actor_role="restaurant", actor_id=restaurant_id)

        order = session.query(Order).filter(Order.id == order_id).first()
        assert order.status == "ready"

        # 8. Driver Picks Up (Transition to Picked Up)
        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.get(order_id)
            order_repo.transition(order, "picked_up", actor_role="driver", actor_id=driver_id)

        order = session.query(Order).filter(Order.id == order_id).first()
        assert order.status == "picked_up"

        # 8b. Driver Starts Transit (Transition to On The Way)
        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.get(order_id)
            order_repo.transition(order, "on_the_way", actor_role="driver", actor_id=driver_id)

        order = session.query(Order).filter(Order.id == order_id).first()
        assert order.status == "on_the_way"

        # 9. Driver Delivers (Transition to Delivered)
        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.get(order_id)
            order_repo.transition(order, "delivered", actor_role="driver", actor_id=driver_id)

        order = session.query(Order).filter(Order.id == order_id).first()
        assert order.status == "delivered"

        # 10. Favorites functionality check
        with transaction() as tx_session:
            fav = Favorite(user_id=customer_id, restaurant_id=restaurant_id)
            tx_session.add(fav)

        favs = session.query(Favorite).filter(Favorite.user_id == customer_id).all()
        assert len(favs) == 1
        assert favs[0].restaurant_id == restaurant_id
