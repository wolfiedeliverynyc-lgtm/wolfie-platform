"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — routes/sync.py                                   ║
║          Sync Agent API — Restaurant POS Integration                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Endpoints:
  POST /api/v1/sync/register        — Register new Sync Agent
  POST /api/v1/sync/heartbeat       — Agent heartbeat (every 30s)
  POST /api/v1/sync/order-event     — Real-time order status update
  POST /api/v1/sync/kitchen-metrics — Batch kitchen timing data
  GET  /api/v1/sync/score/<id>      — Get restaurant score (public)
  GET  /api/v1/sync/agent-status    — Check agent health (restaurant admin)
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timezone
from functools import wraps
import uuid

from database import get_session
from database.repositories import UserRepository, OrderRepository
from database.schemas import SyncAgent, KitchenMetric, RestaurantScore
from order_state_manager import OrderState

sync_bp = Blueprint("sync", __name__, url_prefix="/api/v1/sync")


# ── AUTH ─────────────────────────────────────────────────────────────────────

def agent_auth_required(f):
    """Validate Sync Agent API key + device fingerprint."""
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get("X-Agent-Key")
        fingerprint = request.headers.get("X-Device-Fingerprint")

        if not api_key or not fingerprint:
            return jsonify({"error": "Missing credentials"}), 401

        with get_session() as session:
            agent = session.query(SyncAgent).filter_by(
                device_fingerprint=fingerprint
            ).first()

            if not agent or agent.status == "suspended":
                return jsonify({"error": "Invalid or suspended agent"}), 403

            # Update heartbeat
            agent.last_heartbeat = datetime.now(timezone.utc)
            session.commit()

            request.agent = agent
            return f(*args, **kwargs)
    return decorated


# ══════════════════════════════════════════════════════════════════════════════
# REGISTER
# ══════════════════════════════════════════════════════════════════════════════

@sync_bp.route("/register", methods=["POST"])
def register_agent():
    """
    Register a new Sync Agent for a restaurant.
    Called once during installation.

    Body:
      {
        "restaurant_id": "uuid",
        "device_fingerprint": "sha256_hash",
        "device_name": "Kitchen PC",
        "pos_type": "square|toast|clover|lightspeed|custom",
        "pos_version": "2.1.0"
      }
    """
    data = request.get_json() or {}

    required = ["restaurant_id", "device_fingerprint", "pos_type"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing: {missing}"}), 400

    with get_session() as session:
        # Check restaurant exists and is approved
        restaurant = UserRepository(session).get(data["restaurant_id"])
        if not restaurant or restaurant.role != "restaurant":
            return jsonify({"error": "Invalid restaurant"}), 404

        # Check if agent already exists
        existing = session.query(SyncAgent).filter_by(
            device_fingerprint=data["device_fingerprint"]
        ).first()
        if existing:
            return jsonify({
                "error": "Agent already registered",
                "agent_id": existing.id,
                "status": existing.status
            }), 409

        agent = SyncAgent(
            restaurant_id=data["restaurant_id"],
            device_fingerprint=data["device_fingerprint"],
            device_name=data.get("device_name", "Unknown"),
            pos_type=data["pos_type"],
            pos_version=data.get("pos_version"),
            status="active",
            last_heartbeat=datetime.now(timezone.utc),
            ip_address=request.remote_addr
        )
        session.add(agent)
        session.commit()

        # Generate API key (in production, use secure key generation)
        api_key = f"wlf_{uuid.uuid4().hex}"

        return jsonify({
            "agent_id": agent.id,
            "api_key": api_key,
            "status": "active",
            "registered_at": agent.installed_at.isoformat()
        }), 201


# ══════════════════════════════════════════════════════════════════════════════
# HEARTBEAT
# ══════════════════════════════════════════════════════════════════════════════

@sync_bp.route("/heartbeat", methods=["POST"])
@agent_auth_required
def heartbeat():
    """
    Agent heartbeat — called every 30 seconds.
    Returns: any pending commands (update, config change, etc.)
    """
    data = request.get_json() or {}
    agent = request.agent

    # Update metrics from agent
    if "uptime_percentage" in data:
        agent.uptime_percentage = data["uptime_percentage"]
    if "total_orders_synced" in data:
        agent.total_orders_synced = data["total_orders_synced"]

    # Check for commands to send back
    commands = []

    # Example: force update if version mismatch
    if data.get("agent_version") != agent.agent_version:
        commands.append({"type": "update", "version": agent.agent_version})

    return jsonify({
        "status": "ok",
        "server_time": datetime.now(timezone.utc).isoformat(),
        "commands": commands
    })


# ══════════════════════════════════════════════════════════════════════════════
# ORDER EVENT
# ══════════════════════════════════════════════════════════════════════════════

@sync_bp.route("/order-event", methods=["POST"])
@agent_auth_required
def receive_order_event():
    """
    Real-time order event from POS.

    Body:
      {
        "order_id": "uuid",
        "event_type": "received|started|ready|handed_to_driver",
        "timestamp": "2026-05-17T10:30:00Z",
        "pos_order_id": "POS-12345",
        "items_count": 3,
        "complex_items": 1,
        "raw_data": {...}
      }
    """
    data = request.get_json() or {}
    agent = request.agent

    event_type = data.get("event_type")
    order_id = data.get("order_id")
    timestamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))

    # Store in Redis for real-time (fast path)
    redis_key = f"order:{order_id}:kitchen"
    if current_app.redis:
        current_app.redis.hset(redis_key, mapping={
            "event_type": event_type,
            "timestamp": timestamp.isoformat(),
            "restaurant_id": agent.restaurant_id
        })
        current_app.redis.expire(redis_key, 3600)  # 1 hour TTL

    # Update order state machine if needed
    if event_type == "ready":
        from order_state_manager import order_state_manager, OrderState
        result = order_state_manager.transition(
            order_id=order_id,
            from_state=OrderState.PREPARING,
            to_state=OrderState.READY,
            actor_id=agent.restaurant_id,
            actor_role="restaurant"
        )
        if result.success:
            # Trigger notifications via Celery
            from celery_app import celery
            celery.send_task("tasks.notify.notify_driver", args=[order_id])

    # Persist metric
    with get_session() as session:
        metric = session.query(KitchenMetric).filter_by(order_id=order_id).first()

        if not metric:
            metric = KitchenMetric(
                agent_id=agent.id,
                restaurant_id=agent.restaurant_id,
                order_id=order_id,
                total_items=data.get("items_count", 0),
                complex_items=data.get("complex_items", 0),
                raw_pos_data=str(data.get("raw_data", {}))
            )
            session.add(metric)

        # Update timestamps based on event type
        if event_type == "received":
            metric.pos_received_at = timestamp
        elif event_type == "started":
            metric.kitchen_started_at = timestamp
            if metric.pos_received_at:
                metric.queue_duration = (timestamp - metric.pos_received_at).total_seconds() / 60
        elif event_type == "ready":
            metric.kitchen_ready_at = timestamp
            if metric.kitchen_started_at:
                metric.prep_duration = (timestamp - metric.kitchen_started_at).total_seconds() / 60
        elif event_type == "handed_to_driver":
            metric.handoff_at = timestamp
            if metric.kitchen_ready_at:
                metric.wait_for_driver = (timestamp - metric.kitchen_ready_at).total_seconds() / 60
            if metric.pos_received_at:
                metric.total_kitchen_time = (timestamp - metric.pos_received_at).total_seconds() / 60

        session.commit()

    return jsonify({"status": "received", "event": event_type})


