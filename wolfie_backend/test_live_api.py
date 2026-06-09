import time
import requests
import json
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(message)s")

BASE_URL = "http://localhost:5000/api/v1"

def register_user(role, email, password, full_name, additional=None):
    payload = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
    }
    if additional:
        payload.update(additional)
    
    res = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if res.status_code not in (200, 201):
        # Maybe already exists, try login
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    
    if res.status_code in (200, 201):
        data = res.json()
        token = data.get("access_token")
        user_id = data.get("user_id")
        logging.info(f"[Auth] Ready: {role} ({email})")
        return token, user_id
    else:
        logging.error(f"[Auth] Failed for {role}: {res.text}")
        return None, None

def simulate_driving(driver_token, order_id, start_coords, end_coords, duration_sec, steps=30):
    sleep_time = float(duration_sec) / float(steps)
    lat_step = (end_coords[0] - start_coords[0]) / float(steps)
    lng_step = (end_coords[1] - start_coords[1]) / float(steps)
    d_headers = {"Authorization": f"Bearer {driver_token}"}
    for i in range(steps):
        current_lat = start_coords[0] + (lat_step * i)
        current_lng = start_coords[1] + (lng_step * i)
        requests.post(f"{BASE_URL}/drivers/location", json={
            "lat": current_lat,
            "lng": current_lng,
            "order_id": order_id
        }, headers=d_headers)
        time.sleep(sleep_time)
    
    # Final coordinate sync
    requests.post(f"{BASE_URL}/drivers/location", json={
        "lat": end_coords[0],
        "lng": end_coords[1],
        "order_id": order_id
    }, headers=d_headers)

def main():
    logging.info("🐺 WOLFIE DELIVERY: LIVE PRODUCTION SIMULATION 🐺")
    logging.info("="*55)
    logging.info("Checking API Server status...")
    
    try:
        res = requests.get(f"{BASE_URL}/health")
        logging.info("✅ Backend is Online")
    except requests.exceptions.ConnectionError:
        logging.error("❌ ERROR: Backend is not running on port 5000!")
        logging.error("Please run the backend server first before testing.")
        sys.exit(1)

    # 1. Auth Actors
    customer_token, customer_id = register_user("customer", "john_sim5@wolfie.com", "password123", "John Smith", {"phone": "+15555555555"})
    restaurant_token, restaurant_id = register_user("restaurant", "pizza_sim5@wolfie.com", "password123", "Pizza Paradise", {"restaurant_name": "Pizza Paradise", "phone": "+123456789"})
    driver_token, _ = register_user("driver", "sarah_sim5@wolfie.com", "password123", "Sarah Driver", {"phone": "+987654321"})

    if not all([customer_token, restaurant_token, driver_token]):
        logging.error("❌ Failed to authenticate all actors. Exiting.")
        return

    c_headers = {"Authorization": f"Bearer {customer_token}"}
    r_headers = {"Authorization": f"Bearer {restaurant_token}"}
    d_headers = {"Authorization": f"Bearer {driver_token}"}

    # Set driver to available
    requests.patch(f"{BASE_URL}/drivers/status", json={"is_available": True}, headers=d_headers)
    
    # Coordinates in Algiers Centre (Zone base: 36.7525, 3.0588)
    driver_start_loc = [36.7600, 3.0600]
    restaurant_loc = [36.7525, 3.0588]
    customer_loc = [36.7400, 3.0700]

    # Initialize driver location at driver_start_loc
    requests.post(f"{BASE_URL}/drivers/location", json={
        "lat": driver_start_loc[0],
        "lng": driver_start_loc[1]
    }, headers=d_headers)

    logging.info(f"✅ Target Restaurant Found: ID {restaurant_id[:8]}")

    logging.info("="*55)
    logging.info("⏰ 12:34 PM - Customer Places Order")
    
    order_payload = {
        "customer_id": customer_id,
        "restaurant_id": restaurant_id,
        "items": [
            {"name": "Margherita Pizza", "price": 15.00, "quantity": 2},
            {"name": "Caesar Salad", "price": 12.00, "quantity": 1},
            {"name": "Garlic Bread", "price": 6.00, "quantity": 1}
        ],
        "pickup_address": "Pizza Paradise, Algiers Centre",
        "delivery_address": "789 5th Ave, Apt 4B",
        "payment_method": "cash",
        "distance_km": 3.2,
        "duration_min": 18
    }

    res = requests.post(f"{BASE_URL}/orders/", json=order_payload, headers=c_headers)
    if res.status_code != 201:
        logging.error(f"❌ Order creation failed: {res.text}")
        return
    
    order_data = res.json()
    order_id = order_data["order_id"]
    
    logging.info("✅ Order Created successfully!")
    logging.info(f"   Order ID: {order_id}")
    
    logging.info("\n👀 Waiting 1 min for 'searching and pending'...")
    time.sleep(60)

    logging.info("="*55)
    logging.info("⏰ 12:35 PM - Restaurant Accepts Order")
    res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "accepted"}, headers=r_headers)
    logging.info(f"✅ Restaurant Action -> {res.status_code}")

    logging.info("⏰ 12:40 PM - Restaurant starts 'Preparing' and 'Ready' (1 min total)")
    requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "preparing"}, headers=r_headers)
    time.sleep(60)
    res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "ready"}, headers=r_headers)
    logging.info(f"✅ Restaurant Action -> {res.status_code}")

    # Note: We simulate the backend automatically assigning the driver or the admin manually assigning it here.
    # In a real scenario, the driver accepts the ping.
    
    logging.info("="*55)
    logging.info("🚚 Driver driving to restaurant... (3 mins)")
    simulate_driving(driver_token, order_id, driver_start_loc, restaurant_loc, duration_sec=180, steps=36)
    
    logging.info("⏰ Driver arrives and 'Picks Up'")
    res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "picked_up", "lat": restaurant_loc[0], "lng": restaurant_loc[1]}, headers=d_headers)
    logging.info(f"✅ Driver Action -> {res.status_code}")

    logging.info("="*55)
    logging.info("⏰ Driver 'on the way'")
    requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "on_the_way"}, headers=d_headers)

    logging.info("🚚 Driver driving to customer... (3 mins)")
    simulate_driving(driver_token, order_id, restaurant_loc, customer_loc, duration_sec=180, steps=36)

    logging.info("⏰ Driver 'Delivers' the food!")
    res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "delivered", "lat": customer_loc[0], "lng": customer_loc[1], "proof_photo_url": "http://example.com/proof.jpg"}, headers=d_headers)
    logging.info(f"✅ Driver Action -> {res.status_code}")

    logging.info("="*55)
    logging.info("🎉 E2E TEST COMPLETE! ")

if __name__ == "__main__":
    main()
