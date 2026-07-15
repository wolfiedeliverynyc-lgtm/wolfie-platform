import os
import sys
from datetime import datetime, timezone

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

        # 1. Seed Customer
        customer = user_repo.find_by_email("customer_demo@wolfie.delivery")
        if not customer:
            customer = user_repo.create(
                email="customer_demo@wolfie.delivery",
                password="password123",
                full_name="M. Takahashi",
                phone="+1 (555) 019-2831",
                role="customer"
            )
            print("Customer Takahashi seeded successfully!")
        else:
            print("Customer Takahashi already exists.")

        # 2. Seed Restaurants
        # We want to match restaurantsList from the frontend:
        # rest_wendys, rest_mcdonalds, rest_shakeshack
        
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
            r = user_repo.find_by_email(rdata["email"])
            if not r:
                r = user_repo.create(
                    email=rdata["email"],
                    password=rdata["password"],
                    full_name=rdata["full_name"],
                    phone=rdata["phone"],
                    role=rdata["role"],
                    extra=rdata["extra"]
                )
                # Ensure is_open is True
                r.is_open = True
                session.commit()
                print(f"Restaurant {rdata['extra']['restaurant_name']} seeded successfully!")
            else:
                # Update properties just in case
                r.is_open = True
                for k, v in rdata["extra"].items():
                    setattr(r, k, v)
                session.commit()
                print(f"Restaurant {rdata['extra']['restaurant_name']} already exists, updated properties.")
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

        with transaction() as tx_session:
            for rest_name, items in menu_mappings:
                rest_user = restaurants[rest_name]
                # Clear existing menu items for the restaurant to avoid duplicates on re-run
                tx_session.query(MenuItem).filter_by(restaurant_id=rest_user.id).delete()
                
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
                    tx_session.add(menu_item)
                print(f"Seeded {len(items)} menu items for {rest_name}!")

        # 4. Seed Driver
        driver = user_repo.find_by_email("driver_demo@wolfie.delivery")
        if not driver:
            driver = user_repo.create(
                email="driver_demo@wolfie.delivery",
                password="password123",
                full_name="Kenji Sato",
                phone="+1 (555) 019-4444",
                role="driver",
                extra={
                    "is_available": True,
                    "kyc_status": "approved"
                }
            )
            print("Driver Kenji Sato seeded successfully!")
        else:
            print("Driver Kenji Sato already exists.")

        print("Seeding process completed!")

if __name__ == "__main__":
    seed()
