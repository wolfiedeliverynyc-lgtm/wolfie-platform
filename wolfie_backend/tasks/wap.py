"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE DELIVERY — tasks/wap.py                                     ║
║          AI prediction retraining and kitchen metrics                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import logging
from datetime import datetime, timezone, timedelta
from celery_app import celery
from database import get_db_session
from database.schemas import User, KitchenMetric, RestaurantScore

logger = logging.getLogger("wolfie.tasks.wap")
UTC = timezone.utc

@celery.task(name="tasks.wap.nightly_retrain", queue="wap")
def nightly_retrain():
    """
    Beat task — runs every night.
    Retrains the ML model for all restaurants with enough new data.
    """
    from services.wap import WAPEngine
    
    try:
        wap = WAPEngine()
        with get_db_session() as session:
            restaurants = session.query(User).filter(User.role == "restaurant").all()
            
            for rest in restaurants:
                # Check if we have new feedback in the last 24h
                if wap._should_retrain(session, rest.id):
                    wap._retrain_model(session, rest.id)
                    
        logger.info("Nightly WAP model retraining completed ✅")
        return {"status": "success"}

    except Exception as e:
        logger.error(f"nightly_retrain failed: {e}")
        raise


@celery.task(name="tasks.wap.calculate_restaurant_scores", queue="wap")
def calculate_restaurant_scores():
    """
    Beat task — runs every 6 hours.
    Calculates speed, accuracy, and reliability scores for restaurants based on kitchen metrics.
    """
    try:
        with get_db_session() as session:
            restaurants = session.query(User).filter(User.role == "restaurant").all()
            
            for rest in restaurants:
                # Get metrics from last 7 days
                week_ago = datetime.now(UTC) - timedelta(days=7)
                metrics = session.query(KitchenMetric).filter(
                    KitchenMetric.restaurant_id == rest.id,
                    KitchenMetric.created_at >= week_ago
                ).all()
                
                if not metrics:
                    continue
                
                # Calculate simple scores (0-100)
                prep_times = [m.prep_duration for m in metrics if m.prep_duration]
                if prep_times:
                    avg_prep = sum(prep_times) / len(prep_times)
                    # Example speed score logic: 15 min = 100, 30 min = 50, 45+ = 0
                    speed_score = max(0, min(100, 100 - (avg_prep - 15) * 3.33))
                else:
                    speed_score = 0.0

                accuracy_score = 80.0  # Default or placeholder
                
                # Update or create RestaurantScore
                score_record = session.query(RestaurantScore).filter_by(restaurant_id=rest.id).first()
                if not score_record:
                    score_record = RestaurantScore(restaurant_id=rest.id)
                    session.add(score_record)
                
                score_record.speed_score = speed_score
                score_record.accuracy_score = accuracy_score
                score_record.overall_score = (speed_score + accuracy_score) / 2
                score_record.calculated_at = datetime.now(UTC)
                score_record.data_points = len(metrics)
                
            session.commit()
            
        logger.info("Restaurant scores calculation completed ✅")
        return {"status": "success"}

    except Exception as e:
        logger.error(f"calculate_restaurant_scores failed: {e}")
        raise
