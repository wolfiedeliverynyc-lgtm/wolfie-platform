"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          tasks/score_calculator.py                                          ║
║          Restaurant Score Calculator — Runs every 6 hours                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

Celery Beat Schedule:
    "calculate-scores": {
        "task": "tasks.score_calculator.calculate_all_scores",
        "schedule": crontab(minute=0, hour="*/6")  # Every 6 hours
    }

Score Formula:
    Speed Score (30%):    How fast vs industry average
    Accuracy Score (25%): ETA prediction accuracy
    Consistency (20%):    Low variance = high score
    Reliability (15%):    Uptime, error rate
    Customer (10%):       Average rating
"""

import statistics
from datetime import datetime, timezone, timedelta
from typing import Dict, List

from celery_app import celery
from database import get_session
from database.schemas import KitchenMetric, RestaurantScore, ScoreHistory


# ── WEIGHTS ──────────────────────────────────────────────────────────────────

SCORE_WEIGHTS = {
    "speed": 0.30,
    "accuracy": 0.25,
    "consistency": 0.20,
    "reliability": 0.15,
    "customer": 0.10
}

# Industry benchmarks (minutes)
BENCHMARK_PREP_TIME = 15.0  # Average restaurant
BENCHMARK_VARIANCE = 5.0    # Acceptable variance


# ══════════════════════════════════════════════════════════════════════════════
# CALCULATE SINGLE RESTAURANT
# ══════════════════════════════════════════════════════════════════════════════

def calculate_speed_score(metrics: List[KitchenMetric]) -> float:
    """
    Speed score: faster prep = higher score.
    100 = 2x faster than benchmark
    50 = at benchmark
    0 = 2x slower than benchmark
    """
    if not metrics:
        return 0.0

    prep_times = [m.prep_duration for m in metrics if m.prep_duration]
    if not prep_times:
        return 0.0

    avg_prep = statistics.mean(prep_times)

    # Score: 100 at 0 min, 50 at benchmark, 0 at 2x benchmark
    if avg_prep <= 0:
        return 100.0

    score = 100 - ((avg_prep / BENCHMARK_PREP_TIME) * 50)
    return max(0.0, min(100.0, score))


def calculate_accuracy_score(metrics: List[KitchenMetric]) -> float:
    """
    Accuracy score: how close predicted ETA was to actual.
    100 = perfect prediction
    0 = off by 100% or more
    """
    if not metrics:
        return 0.0

    errors = []
    for m in metrics:
        if m.predicted_prep_time and m.actual_prep_time and m.actual_prep_time > 0:
            error_pct = abs(m.predicted_prep_time - m.actual_prep_time) / m.actual_prep_time
            errors.append(error_pct)

    if not errors:
        return 50.0  # Neutral if no data

    avg_error = statistics.mean(errors)
    # 0% error = 100, 100% error = 0
    score = 100 - (avg_error * 100)
    return max(0.0, min(100.0, score))


def calculate_consistency_score(metrics: List[KitchenMetric]) -> float:
    """
    Consistency score: low variance = high score.
    100 = perfectly consistent
    0 = wildly inconsistent
    """
    if not metrics:
        return 0.0

    prep_times = [m.prep_duration for m in metrics if m.prep_duration]
    if len(prep_times) < 2:
        return 50.0

    try:
        variance = statistics.stdev(prep_times)
    except statistics.StatisticsError:
        return 50.0

    # Lower variance = higher score
    score = 100 - ((variance / BENCHMARK_VARIANCE) * 50)
    return max(0.0, min(100.0, score))


def calculate_reliiability_score(agent) -> float:
    """
    Reliability score: uptime, error rate.
    """
    if not agent:
        return 0.0

    # Uptime component (70%)
    uptime_score = agent.uptime_percentage or 0.0

    # Error rate component (30%)
    total = agent.total_orders_synced or 1
    error_rate = (agent.total_errors or 0) / total
    error_score = 100 - (error_rate * 100)

    return (uptime_score * 0.7) + (error_score * 0.3)


def calculate_customer_satisfaction(restaurant_id: str) -> float:
    """
    Customer satisfaction from ratings.
    (Placeholder - integrate with RatingRepository)
    """
    # TODO: Query ratings table
    return 85.0  # Default neutral


def get_tier(overall_score: float) -> str:
    """Convert score to tier."""
    if overall_score >= 90:
        return "wolfie_pro"
    elif overall_score >= 80:
        return "gold"
    elif overall_score >= 70:
        return "silver"
    elif overall_score >= 50:
        return "bronze"
    else:
        return "unranked"


# ══════════════════════════════════════════════════════════════════════════════
# MAIN CALCULATION
# ══════════════════════════════════════════════════════════════════════════════

def calculate_restaurant_score(restaurant_id: str, days: int = 7) -> Dict:
    """
    Calculate complete score for one restaurant.

    Returns:
        {
            "speed": float,
            "accuracy": float,
            "consistency": float,
            "reliability": float,
            "customer": float,
            "overall": float,
            "tier": str,
            "data_points": int
        }
    """
    with get_session() as session:
        # Get metrics for last N days
        since = datetime.now(timezone.utc) - timedelta(days=days)

        metrics = session.query(KitchenMetric).filter(
            KitchenMetric.restaurant_id == restaurant_id,
            KitchenMetric.created_at >= since
        ).all()

        # Get agent
        from database.schemas import SyncAgent
        agent = session.query(SyncAgent).filter_by(restaurant_id=restaurant_id).first()

        # Calculate components
        speed = calculate_speed_score(metrics)
        accuracy = calculate_accuracy_score(metrics)
        consistency = calculate_consistency_score(metrics)
        reliability = calculate_reliiability_score(agent)
        customer = calculate_customer_satisfaction(restaurant_id)

        # Weighted overall
        overall = (
            speed * SCORE_WEIGHTS["speed"] +
            accuracy * SCORE_WEIGHTS["accuracy"] +
            consistency * SCORE_WEIGHTS["consistency"] +
            reliability * SCORE_WEIGHTS["reliability"] +
            customer * SCORE_WEIGHTS["customer"]
        )

        return {
            "speed": round(speed, 2),
            "accuracy": round(accuracy, 2),
            "consistency": round(consistency, 2),
            "reliability": round(reliability, 2),
            "customer": round(customer, 2),
            "overall": round(overall, 2),
            "tier": get_tier(overall),
            "data_points": len(metrics)
        }


# ══════════════════════════════════════════════════════════════════════════════
# CELERY TASKS
# ══════════════════════════════════════════════════════════════════════════════

@celery.task(name="tasks.score_calculator.calculate_all_scores")
def calculate_all_scores():
    """
    Calculate scores for all restaurants.
    Runs every 6 hours via Celery Beat.
    """
    print("[Score Calculator] Starting batch calculation...")

    with get_session() as session:
        from database.schemas import User

        restaurants = session.query(User).filter_by(role="restaurant").all()

        results = []
        for restaurant in restaurants:
            try:
                score_data = calculate_restaurant_score(restaurant.id, days=7)

                # Get previous score for trend
                previous = session.query(RestaurantScore).filter_by(
                    restaurant_id=restaurant.id
                ).order_by(RestaurantScore.calculated_at.desc()).first()

                # Calculate trend
                trend_direction = "stable"
                trend_percentage = 0.0
                if previous:
                    diff = score_data["overall"] - previous.overall_score
                    if abs(diff) < 1:
                        trend_direction = "stable"
                    elif diff > 0:
                        trend_direction = "up"
                    else:
                        trend_direction = "down"
                    trend_percentage = (diff / previous.overall_score) * 100 if previous.overall_score else 0

                # Save new score
                score = RestaurantScore(
                    restaurant_id=restaurant.id,
                    speed_score=score_data["speed"],
                    accuracy_score=score_data["accuracy"],
                    consistency_score=score_data["consistency"],
                    reliability_score=score_data["reliability"],
                    customer_satisfaction=score_data["customer"],
                    overall_score=score_data["overall"],
                    tier=score_data["tier"],
                    data_points=score_data["data_points"],
                    previous_score=previous.overall_score if previous else None,
                    trend_direction=trend_direction,
                    trend_percentage=round(trend_percentage, 2),
                    calculation_window_days=7
                )
                session.add(score)

                # Save daily snapshot
                today = datetime.now(timezone.utc).date()
                history = ScoreHistory(
                    restaurant_id=restaurant.id,
                    date=today,
                    speed_score=score_data["speed"],
                    accuracy_score=score_data["accuracy"],
                    consistency_score=score_data["consistency"],
                    overall_score=score_data["overall"],
                    orders_count=score_data["data_points"],
                    avg_prep_time=statistics.mean([m.prep_duration for m in session.query(KitchenMetric).filter_by(restaurant_id=restaurant.id).all() if m.prep_duration]) if score_data["data_points"] > 0 else None
                )
                session.add(history)

                results.append({
                    "restaurant_id": restaurant.id,
                    "name": restaurant.full_name,
                    "score": score_data["overall"],
                    "tier": score_data["tier"]
                })

            except Exception as e:
                print(f"[Score Calculator] Error for {restaurant.id}: {e}")
                continue

        session.commit()

    print(f"[Score Calculator] Calculated {len(results)} scores")
    return results


@celery.task(name="tasks.score_calculator.calculate_single")
def calculate_single_score(restaurant_id: str):
    """Calculate score for single restaurant (on-demand)."""
    return calculate_restaurant_score(restaurant_id)
