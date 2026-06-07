import pytest
from database import get_db_session, transaction
from database.schemas import User, Order
from database.repositories import OrderRepository, UserRepository
import uuid

def test_order_repository_queries(client):
    with client.application.app_context():
        with transaction() as tx_session:
            uid = str(uuid.uuid4())[:8]
            
            # Setup Users
            customer = User(email=f"c_{uid}@test.com", password_hash="hash", full_name="Cust", role="customer", phone="+1234567890", is_active=True)
            driver = User(email=f"d_{uid}@test.com", password_hash="hash", full_name="Driver", role="driver", phone="+1234567890", is_active=True)
            restaurant = User(email=f"r_{uid}@test.com", password_hash="hash", full_name="Rest", role="restaurant", phone="+1234567890", is_active=True)
            
            tx_session.add_all([customer, driver, restaurant])
            tx_session.flush()
            
            c_id = customer.id
            d_id = driver.id
            r_id = restaurant.id
            
            # Setup Orders
            repo = OrderRepository(tx_session)
            
            o1 = repo.create(
                customer_id=c_id, restaurant_id=r_id, items=[{"name": "Item 1", "price": 10, "quantity": 1}],
                pickup_address="123", delivery_address="456", payment_method="cash",
                pricing={"total": 10}, route_info={}
            )
            
            o2 = repo.create(
                customer_id=c_id, restaurant_id=r_id, items=[{"name": "Item 2", "price": 20, "quantity": 1}],
                pickup_address="123", delivery_address="456", payment_method="card",
                pricing={"total": 20}, route_info={}
            )
            
            o1_id = o1.id
            o2_id = o2.id
            
            repo.assign_driver(o1, d_id)
            repo.transition(o1, "delivered", actor_role="admin", actor_id="admin", force=True)
            
            repo.assign_driver(o2, d_id)
            repo.transition(o2, "accepted", actor_role="admin", actor_id="admin", force=True)
            
            tx_session.commit()
            
        with get_db_session() as session:
            repo = OrderRepository(session)
            
            # test find_by_customer
            cust_orders = repo.find_by_customer(c_id)
            assert len(cust_orders) == 2
            
            # test find_by_driver
            driver_orders_delivered = repo.find_by_driver(d_id, status="delivered")
            assert len(driver_orders_delivered) == 1
            assert driver_orders_delivered[0].id == o1_id
            
            # test find_active_for_driver
            active_order = repo.find_active_for_driver(d_id)
            assert active_order is not None
            assert active_order.id == o2_id
            
            # test get_or_404
            found_o1 = repo.get_or_404(o1_id)
            assert found_o1.id == o1_id
