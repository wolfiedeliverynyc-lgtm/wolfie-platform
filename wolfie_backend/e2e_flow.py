import os
import sys
import time
import requests
import uuid

BASE_URL = 'http://127.0.0.1:5000/api/v1'

def run_e2e():
    print("# Wolfie E2E Workflow Test Report\n")
    try:
        # Step 1: Customer Creates Order
        print("## Step 1: Account Creation & Order Placement")
        # Create Customer
        cust_email = f"customer_{uuid.uuid4().hex[:6]}@test.com"
        res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": cust_email, "password": "password123", "full_name": "Test Cust", "phone": "1234567890", "role": "customer"
        })
        print(f"Cust Register Response: {res.text}")
        cust_token = res.json().get("access_token")
        cust_id = res.json().get("user_id")
        
        # Login as Admin
        res = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@wolfie.com", "password": "Wolfie@Admin2024!"
        })
        if not res.ok: raise Exception(f"Admin login failed: {res.text}")
        rest_token = res.json().get("access_token")
        
        # Fetch an existing Restaurant
        res = requests.get(f"{BASE_URL}/restaurants/", headers={"Authorization": f"Bearer {cust_token}"})
        restaurants = res.json().get("restaurants", [])
        if not restaurants:
            raise Exception("No restaurants found in database to place order against.")
        restaurant_id = restaurants[0]["id"]
        print(f"- Fetched existing restaurant: {restaurants[0]['restaurant_name']} (ID: {restaurant_id})")
        
        # Create Driver
        driver_email = f"driver_{uuid.uuid4().hex[:6]}@test.com"
        res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": driver_email, "password": "password123", "full_name": "Test Driver", "phone": "1234567892", "role": "driver"
        })
        driver_token = res.json().get("access_token")
        driver_id = res.json().get("user_id")
        
        # Customer places order
        order_payload = {
            "customer_id": cust_id,
            "restaurant_id": restaurant_id,
            "items": [{"id": "item1", "name": "Burger", "price": 10.0, "quantity": 2}],
            "pickup_address": "123 Test St",
            "delivery_address": "456 Home St",
            "payment_method": "cash"
        }
        res = requests.post(f"{BASE_URL}/orders/", json=order_payload, headers={"Authorization": f"Bearer {cust_token}"})
        if not res.ok: raise Exception(f"Order creation failed: {res.text}")
        order_id = res.json().get("order_id")
        print(f"- Customer `{cust_email}` successfully placed order `{order_id}`")
        
        # Step 2: WAP Dispatches (Admin assigns driver)
        print("\n## Step 2: WAP Dispatches")
        res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "assigned", "driver_id": driver_id}, headers={"Authorization": f"Bearer {rest_token}"})
        if not res.ok: raise Exception(f"Failed to assign driver: {res.text}")
        print(f"- Admin assigned order to driver `{driver_id}`.")
        
        # Step 3: Driver Accepts
        print("\n## Step 3: Driver Accepts")
        # Driver goes online
        requests.patch(f"{BASE_URL}/drivers/status", json={"status": "online"}, headers={"Authorization": f"Bearer {driver_token}"})
        # Driver accepts order
        res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "accepted", "lat": 40.7, "lng": -74.0}, headers={"Authorization": f"Bearer {driver_token}"})
        if not res.ok: raise Exception(f"Driver accept failed: {res.text}")
        print("- Driver accepted the order.")
        
        # Step 4: Restaurant Prepares & Marks Ready
        print("\n## Step 4: Restaurant Prepares & Marks Ready")
        res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "preparing"}, headers={"Authorization": f"Bearer {rest_token}"})
        if not res.ok: raise Exception(f"Failed to set preparing: {res.text}")
        res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "ready"}, headers={"Authorization": f"Bearer {rest_token}"})
        if not res.ok: raise Exception(f"Failed to set ready: {res.text}")
        print("- Admin updated status to `ready`. Order is now waiting for driver pickup.")
        
        # Fetch order to get exact route_info coords
        res = requests.get(f"{BASE_URL}/orders/{order_id}", headers={"Authorization": f"Bearer {cust_token}"})
        if not res.ok: raise Exception(f"Failed to fetch order: {res.text}")
        route_info = res.json().get("order", {}).get("route_info", {})
        pickup_lat = route_info.get("pickup_coords", {}).get("lat", 40.7)
        pickup_lng = route_info.get("pickup_coords", {}).get("lng", -74.0)
        delivery_lat = route_info.get("delivery_coords", {}).get("lat", 40.7)
        delivery_lng = route_info.get("delivery_coords", {}).get("lng", -74.0)
        
        # Driver picks up order
        print("\n## Step 5: GPS Updates")
        res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "picked_up", "lat": pickup_lat, "lng": pickup_lng}, headers={"Authorization": f"Bearer {driver_token}"})
        if not res.ok: raise Exception(f"Driver pick up failed: {res.text}")
        print("- Driver picked up the order.")
        print(f"- GPS Updated: {pickup_lat}, {pickup_lng}")
        
        # Step 6: Customer Tracking Updates
        print("\n## Step 6: Customer Tracking Updates")
        res = requests.get(f"{BASE_URL}/orders/{order_id}", headers={"Authorization": f"Bearer {cust_token}"})
        status = res.json().get("status")
        print(f"- Customer fetched order details. Current status: `{status}`.")
        
        # Step 6.5: On the way
        print("\n## Step 6.5: Driver On The Way")
        res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "on_the_way", "lat": 40.7, "lng": -74.0}, headers={"Authorization": f"Bearer {driver_token}"})
        if not res.ok: raise Exception(f"Driver on_the_way failed: {res.text}")
        print("- Driver marked order as `on_the_way`.")
        
        # Step 7: Delivery Completed
        print("\n## Step 7: Delivery Completed")
        res = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "delivered", "lat": delivery_lat, "lng": delivery_lng, "proof_photo_url": "http://localhost:5000/uploads/dummy.jpg"}, headers={"Authorization": f"Bearer {driver_token}"})
        if not res.ok: raise Exception(f"Driver delivered failed: {res.text}")
        print("- Driver marked order as `delivered`.")
        
        # Driver confirms cash payment
        res = requests.post(f"{BASE_URL}/payments/confirm-cash", json={"order_id": order_id}, headers={"Authorization": f"Bearer {driver_token}"})
        if not res.ok: raise Exception(f"Driver cash confirmation failed: {res.text}")
        print("- Driver confirmed cash payment.")
        
        # Step 7: Driver Earnings Updated
        print("\n## Step 7: Driver Earnings Updated")
        res = requests.get(f"{BASE_URL}/payments/driver/earnings", headers={"Authorization": f"Bearer {driver_token}"})
        if not res.ok: raise Exception(f"Failed to fetch earnings: {res.text}")
        earnings = res.json()
        print(f"- Driver earnings fetched. Total paid: ${earnings.get('total_paid')}, Pending payout: ${earnings.get('pending_payout')}")
        
        print("\nAll E2E workflow tests completed successfully!")

    except Exception as e:
        print(f"\nTEST FAILED: {str(e)}")

if __name__ == '__main__':
    run_e2e()
