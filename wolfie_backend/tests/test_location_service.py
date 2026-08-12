import pytest
import time
import json
import uuid
from database import transaction, get_db_session
from database.schemas import User, DriverLocation
from database.repositories import UserRepository
from database.repositories.rating import DriverLocationRepository
from services.driver_service import DriverService

class FakeLocationCache:
    def __init__(self):
        self.store = {}

    def update(self, driver_id, lat, lng, order_id=None, timestamp=None):
        new_ts = timestamp or time.time()
        existing = self.get(driver_id)
        if existing and existing.get("ts", 0) > new_ts:
            return False
        self.store[driver_id] = {"lat": lat, "lng": lng, "order_id": order_id, "ts": new_ts}
        return True

    def get(self, driver_id):
        return self.store.get(driver_id)

class FakeRedisManager:
    def __init__(self):
        self.db_store = {}
        
    def client(self, db):
        return self
        
    def incr(self, key):
        self.db_store[key] = self.db_store.get(key, 0) + 1
        return self.db_store[key]
        
    def expire(self, key, ttl):
        pass
        
    def get(self, key):
        return self.db_store.get(key)
        
    def setex(self, key, ttl, val):
        self.db_store[key] = val

class FakeRedis:
    def __init__(self):
        self.locations = FakeLocationCache()
        self._manager = FakeRedisManager()

def test_location_updates(client):
    original_redis = client.application.redis
    fake_redis = FakeRedis()
    client.application.redis = fake_redis
    
    try:
        with client.application.app_context():
            # Setup clean test driver
            uid = str(uuid.uuid4())[:8]
            email = f"d_{uid}@test.com"
            with transaction() as session:
                driver = User(
                    email=email,
                    password_hash="fake",
                    full_name="Driver Test",
                    role="driver",
                    phone=f"+1555555{uid}",
                    is_active=True,
                    is_available=True
                )
                session.add(driver)
                session.flush()
                driver_id = driver.id
                session.commit()
                
            driver_service = DriverService()
            
            # 1. Successful update
            t0 = time.time()
            res1 = driver_service.update_location(driver_id, 40.7128, -74.0060, timestamp=t0)
            assert res1["status"] == "ok"
            
            # Verify it was stored in Redis
            loc = fake_redis.locations.get(driver_id)
            assert loc is not None
            assert loc["lat"] == 40.7128
            
            # 2. Out-of-order update rejection
            # Try to send update with timestamp t0 - 10 (older)
            res2 = driver_service.update_location(driver_id, 40.7130, -74.0065, timestamp=t0 - 10)
            assert res2["status"] == "ignored"
            assert res2["reason"] == "out-of-order"
            # Redis coordinates should not change
            assert fake_redis.locations.get(driver_id)["lat"] == 40.7128
            
            # 3. GPS Teleportation detection (jump of > 500m)
            # 40.7128, -74.0060 to 40.8128, -74.0060 is ~11 km
            res3 = driver_service.update_location(driver_id, 40.8128, -74.0060, timestamp=t0 + 10)
            assert res3["status"] == "ignored"
            assert res3["reason"] == "teleportation"

            # 4. DB Throttling verification
            # Initial location was persisted (since there was no previous cache entry)
            with get_db_session() as session:
                repo = DriverLocationRepository(session)
                db_loc = repo.get_for_driver(driver_id)
                assert db_loc is not None
                assert db_loc.lat == 40.7128
                
            # Send update 2 (same location, time t0 + 2)
            res_t2 = driver_service.update_location(driver_id, 40.7128, -74.0060, timestamp=t0 + 2)
            assert res_t2["status"] == "ok"
            
            # Update 2 should NOT be persisted to DB because it didn't move > 50m and count is 2 (not multiple of 10)
            # Modify DB coordinate directly to verify it was NOT overwritten
            with transaction() as session:
                repo = DriverLocationRepository(session)
                db_loc = repo.get_for_driver(driver_id)
                db_loc.lat = 41.0
                session.commit()
                
            # Send update 3 (same location)
            res_t3 = driver_service.update_location(driver_id, 40.7128, -74.0060, timestamp=t0 + 3)
            assert res_t3["status"] == "ok"
            
            # Verify DB still has 41.0 (not overwritten by 40.7128)
            with get_db_session() as session:
                repo = DriverLocationRepository(session)
                db_loc = repo.get_for_driver(driver_id)
                assert db_loc.lat == 41.0
                
            # Now move driver > 50m (e.g. from 40.7128 to 40.7138, which is ~110 meters)
            res_t4 = driver_service.update_location(driver_id, 40.7138, -74.0060, timestamp=t0 + 4)
            assert res_t4["status"] == "ok"
            
            # Verify DB is updated to 40.7138 because distance > 50m forces persistence
            with get_db_session() as session:
                repo = DriverLocationRepository(session)
                db_loc = repo.get_for_driver(driver_id)
                assert db_loc.lat == 40.7138

            # Cleanup / deactivate test driver to avoid interfering with other tests (e.g. matching engine)
            with transaction() as session:
                driver = session.get(User, driver_id)
                if driver:
                    driver.is_active = False
                    driver.is_available = False
                session.commit()
    finally:
        client.application.redis = original_redis
