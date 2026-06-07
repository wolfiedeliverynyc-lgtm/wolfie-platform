"""Shared pytest fixtures for all Wolfie tests."""

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture(scope="session")
def app():
    with patch("services.payment.PaymentService"),      \
         patch("services.mapbox.MapboxClient"),          \
         patch("services.realtime.RealTimeService"),     \
         patch("services.matching.SmartMatchingEngine"), \
         patch("services.push.PushNotificationEngine"):

        from app import create_app
        _app = create_app("testing")
        _app.redis    = None
        _app.pricing  = None
        _app.mapbox   = None
        _app.matching = None
        _app.realtime = None
        _app.push     = None
        yield _app


@pytest.fixture
def client(app):
    with app.test_client() as c:
        yield c


@pytest.fixture
def admin_token():
    import jwt, os
    from datetime import datetime, timezone, timedelta
    secret = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    return jwt.encode({
        "sub": "adm_001", "role": "admin", "type": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }, secret, algorithm="HS256")


@pytest.fixture
def customer_token():
    import jwt, os
    from datetime import datetime, timezone, timedelta
    secret = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    return jwt.encode({
        "sub": "cst_001", "role": "customer", "type": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }, secret, algorithm="HS256")


@pytest.fixture
def driver_token():
    import jwt, os
    from datetime import datetime, timezone, timedelta
    secret = os.getenv("JWT_SECRET_KEY", "wolfie-jwt-change-in-prod")
    return jwt.encode({
        "sub": "drv_001", "role": "driver", "type": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }, secret, algorithm="HS256")
