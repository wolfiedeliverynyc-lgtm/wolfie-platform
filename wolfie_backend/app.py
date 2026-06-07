"""
╔══════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — app.py (FULLY INTEGRATED)         ║
║          All services bolted together. Production ready.     ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import logging
from flask import Flask, jsonify, current_app
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
from services.redis_service import WolfieRedis

load_dotenv()

# ──────────────────────────────────────────────
# GLOBAL SOCKETIO (shared across modules)
# ──────────────────────────────────────────────
# Redis URL for SocketIO scaling (set before init_app)
_REDIS_URL     = os.getenv("REDIS_URL", "redis://localhost:6379")
_MQ_URL        = f"{_REDIS_URL}/0"   # DB 0 for message queue

import redis
_message_queue = None
try:
    _r = redis.Redis.from_url(_MQ_URL, socket_timeout=1)
    _r.ping()
    _message_queue = _MQ_URL
except Exception:
    pass

try:
    import gevent
    _async_mode = "gevent"
except ImportError:
    _async_mode = "threading"

socketio = SocketIO(
    cors_allowed_origins  = "*",
    async_mode            = _async_mode,
    message_queue         = _message_queue,   # ← Redis pub/sub if running, else standalone
    channel               = "wolfie",
    ping_timeout          = 60,
    ping_interval         = 25,
    logger                = False,
    engineio_logger       = False,
)


def create_app(config_name: str = None) -> Flask:
    """Flask application factory — wires every service."""

    app = Flask(__name__)

    # ── Config ────────────────────────────────
    from config import config_map
    env = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_map[env])

    # ── Logging ───────────────────────────────
    _setup_logging(app)

    # ── Extensions ────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": app.config["ALLOWED_ORIGINS"]}})
    socketio.init_app(app)

    # ── Database (Supabase) ───────────────────
    from database import init_db, health_check
    init_db(app)

    # ── Redis ─────────────────────────────────
    try:
        redis_url    = app.config.get("REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379"))
        app.redis    = WolfieRedis(url=redis_url)
        if not app.redis.ping():
            app.logger.warning("⚠️  Redis unreachable — running without cache/queue")
            app.redis = None
        else:
            app.logger.info("✅ Redis connected")
    except Exception as e:
        app.logger.warning(f"⚠️  Redis init failed: {e} — running without Redis")
        app.redis = None

    # ── Services (import here to avoid circular) ──
    _init_services(app)

    # ── Blueprints / Routes ───────────────────
    _register_blueprints(app)

    # ── WebSocket events ──────────────────────
    _register_socket_events()

    # ── Error handlers ────────────────────────
    _register_error_handlers(app)

    # ── Health check ──────────────────────────
    @app.route("/health")
    def health():
        redis_inst = getattr(current_app, "redis", None)
        return jsonify({
            "status":   "ok",
            "service":  "wolfie-delivery",
            "version":  "1.0.0",
            "database": health_check(),
            "redis":    redis_inst.health() if redis_inst else {"status": "disabled"},
        })

    # ── Register state machine hooks ──────────
    from hooks import register_hooks
    register_hooks()

    app.logger.info(f"🐺 Wolfie Delivery started — env={env}")
    return app


# ──────────────────────────────────────────────────────────────
# SERVICES INIT
# ──────────────────────────────────────────────────────────────

def _init_services(app: Flask):
    """Boot all services and attach to app context."""

    # Payment (Stripe)
    try:
        from services import PaymentService
        app.payment_service = PaymentService(
            stripe_key=app.config["STRIPE_SECRET_KEY"],
            webhook_secret=app.config["STRIPE_WEBHOOK_SECRET"]
        )
        app.logger.info("✅ PaymentService ready")
    except Exception as e:
        app.logger.error(f"❌ PaymentService failed: {e}")

    # Mapbox
    try:
        from services import MapboxClient
        app.mapbox = MapboxClient(token=app.config["MAPBOX_TOKEN"])
        app.logger.info("✅ MapboxClient ready")
    except Exception as e:
        app.logger.error(f"❌ MapboxClient failed: {e}")

    # Pricing Engine v5.7
    try:
        from services import PricingEngine as WolfiePricingEngine
        app.pricing = WolfiePricingEngine(config=app.config)
        app.logger.info("✅ PricingEngine v5.7 ready")
    except Exception as e:
        app.logger.error(f"❌ PricingEngine failed: {e}")

    # Real-time / WebSocket service
    try:
        from services import RealTimeService
        app.realtime = RealTimeService(socketio=socketio)
        app.logger.info("✅ RealTimeService ready")
    except Exception as e:
        app.logger.error(f"❌ RealTimeService failed: {e}")

    # Smart Matching
    try:
        from services import SmartMatchingEngine
        app.matching = SmartMatchingEngine(
            mapbox=app.mapbox,
            config=app.config
        )
        app.logger.info("✅ SmartMatchingEngine ready")
    except Exception as e:
        app.logger.error(f"❌ SmartMatchingEngine failed: {e}")

    # Push Notifications
    try:
        from services import PushNotificationEngine
        app.push = PushNotificationEngine(
            twilio_sid=app.config.get("TWILIO_ACCOUNT_SID"),
            twilio_token=app.config.get("TWILIO_AUTH_TOKEN"),
            twilio_from=app.config.get("TWILIO_FROM_NUMBER")
        )
        app.logger.info("✅ PushNotificationEngine ready")
    except Exception as e:
        app.logger.error(f"❌ PushNotificationEngine failed: {e}")


# ──────────────────────────────────────────────────────────────
# BLUEPRINTS
# ──────────────────────────────────────────────────────────────

def _register_blueprints(app: Flask):
    from routes.auth         import auth_bp
    from routes.orders       import orders_bp
    from routes.payments     import payments_bp
    from routes.drivers      import drivers_bp
    from routes.restaurants  import restaurants_bp
    from routes.restaurant_onboarding import restaurant_onboarding_bp
    from routes.restaurant_finance import restaurant_finance_bp
    from routes.analytics    import analytics_bp
    from routes.tracking     import tracking_bp
    from routes.subscription import subscription_bp
    from routes.ratings      import ratings_bp
    from routes.notifications import notifications_bp
    from routes.admin        import admin_bp
    from routes.admin_orders import admin_orders_bp
    from routes.admin_refunds import admin_refunds_bp
    from routes.admin_support import admin_support_bp
    from routes.admin_fraud import admin_fraud_bp
    from routes.admin_logs import admin_logs_bp
    from routes.admin_config import admin_config_bp
    from routes.admin_finance import admin_finance_bp
    from routes.admin_ai_wap import admin_ai_wap_bp
    from routes.uploads import uploads_bp
    from routes.addresses import addresses_bp
    from routes.chat import chat_bp
    from routes.favorites import favorites_bp
    from routes.driver_kyc import driver_kyc_bp
    from routes.legal import legal_bp

    app.register_blueprint(auth_bp,         url_prefix="/api/v1/auth")
    app.register_blueprint(legal_bp,        url_prefix="/api/v1/legal")
    app.register_blueprint(orders_bp,       url_prefix="/api/v1/orders")
    app.register_blueprint(payments_bp,     url_prefix="/api/v1/payments")
    app.register_blueprint(drivers_bp,      url_prefix="/api/v1/drivers")
    app.register_blueprint(driver_kyc_bp,   url_prefix="/api/v1/drivers")
    app.register_blueprint(restaurants_bp,  url_prefix="/api/v1/restaurants")
    app.register_blueprint(restaurant_onboarding_bp, url_prefix="/api/v1/restaurants")
    app.register_blueprint(restaurant_finance_bp,    url_prefix="/api/v1/restaurants")
    app.register_blueprint(analytics_bp,    url_prefix="/api/v1/analytics")
    app.register_blueprint(tracking_bp,     url_prefix="/api/v1/tracking")
    app.register_blueprint(subscription_bp, url_prefix="/api/v1/subscription")
    app.register_blueprint(ratings_bp,      url_prefix="/api/v1/ratings")
    app.register_blueprint(notifications_bp, url_prefix="/api/v1/notifications")
    app.register_blueprint(addresses_bp,    url_prefix="/api/v1/addresses")
    app.register_blueprint(chat_bp,         url_prefix="/api/v1/chat")
    app.register_blueprint(favorites_bp,    url_prefix="/api/v1/favorites")
    app.register_blueprint(admin_bp,        url_prefix="/api/v1/admin")
    app.register_blueprint(admin_orders_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(admin_refunds_bp,url_prefix="/api/v1/admin")
    app.register_blueprint(admin_support_bp,url_prefix="/api/v1/admin")
    app.register_blueprint(admin_fraud_bp,  url_prefix="/api/v1/admin")
    app.register_blueprint(admin_logs_bp,   url_prefix="/api/v1/admin")
    app.register_blueprint(admin_config_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(admin_finance_bp,url_prefix="/api/v1/admin")
    app.register_blueprint(admin_ai_wap_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(uploads_bp, url_prefix="/api/v1")

    app.logger.info("✅ All blueprints registered")


# ──────────────────────────────────────────────────────────────
# WEBSOCKET EVENTS
# ──────────────────────────────────────────────────────────────

def _register_socket_events():
    from flask_socketio import join_room, leave_room, emit
    from flask import request

    @socketio.on("connect")
    def on_connect(auth=None):
        from flask import current_app
        import jwt
        from database import get_db_session
        from services.compliance_manager import ComplianceManager
        
        logger = logging.getLogger("wolfie")
        logger.info(f"WS connected: {request.sid}")

        # Optional Auth & Compliance Check
        token = None
        if auth and isinstance(auth, dict):
            token = auth.get("token")
            
        if token:
            try:
                secret = current_app.config["JWT_SECRET_KEY"]
                payload = jwt.decode(token, secret, algorithms=["HS256"])
                user_id = payload.get("sub")
                role = payload.get("role")
                
                join_room(f"user_{user_id}")
                logger.info(f"WS user {user_id} joined room user_{user_id}")
                
                with get_db_session() as session:
                    comp_mgr = ComplianceManager(session)
                    state = comp_mgr.evaluate_user_compliance(user_id, role)
                    if state != "compliant":
                        # Emit a compliance failure event before disconnecting
                        emit("compliance_error", {"code": "COMPLIANCE_REQUIRED", "message": "Policy Update Required"})
                        # In production we might disconnect, but for now we'll just emit the error
                        # disconnect()
                        logger.warning(f"WS compliance error for user {user_id}: {state}")
            except Exception as e:
                logger.error(f"WS Auth/Compliance error: {e}")

    @socketio.on("disconnect")
    def on_disconnect():
        logging.getLogger("wolfie").info(f"WS disconnected: {request.sid}")

    @socketio.on("join_order")
    def on_join_order(data):
        order_id = data.get("order_id")
        if order_id:
            join_room(f"order_{order_id}")
            emit("joined", {"room": f"order_{order_id}"})

    @socketio.on("leave_order")
    def on_leave_order(data):
        order_id = data.get("order_id")
        if order_id:
            leave_room(f"order_{order_id}")

    @socketio.on("join_restaurant")
    def on_join_restaurant(data):
        restaurant_id = data.get("restaurant_id")
        if restaurant_id:
            join_room(f"restaurant_{restaurant_id}")
            emit("joined", {"room": f"restaurant_{restaurant_id}"})

    @socketio.on("driver_location_update")
    def on_driver_location(data):
        """Driver pushes GPS → broadcast to customer's order room."""
        from flask import current_app
        order_id  = data.get("order_id")
        lat       = data.get("lat")
        lng       = data.get("lng")
        driver_id = data.get("driver_id")

        if not all([order_id, lat, lng, driver_id]):
            return

        # Persist location
        try:
            current_app.realtime.update_driver_location(driver_id, lat, lng, order_id)
        except Exception:
            pass

        # Broadcast to customer
        socketio.emit(
            "driver_location",
            {"lat": lat, "lng": lng, "driver_id": driver_id},
            room=f"order_{order_id}"
        )

    @socketio.on("order_chat")
    def on_order_chat(data):
        order_id = data.get("order_id")
        message  = data.get("message")
        sender   = data.get("sender_type") or data.get("sender") or "customer"  # customer | driver | restaurant
        sender_id = data.get("sender_id")

        if order_id and message:
            # Broadcast to room immediately for low-latency feedback
            socketio.emit(
                "chat_message",
                {"message": message, "sender": sender, "sender_id": sender_id},
                room=f"order_{order_id}"
            )

            # Persist to database
            try:
                from database import transaction
                from database.schemas import ChatMessage, Order
                with transaction() as session:
                    order = session.query(Order).filter(Order.id == order_id).first()
                    resolved_sender_id = sender_id
                    if order and not resolved_sender_id:
                        if sender == "customer":
                            resolved_sender_id = order.customer_id
                        elif sender == "driver":
                            resolved_sender_id = order.driver_id
                        elif sender == "restaurant":
                            resolved_sender_id = order.restaurant_id
                    
                    if resolved_sender_id:
                        new_msg = ChatMessage(
                            order_id=order_id,
                            sender_id=resolved_sender_id,
                            sender_type=sender,
                            message=message,
                            is_read=False
                        )
                        session.add(new_msg)
            except Exception as e:
                logging.getLogger("wolfie").error(f"Failed to persist Socket.IO message: {e}")



# ──────────────────────────────────────────────────────────────
# ERROR HANDLERS
# ──────────────────────────────────────────────────────────────

def _register_error_handlers(app: Flask):
    try:
        from services import register_error_handlers
        register_error_handlers(app)
        app.logger.info("✅ Error handlers registered")
    except ImportError:
        # Fallback minimal handlers
        @app.errorhandler(404)
        def not_found(e):
            return jsonify({"error": "Not found", "code": 404}), 404

        @app.errorhandler(500)
        def server_error(e):
            return jsonify({"error": "Internal server error", "code": 500}), 500


# ──────────────────────────────────────────────────────────────
# LOGGING
# ──────────────────────────────────────────────────────────────

def _setup_logging(app: Flask):
    level = logging.DEBUG if app.config.get("DEBUG") else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    logging.getLogger("wolfie").setLevel(level)


# ──────────────────────────────────────────────────────────────
# ENTRY POINT (dev only)
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=app.config.get("DEBUG", False),
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
