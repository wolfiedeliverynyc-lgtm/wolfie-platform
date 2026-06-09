"""Quick test: simulate Sara driving across the map to verify real-time GPS on admin dashboard."""
import time, requests, sys, logging

logging.basicConfig(level=logging.INFO, format="%(message)s")
BASE = "http://localhost:5000/api/v1"

def auth(email, password):
    res = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    if res.status_code in (200, 201):
        d = res.json()
        return d.get("access_token"), d.get("user_id")
    return None, None

def main():
    logging.info("🐺 Quick Driver Movement Test")
    
    # Login as Sarah Driver (already registered from previous test)
    driver_token, driver_id = auth("sarah_sim5@wolfie.com", "password123")
    if not driver_token:
        # Try registering
        res = requests.post(f"{BASE}/auth/register", json={
            "email": "sarah_sim5@wolfie.com", "password": "password123",
            "full_name": "Sarah Driver", "role": "driver", "phone": "+987654321"
        })
        if res.status_code in (200, 201):
            d = res.json()
            driver_token = d.get("access_token")
            driver_id = d.get("user_id")
    
    if not driver_token:
        logging.error("❌ Can't auth as Sarah Driver")
        sys.exit(1)
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    
    # Set driver available
    requests.patch(f"{BASE}/drivers/status", json={"is_available": True}, headers=headers)
    
    # Simulate driving across Algiers (36.76, 3.05) -> (36.74, 3.07) over 30 seconds
    start = [36.7600, 3.0500]
    end = [36.7400, 3.0700]
    steps = 30
    duration = 30  # seconds
    
    logging.info(f"🚚 Moving Sarah from {start} to {end} over {duration}s ({steps} GPS pings)")
    
    for i in range(steps + 1):
        t = i / steps
        lat = start[0] + (end[0] - start[0]) * t
        lng = start[1] + (end[1] - start[1]) * t
        
        res = requests.post(f"{BASE}/drivers/location", json={
            "lat": lat, "lng": lng
        }, headers=headers)
        
        status = "✅" if res.status_code == 200 else f"❌ {res.status_code}"
        logging.info(f"  [{i+1}/{steps+1}] ({lat:.4f}, {lng:.4f}) -> {status}")
        
        if i < steps:
            time.sleep(duration / steps)
    
    logging.info("🎉 Done! Check the admin dashboard map — Sarah should have moved!")

if __name__ == "__main__":
    main()
