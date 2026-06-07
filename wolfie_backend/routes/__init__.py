# routes/__init__.py
from routes.auth        import auth_bp
from routes.orders      import orders_bp
from routes.payments    import payments_bp
from routes.drivers     import drivers_bp
from routes.restaurants import restaurants_bp
from routes.analytics   import analytics_bp
from routes.tracking    import tracking_bp

__all__ = ["auth_bp","orders_bp","payments_bp","drivers_bp","restaurants_bp","analytics_bp","tracking_bp"]
