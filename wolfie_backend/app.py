"""
╔══════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — app.py (FULLY INTEGRATED)         ║
║          All services bolted together. Production ready.     ║
╚══════════════════════════════════════════════════════════════╝
"""

try:
    import gevent.monkey
    gevent.monkey.patch_all()
except ImportError:
    pass

import os
import logging
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from flask import Flask, jsonify, current_app, request
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
from services.redis_service import WolfieRedis

load_dotenv()

# Sentry SDK Initialization
_SENTRY_DSN = os.getenv("SENTRY_DSN")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[
            FlaskIntegration(),
            SqlalchemyIntegration(),
        ],
        default_integrations=False,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

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

    # ── Sentry Context ────────────────────────
    @app.before_request
    def set_sentry_context():
        raw = request.headers.get("Authorization", "")
        if raw.startswith("Bearer "):
            try:
                import jwt
                token = raw[7:]
                secret = app.config.get("JWT_SECRET_KEY")
                payload = jwt.decode(token, secret, algorithms=["HS256"])
                if payload:
                    user_id = payload.get("sub")
                    role = payload.get("role")
                    admin_type = payload.get("admin_type")
                    
                    user_data = {"id": user_id, "role": role}
                    sentry_sdk.set_user(user_data)
                    
                    sentry_sdk.set_tag("user_id", user_id)
                    sentry_sdk.set_tag("user_role", role)
                    if role == "admin" and admin_type:
                        sentry_sdk.set_tag("admin_type", admin_type)
            except Exception:
                pass
        
        # Tags for business flows
        try:
            # Query params
            for key in ["order_id", "restaurant_id", "driver_id", "customer_id"]:
                if key in request.args:
                    sentry_sdk.set_tag(key, request.args[key])
            # JSON params
            if request.is_json:
                data = request.get_json(silent=True) or {}
                for key in ["order_id", "restaurant_id", "driver_id", "customer_id"]:
                    if key in data:
                        sentry_sdk.set_tag(key, data[key])
        except Exception:
            pass

        # Environment & Version tags
        sentry_sdk.set_tag("environment", app.config.get("ENV", "development"))
        sentry_sdk.set_tag("app_version", "1.1.0")

    # ── Extensions ────────────────────────────
    CORS(app, resources={r"/api/*": {
        "origins": app.config["ALLOWED_ORIGINS"],
        "supports_credentials": True
    }})
    socketio.init_app(app)

    # ── Prometheus Exporter ───────────────────
    from prometheus_flask_exporter import PrometheusMetrics
    metrics = PrometheusMetrics(app, path="/metrics")

    @app.before_request
    def update_custom_gauges():
        if request.path == "/metrics":
            from services.metrics import update_system_metrics, update_redis_metrics
            update_system_metrics()
            redis_inst = getattr(current_app, "redis", None)
            update_redis_metrics(redis_inst)

    # ── Database (Supabase) ───────────────────
    from database import init_db, health_check
    engine = init_db(app)

    from services.metrics import setup_db_metrics
    setup_db_metrics(engine)

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

    # ── Static Files / Uploads ─────────────────
    # Serve uploaded profile pictures at /uploads/
    from flask import send_from_directory
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        """Serve uploaded files (profile pictures, etc)"""
        try:
            return send_from_directory(uploads_dir, filename, as_attachment=False)
        except Exception as e:
            app.logger.warning(f"Upload file not found: {filename} — {e}")
            return jsonify({"error": "File not found"}), 404
    
    app.logger.info(f"✅ Uploads serving at /uploads/ (dir: {uploads_dir})")

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

    @app.route("/ready")
    def ready():
        db_res = health_check()
        db_ok = db_res.get("status") == "ok"
        if db_ok:
            return jsonify({"status": "ready", "database": "connected"}), 200
        else:
            return jsonify({"status": "not_ready", "database": db_res.get("database", "disconnected")}), 503

    @app.route("/live")
    def live():
        return jsonify({"status": "alive"}), 200

    @app.route("/status")
    def status_endpoint():
        from datetime import datetime, timezone
        redis_inst = getattr(current_app, "redis", None)
        return jsonify({
            "status": "ok",
            "environment": current_app.config.get("ENV", "development"),
            "database": health_check(),
            "redis": redis_inst.health() if redis_inst else {"status": "disabled"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

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
    from routes.addresses import addresses_bp
    from routes.chat import chat_bp
    from routes.favorites import favorites_bp
    from routes.driver_kyc import driver_kyc_bp
    from routes.ai_support import ai_support_bp

    app.register_blueprint(auth_bp,         url_prefix="/api/v1/auth")
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
    app.register_blueprint(ai_support_bp,   url_prefix="/api/v1/support")
    app.register_blueprint(admin_bp,        url_prefix="/api/v1/admin")
    app.register_blueprint(admin_orders_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(admin_refunds_bp,url_prefix="/api/v1/admin")
    app.register_blueprint(admin_support_bp,url_prefix="/api/v1/admin")
    app.register_blueprint(admin_fraud_bp,  url_prefix="/api/v1/admin")
    app.register_blueprint(admin_logs_bp,   url_prefix="/api/v1/admin")
    app.register_blueprint(admin_config_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(admin_finance_bp,url_prefix="/api/v1/admin")
    app.register_blueprint(admin_ai_wap_bp, url_prefix="/api/v1/admin")

    app.logger.info("✅ All blueprints registered")


# ──────────────────────────────────────────────────────────────
# WEBSOCKET EVENTS
# ──────────────────────────────────────────────────────────────

def _register_socket_events():
    from flask_socketio import join_room, leave_room, emit
    from flask import request

    @socketio.on("connect")
    def on_connect():
        logging.getLogger("wolfie").info(f"WS connected: {request.sid}")

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
    logger = logging.getLogger("wolfie")
    logger.setLevel(level)

    loki_url = os.getenv("LOKI_URL")
    if loki_url:
        try:
            from services.loki_logger import LokiHandler
            labels = {
                "service": "wolfie-backend",
                "environment": os.getenv("FLASK_ENV", "production")
            }
            loki_handler = LokiHandler(url=loki_url, labels=labels, level=level)
            formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
            loki_handler.setFormatter(formatter)
            logging.getLogger().addHandler(loki_handler)
            logger.info("✅ Loki Centralized Logging handler active")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize Loki logger: {e}")


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