# ══════════════════════════════════════════════════════════════════════════════
# BATCH METRICS (for offline sync)
# ══════════════════════════════════════════════════════════════════════════════

@sync_bp.route("/kitchen-metrics", methods=["POST"])
@agent_auth_required
def batch_metrics():
    """
    Batch upload of kitchen metrics (for offline recovery).

    Body:
      {
        "metrics": [
          {"order_id": "...", "prep_duration": 12.5, ...},
          ...
        ]
      }
    """
    data = request.get_json() or {}
    metrics = data.get("metrics", [])
    agent = request.agent

    inserted = 0
    with get_session() as session:
        for m in metrics:
            metric = KitchenMetric(
                agent_id=agent.id,
                restaurant_id=agent.restaurant_id,
                order_id=m["order_id"],
                prep_duration=m.get("prep_duration"),
                total_items=m.get("total_items"),
                rush_hour=m.get("rush_hour", False)
            )
            session.add(metric)
            inserted += 1
        session.commit()

    agent.last_sync_at = datetime.now(timezone.utc)

    return jsonify({"inserted": inserted, "status": "ok"})


# ══════════════════════════════════════════════════════════════════════════════
# GET SCORE (Public)
# ══════════════════════════════════════════════════════════════════════════════

@sync_bp.route("/score/<restaurant_id>", methods=["GET"])
def get_restaurant_score(restaurant_id):
    """
    Get restaurant performance score.
    Public endpoint — shown to customers.
    """
    with get_session() as session:
        score = session.query(RestaurantScore).filter_by(
            restaurant_id=restaurant_id
        ).order_by(RestaurantScore.calculated_at.desc()).first()

        if not score:
            return jsonify({
                "restaurant_id": restaurant_id,
                "overall_score": None,
                "status": "insufficient_data",
                "message": "Need more orders to calculate score"
            }), 200

        return jsonify({
            "restaurant_id": restaurant_id,
            "overall_score": round(score.overall_score, 1),
            "tier": score.tier,
            "breakdown": {
                "speed": round(score.speed_score, 1),
                "accuracy": round(score.accuracy_score, 1),
                "consistency": round(score.consistency_score, 1),
                "reliability": round(score.reliability_score, 1),
                "customer_satisfaction": round(score.customer_satisfaction, 1)
            },
            "data_points": score.data_points,
            "trend": {
                "direction": score.trend_direction,
                "percentage": round(score.trend_percentage, 1) if score.trend_percentage else None
            },
            "calculated_at": score.calculated_at.isoformat()
        })


# ══════════════════════════════════════════════════════════════════════════════
# AGENT STATUS (Restaurant Admin)
# ══════════════════════════════════════════════════════════════════════════════

@sync_bp.route("/agent-status", methods=["GET"])
@agent_auth_required
def agent_status():
    """Get detailed agent status for restaurant dashboard."""
    agent = request.agent

    return jsonify({
        "agent_id": agent.id,
        "status": agent.status,
        "is_online": agent.is_online(),
        "pos_type": agent.pos_type,
        "agent_version": agent.agent_version,
        "installed_at": agent.installed_at.isoformat(),
        "last_heartbeat": agent.last_heartbeat.isoformat() if agent.last_heartbeat else None,
        "last_sync": agent.last_sync_at.isoformat() if agent.last_sync_at else None,
        "metrics": {
            "total_orders_synced": agent.total_orders_synced,
            "total_errors": agent.total_errors,
            "uptime_percentage": round(agent.uptime_percentage, 1)
        }
    })
