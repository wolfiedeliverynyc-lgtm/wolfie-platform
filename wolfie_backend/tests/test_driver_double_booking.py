import pytest
from database import get_db_session, transaction
from database.schemas import User, Order
from database.repositories import UserRepository, OrderRepository
import uuid

def test_driver_double_booking(client):
    with client.application.app_context():
        with transaction() as tx_session:
            uid = str(uuid.uuid4())[:8]
            
            # Setup Users
            customer = User(email=f"c_{uid}@test.com", password_hash="hash", full_name="Cust", role="customer", phone="+1234567890", is_active=True)
            driver = User(
                email=f"d_{uid}@test.com",
                password_hash="hash",
                full_name="Driver",
                role="driver",
                phone="+1234567890",
                is_active=True,
                is_available=True
            )
            restaurant = User(email=f"r_{uid}@test.com", password_hash="hash", full_name="Rest", role="restaurant", phone="+1234567890", is_active=True)
            
            tx_session.add_all([customer, driver, restaurant])
            tx_session.flush()
            
            c_id = customer.id
            d_id = driver.id
            r_id = restaurant.id
            
            user_repo = UserRepository(tx_session)
            order_repo = OrderRepository(tx_session)
            
            # Initially, driver D should be available
            available = user_repo.find_available_drivers()
            assert any(d.id == d_id for d in available)
            
            # Create an order with driver D in status 'on_the_way'
            order = order_repo.create(
                customer_id=c_id, restaurant_id=r_id, items=[{"name": "Burger", "price": 15, "quantity": 1}],
                pickup_address="123 Street", delivery_address="456 Ave", payment_method="cash",
                pricing={"total": 15}, route_info={}
            )
            order_repo.assign_driver(order, d_id)
            order_repo.transition(order, "accepted", actor_role="admin", actor_id="admin", force=True)
            order_repo.transition(order, "preparing", actor_role="admin", actor_id="admin", force=True)
            order_repo.transition(order, "ready", actor_role="admin", actor_id="admin", force=True)
            order_repo.transition(order, "picked_up", actor_role="admin", actor_id="admin", force=True)
            order_repo.transition(order, "on_the_way", actor_role="admin", actor_id="admin", force=True)
            tx_session.flush()
            
            # Now, driver D must NOT appear in results of find_available_drivers()
            available = user_repo.find_available_drivers()
            assert not any(d.id == d_id for d in available)
            
            # Mark that order 'delivered'
            order_repo.transition(order, "delivered", actor_role="admin", actor_id="admin", force=True)
            tx_session.flush()
            
            # Now, driver D must reappear as available
            available = user_repo.find_available_drivers()
            assert any(d.id == d_id for d in available)
            
            # Test other active statuses block booking too:
            # Statuses: "assigned", "accepted", "preparing", "ready", "picked_up", "on_the_way"
            for status in ["assigned", "accepted", "preparing", "ready", "picked_up", "on_the_way"]:
                order2 = order_repo.create(
                    customer_id=c_id, restaurant_id=r_id, items=[{"name": "Soda", "price": 3, "quantity": 1}],
                    pickup_address="123 Street", delivery_address="456 Ave", payment_method="cash",
                    pricing={"total": 3}, route_info={}
                )
                order_repo.assign_driver(order2, d_id)
                if status != "assigned":
                    # Transition to desired status
                    # We start at assigned (since assign_driver transitions to assigned)
                    current_status = "assigned"
                    target_status_path = ["accepted", "preparing", "ready", "picked_up", "on_the_way"]
                    for step in target_status_path:
                        if current_status == status:
                            break
                        order_repo.transition(order2, step, actor_role="admin", actor_id="admin", force=True)
                        current_status = step
                
                tx_session.flush()
                
                # Check that driver is not available
                available = user_repo.find_available_drivers()
                assert not any(d.id == d_id for d in available), f"Driver should be busy when order status is {status}"
                
                # Cancel the order to free driver again
                order_repo.transition(order2, "cancelled", actor_role="admin", actor_id="admin", force=True)
                tx_session.flush()
                
                # Driver should be available again
                available = user_repo.find_available_drivers()
                assert any(d.id == d_id for d in available)
