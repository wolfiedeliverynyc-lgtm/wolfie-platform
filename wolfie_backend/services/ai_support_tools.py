import datetime
from database import get_session
from database.schemas import Order, User, SupportTicket, Payment
from sqlalchemy import desc

def get_order_details(order_id: str) -> dict:
    """Fetch details of a specific order (status, items, price, tracking progress)."""
    try:
        with get_session() as db:
            order = db.query(Order).filter(Order.id == order_id).first()
            if not order:
                return {"error": "Order not found"}
            
            driver_name = order.driver.full_name if order.driver else "Not Assigned"
            restaurant_name = order.restaurant.restaurant_name if order.restaurant else "Unknown Restaurant"
            
            return {
                "order_id": order.id,
                "status": order.status,
                "restaurant_name": restaurant_name,
                "driver_name": driver_name,
                "subtotal": order.subtotal,
                "delivery_fee": order.delivery_fee,
                "service_fee": order.service_fee,
                "tax": order.tax,
                "total": order.total,
                "pickup_address": order.pickup_address,
                "delivery_address": order.delivery_address,
                "eta_minutes": order.eta_minutes,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
                "items": order.items
            }
    except Exception as e:
        return {"error": str(e)}

def get_recent_user_orders(user_id: str, role: str, limit: int = 3) -> dict:
    """Fetch a list of recent orders for a customer, driver, or restaurant."""
    try:
        with get_session() as db:
            query = db.query(Order)
            if role == "customer":
                query = query.filter(Order.customer_id == user_id)
            elif role == "driver":
                query = query.filter(Order.driver_id == user_id)
            elif role == "restaurant":
                query = query.filter(Order.restaurant_id == user_id)
            else:
                return {"error": "Invalid user role"}
                
            from database.schemas import User as _User
            rows = (
                query
                .with_entities(
                    Order.id,
                    Order.status,
                    Order.total,
                    Order.created_at,
                    _User.restaurant_name,
                )
                .join(_User, _User.id == Order.restaurant_id, isouter=True)
                .order_by(desc(Order.created_at))
                .limit(limit)
                .all()
            )

            order_list = []
            for o in rows:
                order_list.append({
                    "order_id": o.id,
                    "status": o.status,
                    "total": o.total,
                    "restaurant_name": o.restaurant_name or "Unknown",
                    "tracking_url": f"/tracking/{o.id}",
                    "created_at": o.created_at.isoformat() if o.created_at else None
                })
                
            return {"orders": order_list}
    except Exception as e:
        return {"error": str(e)}


def get_active_tracking_info(user_id: str, role: str) -> dict:
    """
    Fetch live tracking information for the user's active delivery order.
    Returns current stage, restaurant, driver, ETA, and clickable tracking URL.
    """
    try:
        with get_session() as db:
            active_statuses = ["pending", "assigned", "accepted", "preparing", "ready", "picked_up", "on_the_way"]
            query = db.query(Order)
            if role == "customer":
                query = query.filter(Order.customer_id == user_id)
            elif role == "driver":
                query = query.filter(Order.driver_id == user_id)
            elif role == "restaurant":
                query = query.filter(Order.restaurant_id == user_id)
            else:
                return {"error": "Invalid user role"}

            # 1. Look for currently active in-flight order
            order = query.filter(Order.status.in_(active_statuses)).order_by(desc(Order.created_at)).first()
            is_active = True
            
            # 2. If no active order, check the most recent order
            if not order:
                order = query.order_by(desc(Order.created_at)).first()
                is_active = False

            if not order:
                return {
                    "has_order": False,
                    "message": "No recent orders found on your account."
                }

            driver_name = order.driver.full_name if order.driver else "Looking for a nearby driver"
            restaurant_name = order.restaurant.restaurant_name if order.restaurant else "Partner Restaurant"
            items_summary = ", ".join([f"{item.get('quantity', 1)}x {item.get('name', 'Item')}" for item in (order.items or [])])

            return {
                "has_order": True,
                "order_id": order.id,
                "status": order.status,
                "is_active": is_active,
                "restaurant_name": restaurant_name,
                "driver_name": driver_name,
                "eta_minutes": order.eta_minutes or 20,
                "pickup_address": order.pickup_address,
                "delivery_address": order.delivery_address,
                "total": float(order.total or 0.0),
                "items_summary": items_summary,
                "tracking_url": f"/tracking/{order.id}",
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
            }
    except Exception as e:
        return {"has_order": False, "error": str(e)}

