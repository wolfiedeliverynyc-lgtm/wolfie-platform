import pytest
import uuid
import jwt
from flask import current_app
from database import transaction
from database.schemas import User
from database.repositories import UserRepository

class FakeSessionStore:
    def __init__(self):
        self.store_db = {}
    
    def store(self, jti, user_id, role, ttl=86400):
        self.store_db[jti] = {"user_id": user_id, "role": role}
        
    def is_valid(self, jti):
        return jti in self.store_db
        
    def revoke(self, jti):
        if jti in self.store_db:
            del self.store_db[jti]

class FakeRateLimiter:
    def check(self, key, limit, window):
        return True, limit

class FakeRedis:
    def __init__(self):
        self.sessions = FakeSessionStore()
        self.limiter = FakeRateLimiter()

def test_jwt_session_revocation(client):
    fake_redis = FakeRedis()
    original_redis = client.application.redis
    client.application.redis = fake_redis
    
    try:
        with client.application.app_context():
            uid = str(uuid.uuid4())[:8]
            email = f"user_{uid}@test.com"
            password = "SecurePass123!"
            
            with transaction() as session:
                user = User(
                    email=email,
                    password_hash="fake_hash",
                    full_name="Test User",
                    role="customer",
                    phone=f"+1555555{uid}",
                    is_active=True
                )
                session.add(user)
                session.flush()
                UserRepository(session).update_password(user, password)
                
        # 1. Login to get access token
        res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200
        access_token = res.json["access_token"]
        
        # Check that jti was registered in fake_redis
        payload = jwt.decode(access_token, client.application.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        jti = payload.get("jti")
        assert jti is not None
        assert jti in fake_redis.sessions.store_db
        
        # 2. Call a protected route with the access token -> should succeed (200)
        res_profile = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert res_profile.status_code == 200
        
        # 3. Call logout
        res_logout = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {access_token}"})
        assert res_logout.status_code == 200
        
        # The jti must be removed from the session store
        assert jti not in fake_redis.sessions.store_db
        
        # 4. Try to access the protected route again -> must return 401
        res_profile_revoked = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert res_profile_revoked.status_code == 401
        assert "revoked" in res_profile_revoked.json["error"]

        # 5. Old tokens minted before this patch (no jti) should continue to work
        # Mint a manual access token without jti
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        old_access_payload = {
            "sub": payload["sub"], "role": payload["role"], "iat": now,
            "exp": now + timedelta(hours=24), "type": "access",
        }
        old_token = jwt.encode(old_access_payload, client.application.config["JWT_SECRET_KEY"], algorithm="HS256")
        
        res_old_profile = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_token}"})
        assert res_old_profile.status_code == 200
        
        # 6. Test fail-open behavior (if Redis goes down or sessions.is_valid raises Exception)
        # Set client.application.redis to None
        client.application.redis = None
        
        # Login again to get a new token with jti
        res_new = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        new_access_token = res_new.json["access_token"]
        
        # Request should succeed even though Redis is None (fail-open)
        res_new_profile = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
        assert res_new_profile.status_code == 200
    finally:
        client.application.redis = original_redis
