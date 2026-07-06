import os
import sys
from datetime import datetime, timezone, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from database import transaction, get_db_session
from database.schemas import User, MenuItem
from database.repositories import UserRepository

def seed():
    app = create_app("development")
    with app.app_context():
        session = get_db_session()
        user_repo = UserRepository(session)

        # 0. Clean all existing tables
        tables = [
            "reviews", "payments", "driver_locations", "driver_payouts",
            "driver_decline_logs", "restaurant_order_payouts", "wap_predictions",
            "wap_feedback", "wap_model_metrics", "sync_agents", "kitchen_metrics",
            "restaurant_scores", "score_history", "support_tickets", "refund_requests",
            "fraud_flags", "support_logs", "notifications", "addresses",
            "chat_messages", "favorites", "orders", "menu_items", "users"
        ]
        print("Cleaning existing database tables...")
        for table in tables:
            try:
                session.execute(f"DELETE FROM {table}")
            except Exception as e:
                # Table might not exist or be empty, ignore
                pass
        session.commit()
        print("Database tables cleaned successfully.")

        # 1. Seed Customer
        customer = User(
            email="customer_demo@wolfie.delivery",
            password_hash=UserRepository.hash_password("password123"),
            full_name="M. Takahashi",
            phone="+1 (555) 019-2831",
            role="customer",
            is_active=True
        )
        session.add(customer)
        print("Customer customer_demo@wolfie.delivery seeded successfully!")

        # 2. Seed Restaurants
        restaurants_data = [
            {
                "email": "wendys@wolfie.delivery",
                "password": "password123",
                "full_name": "Wendy's Owner",
                "phone": "+12065552222",
                "role": "restaurant",
                "extra": {
                    "restaurant_name": "Wendy's Burger",
                    "chef_name": "Wendy Chef",
                    "chef_bio": "Famous for square patties and fresh ingredients since 1969.",
                    "chef_image": "/assets/hamburger_1.png",
                    "story": "Wendy's is known for square hamburger patties made from fresh, never-frozen beef.",
                    "bio": "Fresh beef square burgers, crispy chicken, and frostys in NYC.",
                    "hero_image": "/assets/restaurant_cover_wendys.png",
                    "logo_image": "/assets/restaurant_logo_wendys.png",
                    "address": "El Port, El Kala",
                    "latitude": 36.8990,
                    "longitude": 8.4410,
                    "category": "Burgers",
                    "price_level": "$$",
                    "delivery_time_min": 26,
                    "delivery_fee": 0.99
                }
            },
            {
                "email": "mcdonalds@wolfie.delivery",
                "password": "password123",
                "full_name": "McDonald's Owner",
                "phone": "+12065553333",
                "role": "restaurant",
                "extra": {
                    "restaurant_name": "McDonald's",
                    "chef_name": "McChef",
                    "chef_bio": "World-famous golden fries and classic burgers.",
                    "chef_image": "/assets/hamburger_2.png",
                    "story": "The classic American fast-food chain delivering standard global favorites.",
                    "bio": "Legendary Big Macs, McChickens, and crispy golden fries.",
                    "hero_image": "/assets/restaurant_cover_mcdonalds.png",
                    "logo_image": "/assets/restaurant_logo_mcdonalds.png",
                    "address": "El Kala East",
                    "latitude": 36.8970,
                    "longitude": 8.4450,
                    "category": "Fries",
                    "price_level": "$",
                    "delivery_time_min": 18,
                    "delivery_fee": 1.99
                }
            },
            {
                "email": "shakeshack@wolfie.delivery",
                "password": "password123",
                "full_name": "Shake Shack Owner",
                "phone": "+12065554444",
                "role": "restaurant",
                "extra": {
                    "restaurant_name": "Shake Shack",
                    "chef_name": "Danny Meyer",
                    "chef_bio": "Gourmet burgers and flat-top dogs started in Madison Square Park.",
                    "chef_image": "/assets/hamburger_3.png",
                    "story": "A modern day roadside burger stand serving delicious Angus beef burgers.",
                    "bio": "Premium 100% all-natural Angus beef burgers, crinkle fries, and shakes.",
                    "hero_image": "/assets/restaurant_cover_shakeshack.png",
                    "logo_image": "/assets/restaurant_logo_shakeshack.png",
                    "address": "El Kala Beach Side",
                    "latitude": 36.8960,
                    "longitude": 8.4380,
                    "category": "Premium",
                    "price_level": "$$$",
                    "delivery_time_min": 15,
                    "delivery_fee": 2.99
                }
            }
        ]

        restaurants = {}
        for rdata in restaurants_data:
            r = User(
                email=rdata["email"],
                password_hash=UserRepository.hash_password(rdata["password"]),
                full_name=rdata["full_name"],
                phone=rdata["phone"],
                role=rdata["role"],
                is_active=True,
                is_open=True,
                restaurant_name=rdata["extra"]["restaurant_name"],
                commission_rate=0.18,
                chef_name=rdata["extra"]["chef_name"],
                chef_bio=rdata["extra"]["chef_bio"],
                chef_image=rdata["extra"]["chef_image"],
                story=rdata["extra"]["story"],
                bio=rdata["extra"]["bio"],
                hero_image=rdata["extra"]["hero_image"],
                logo_image=rdata["extra"]["logo_image"],
                address=rdata["extra"]["address"],
                latitude=rdata["extra"]["latitude"],
                longitude=rdata["extra"]["longitude"],
                category=rdata["extra"]["category"],
                price_level=rdata["extra"]["price_level"],
                delivery_time_min=rdata["extra"]["delivery_time_min"],
                delivery_fee=rdata["extra"]["delivery_fee"]
            )
            session.add(r)
            session.commit()
            print(f"Restaurant {rdata['extra']['restaurant_name']} seeded successfully!")
            restaurants[r.restaurant_name] = r

        # 3. Seed Menu Items
        # Wendy's Items
        wendy_items = [
            {"name": "Classic Burger", "price": 8.24, "category": "Burgers", "description": "Our signature beef patty with lettuce, tomato, cheese and special sauce.", "image_url": "/assets/hamburger_1.png"},
            {"name": "Veggie Deluxe Burger", "price": 7.49, "category": "Burgers", "description": "Delicious plant-based patty with fresh vegetables, cheese, and pickles.", "image_url": "/assets/hamburger_2.png"},
            {"name": "Spicy Crispy Chicken", "price": 8.49, "category": "Burgers", "description": "Crispy fried chicken breast, spicy seasoning, lettuce and mayo.", "image_url": "/assets/hamburger_3.png"},
            {"name": "Double Stack Burger", "price": 9.99, "category": "Burgers", "description": "Double beef patties, double cheese, and fresh pickles on a toasted bun.", "image_url": "/assets/hamburger_4.png"},
            {"name": "Chicken Nuggets (6 pcs)", "price": 5.49, "category": "Chicken", "description": "Tender all-white meat chicken nuggets fried to a perfect golden crisp.", "image_url": "/assets/hamburger_details.png"}
        ]
        
        # McDonald's Items
        mcd_items = [
            {"name": "Big Mac", "price": 5.99, "category": "Burgers", "description": "Two 100% beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame seed bun.", "image_url": "/assets/hamburger_1.png"},
            {"name": "McChicken", "price": 4.49, "category": "Chicken", "description": "Crispy chicken patty with mayonnaise and shredded lettuce on a toasted bun.", "image_url": "/assets/hamburger_3.png"},
            {"name": "World Famous Fries", "price": 3.49, "category": "Sides", "description": "Golden, crispy French fries salted to absolute perfection.", "image_url": "/assets/hamburger_details.png"},
            {"name": "Filet-O-Fish", "price": 5.29, "category": "Burgers", "description": "Fish patty, tartar sauce, and half slice of cheese on a steamed bun.", "image_url": "/assets/hamburger_2.png"}
        ]

        # Shake Shack Items
        shack_items = [
            {"name": "ShackBurger", "price": 8.99, "category": "Burgers", "description": "Cheeseburger with lettuce, tomato, and ShackSauce on a toasted potato bun.", "image_url": "/assets/hamburger_4.png"},
            {"name": "SmokeShack", "price": 9.99, "category": "Burgers", "description": "Cheeseburger with Applewood-smoked bacon, chopped cherry pepper, ShackSauce.", "image_url": "/assets/hamburger_3.png"},
            {"name": "Cheese Fries", "price": 4.99, "category": "Sides", "description": "Crinkle-cut fries topped with Shake Shack's special cheese sauce.", "image_url": "/assets/hamburger_details.png"},
            {"name": "Black & White Shake", "price": 6.49, "category": "Drinks", "description": "Rich frozen custard hand-spun with fudge sauce and vanilla.", "image_url": "/assets/hamburger_1.png"}
        ]

        menu_mappings = [
            ("Wendy's Burger", wendy_items),
            ("McDonald's", mcd_items),
            ("Shake Shack", shack_items)
        ]

        for rest_name, items in menu_mappings:
            rest_user = restaurants[rest_name]
            for item_data in items:
                menu_item = MenuItem(
                    restaurant_id=rest_user.id,
                    name=item_data["name"],
                    price=item_data["price"],
                    category=item_data["category"],
                    description=item_data["description"],
                    image_url=item_data["image_url"],
                    is_available=True
                )
                session.add(menu_item)
            print(f"Seeded {len(items)} menu items for {rest_name}!")
        session.commit()

        # 4. Seed Driver
        driver = User(
            email="driver_demo@wolfie.delivery",
            password_hash=UserRepository.hash_password("password123"),
            full_name="Kenji Sato",
            phone="+1 (555) 019-4444",
            role="driver",
            is_active=True,
            is_available=True,
            kyc_status="approved"
        )
        session.add(driver)
        print("Driver driver_demo@wolfie.delivery seeded successfully!")

        # 5. Seed Admin
        admin = User(
            email="admin@wolfie.com",
            password_hash=UserRepository.hash_password("Wolfie@Admin2024!"),
            full_name="Wolfie Admin",
            phone="+1 (555) 019-9999",
            role="admin",
            is_active=True,
            admin_type="super_admin"
        )
        session.add(admin)
        print("Admin admin@wolfie.com seeded successfully!")

        session.commit()
        print("Seeding process completed!")

if __name__ == "__main__":
    seed()