def get_driver_stats(driver_id: str) -> dict:
    """Fetch profile, earnings, and ratings for a driver."""
    try:
        with get_session() as db:
            driver = db.query(User).filter(User.id == driver_id, User.role == "driver").first()
            if not driver:
                return {"error": "Driver profile not found"}
                
            return {
                "driver_id": driver.id,
                "full_name": driver.full_name,
                "is_available": driver.is_available,
                "total_earnings": driver.total_earnings,
                "rating": driver.rating,
                "kyc_status": driver.kyc_status,
                "total_deliveries": driver.total_deliveries,
                "subscription_status": driver.subscription_status
            }
    except Exception as e:
        return {"error": str(e)}

def get_restaurant_status(restaurant_id: str) -> dict:
    """Fetch operating details, sync status, and busy mode for a restaurant."""
    try:
        with get_session() as db:
            restaurant = db.query(User).filter(User.id == restaurant_id, User.role == "restaurant").first()
            if not restaurant:
                return {"error": "Restaurant profile not found"}
                
            sync_status = "offline"
            if restaurant.sync_agent:
                sync_status = "online" if restaurant.sync_agent.is_online() else "offline"
                
            return {
                "restaurant_id": restaurant.id,
                "restaurant_name": restaurant.restaurant_name,
                "is_open": restaurant.is_open,
                "busy_mode": restaurant.busy_mode,
                "sync_agent_status": sync_status,
                "address": restaurant.address,
                "commission_rate": restaurant.commission_rate
            }
    except Exception as e:
        return {"error": str(e)}

def verify_refund_eligibility(order_id: str) -> dict:
    """Verify if an order qualifies for refund based on time window and policy rules."""
    try:
        with get_session() as db:
            order = db.query(Order).filter(Order.id == order_id).first()
            if not order:
                return {"eligible": False, "reason": "Order not found"}
                
            if order.status != "delivered":
                return {"eligible": False, "reason": "Order is not yet delivered"}
                
            if not order.delivered_at:
                return {"eligible": False, "reason": "No delivery timestamp recorded"}
                
            # Check 2-hour window
            delivered_time = order.delivered_at
            if delivered_time.tzinfo is None:
                # Assume UTC
                delivered_time = delivered_time.replace(tzinfo=datetime.timezone.utc)
                
            now = datetime.datetime.now(datetime.timezone.utc)
            elapsed_seconds = (now - delivered_time).total_seconds()
            elapsed_hours = elapsed_seconds / 3600.0
            
            if elapsed_hours > 2.0:
                return {
                    "eligible": False,
                    "reason": f"Refund window expired. Order was delivered {round(elapsed_hours, 1)} hours ago (2-hour limit)."
                }
                
            # Verify payment status
            payment = db.query(Payment).filter(Payment.order_id == order_id).first()
            payment_status = payment.status if payment else "unknown"
            if payment_status != "completed":
                return {"eligible": False, "reason": f"Payment is not completed (status: {payment_status})"}
                
            return {
                "eligible": True,
                "reason": "Order is within the 2-hour refund window and payment is completed.",
                "amount_eligible": order.total
            }
    except Exception as e:
        return {"eligible": False, "reason": str(e)}

def escalate_support_ticket(user_id: str, order_id: str, category: str, summary: str) -> dict:
    """Create a real support ticket in the database to escalate to a human admin."""
    try:
        with get_session() as db:
            new_ticket = SupportTicket(
                user_id=user_id,
                order_id=order_id if order_id and order_id != "N/A" else None,
                category=category,
                priority="high",
                status="escalated",
                ai_summary=summary
            )
            db.add(new_ticket)
            db.commit()
            
            return {
                "ticket_id": new_ticket.id,
                "status": "escalated",
                "message": "Ticket successfully escalated to human admin support."
            }
    except Exception as e:
        return {"error": str(e)}
