"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — seed_order.py                          ║
║     Seeds a mock active order inside wolfie_dev.db           ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import sys
from datetime import datetime, timezone
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from database import transaction, get_db_session
from database.schemas import User, Order, Address
from database.repositories import OrderRepository

def create_fake_order():
    app = create_app("development")
    with app.app_context():
        session = get_db_session()
        
        # 1. Look for existing users or create them
        customer = session.query(User).filter(User.role == "customer").first()
        if not customer:
            customer = User(
                email="customer_demo@wolfie.delivery",
                password_hash="pbkdf2:sha256:260000$mock$mock",
                full_name="Alice Customer",
                phone="+12065551111",
                role="customer",
                is_active=True
            )
            session.add(customer)
            session.flush()
            
        restaurant = session.query(User).filter(User.role == "restaurant").first()
        if not restaurant:
            restaurant = User(
                email="restaurant_demo@wolfie.delivery",
                password_hash="pbkdf2:sha256:260000$mock$mock",
                full_name="Wolfie Diner",
                restaurant_name="Wolfie Diner",
                phone="+12065552222",
                role="restaurant",
                is_open=True,
                is_active=True,
                commission_rate=0.15
            )
            session.add(restaurant)
            session.flush()

        driver = session.query(User).filter(User.role == "driver").first()
        if not driver:
            driver = User(
                email="driver_demo@wolfie.delivery",
                password_hash="pbkdf2:sha256:260000$mock$mock",
                full_name="Alex Rider",
                phone="+15555555555",
                role="driver",
                is_available=True,
                is_active=True,
                kyc_status="approved"
            )
            session.add(driver)
            session.flush()
            
        session.commit()

        # 2. Create Order
        items = [
            {"name": "Alpha Wolf Burger", "price": 14.99, "quantity": 1},
            {"name": "Truffle Fries", "price": 5.50, "quantity": 1}
        ]
        pricing = {
            "subtotal": 20.49,
            "delivery_fee": 4.50,
            "service_fee": 3.49,
            "driver_payout": 5.80,
            "restaurant_commission": 3.07,
            "total": 28.48
        }
        route_info = {
            "distance_km": 2.5,
            "duration_min": 15,
            "pickup_coords": {"lat": 40.7176, "lng": -73.9575},
            "delivery_coords": {"lat": 40.7250, "lng": -73.9600}
        }

        with transaction() as tx_session:
            order_repo = OrderRepository(tx_session)
            order = order_repo.create(
                customer_id=customer.id,
                restaurant_id=restaurant.id,
                items=items,
                pickup_address="178 Bedford Ave (Wolfie Diner)",
                delivery_address="144 N 8th St, Apt 3B",
                payment_method="card",
                pricing=pricing,
                route_info=route_info
            )
            order_id = order.id
            
            # Automatically assign to our driver for testing
            order_repo.assign_driver(order, driver.id)
            
        print(f"[OK] Successfully seeded fake Order in development database!")
        print(f"   Order ID: {order_id}")
        print(f"   Customer: {customer.full_name} (ID: {customer.id})")
        print(f"   Restaurant: {restaurant.restaurant_name} (ID: {restaurant.id})")
        print(f"   Assigned Driver: {driver.full_name} (ID: {driver.id})")

if __name__ == "__main__":
    create_fake_order()
