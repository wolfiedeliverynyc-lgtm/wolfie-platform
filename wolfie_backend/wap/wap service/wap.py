"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          services/wap.py — Wolfie AI Prediction (WAP)                       ║
║          Predicts order completion time using ML + historical data          ║
╚══════════════════════════════════════════════════════════════════════════════╝

Architecture:
  Order Created
      ↓
  WAP Engine (predict)
      ├── Restaurant Profile (avg prep time, variance, rush hour factor)
      ├── Driver Profile (avg speed, route efficiency)
      ├── Real-time Factors (traffic, weather, demand)
      └── Historical Patterns (day of week, time of day)
      ↓
  Prediction stored in order.eta_predicted
      ↓
  Broadcast to: Restaurant, Driver, Customer, Wolfie Dashboard
      ↓
  Order Delivered
      ↓
  WAP Feedback (compare predicted vs actual)
      ↓
  ML Model retrains with new data
"""

import json
import statistics
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

from database import get_session
from database.schemas import KitchenMetric, Order, RestaurantScore
from services.mapbox import MapboxClient


# ── CONFIG ───────────────────────────────────────────────────────────────────

WAP_VERSION = "1.0.0"
MIN_DATA_POINTS = 10  # Minimum orders before ML prediction
CONFIDENCE_THRESHOLD = 0.7  # Minimum confidence for auto-dispatch

# Time buffers (minutes)
BUFFER_RESTAURANT_BUSY = 5.0
BUFFER_RUSH_HOUR = 3.0
BUFFER_RAIN = 4.0
BUFFER_NEW_RESTAURANT = 8.0


@dataclass
class WAPPrediction:
    """Prediction result."""
    order_id: str
    prep_time_min: float
    drive_time_min: float
    buffer_min: float
    total_eta_min: float
    confidence: float  # 0.0 - 1.0
    breakdown: Dict
    predicted_at: datetime
    wap_version: str


@dataclass
class WAPFeedback:
    """Feedback after order completion."""
    order_id: str
    predicted_total: float
    actual_total: float
    error_min: float
    error_percentage: float
    prep_error: float
    drive_error: float
    learned: bool


# ══════════════════════════════════════════════════════════════════════════════
# WAP ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class WAPEngine:
    """
    Wolfie AI Prediction Engine.

    Uses hybrid approach:
    - Rule-based for new restaurants (< 10 orders)
    - ML model for established restaurants
    - Real-time adjustments for traffic/weather/demand
    """

    def __init__(self, mapbox: MapboxClient = None):
        self.mapbox = mapbox
        self.scaler = StandardScaler()
        self.ml_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self._model_trained = False

    # ── PREDICTION ──────────────────────────────────────────────────────────

    def predict(self, order: Order, restaurant_id: str, 
                driver_id: str = None, distance_km: float = None) -> WAPPrediction:
        """
        Predict total order completion time.

        Returns WAPPrediction with:
        - prep_time: Kitchen preparation
        - drive_time: Driver delivery
        - buffer: Safety margin
        - total_eta: Sum of all
        - confidence: How sure we are (0-1)
        """

        now = datetime.now(timezone.utc)

        # 1. Get restaurant profile
        restaurant_profile = self._get_restaurant_profile(restaurant_id)

        # 2. Calculate prep time
        prep_time = self._predict_prep_time(
            restaurant_id=restaurant_id,
            item_count=order.item_count if hasattr(order, 'item_count') else 3,
            complexity=self._estimate_complexity(order),
            rush_hour=self._is_rush_hour(now),
            profile=restaurant_profile
        )

        # 3. Calculate drive time
        drive_time = self._predict_drive_time(
            distance_km=distance_km or 2.0,
            driver_id=driver_id,
            traffic_factor=self._get_traffic_factor(now)
        )

        # 4. Calculate buffer
        buffer = self._calculate_buffer(
            restaurant_profile=restaurant_profile,
            rush_hour=self._is_rush_hour(now),
            weather="clear"  # TODO: integrate weather API
        )

        # 5. Calculate confidence
        confidence = self._calculate_confidence(
            restaurant_profile=restaurant_profile,
            has_ml_model=self._model_trained,
            data_points=restaurant_profile.get('data_points', 0)
        )

        # 6. Total ETA
        total_eta = prep_time + drive_time + buffer

        prediction = WAPPrediction(
            order_id=order.id,
            prep_time_min=round(prep_time, 1),
            drive_time_min=round(drive_time, 1),
            buffer_min=round(buffer, 1),
            total_eta_min=round(total_eta, 1),
            confidence=round(confidence, 2),
            breakdown={
                "prep": {
                    "base": restaurant_profile.get('avg_prep_time', 15.0),
                    "rush_adjustment": BUFFER_RUSH_HOUR if self._is_rush_hour(now) else 0,
                    "complexity_adjustment": self._estimate_complexity(order) * 2,
                    "final": round(prep_time, 1)
                },
                "drive": {
                    "distance_km": distance_km or 2.0,
                    "base_speed_kmh": 25,
                    "traffic_factor": self._get_traffic_factor(now),
                    "final": round(drive_time, 1)
                },
                "buffer": {
                    "restaurant_variance": buffer * 0.4,
                    "traffic_safety": buffer * 0.3,
                    "weather_safety": buffer * 0.3,
                    "final": round(buffer, 1)
                }
            },
            predicted_at=now,
            wap_version=WAP_VERSION
        )

        # Store prediction in order
        self._store_prediction(order.id, prediction)

        return prediction

    # ── PREP TIME PREDICTION ────────────────────────────────────────────────

    def _predict_prep_time(self, restaurant_id: str, item_count: int,
                          complexity: float, rush_hour: bool,
                          profile: Dict) -> float:
        """Predict kitchen preparation time."""

        base_time = profile.get('avg_prep_time', 15.0)

        # ML prediction if enough data
        if profile.get('data_points', 0) >= MIN_DATA_POINTS and self._model_trained:
            features = np.array([[
                item_count,
                complexity,
                1.0 if rush_hour else 0.0,
                profile.get('avg_prep_time', 15.0),
                profile.get('variance', 5.0),
                datetime.now(timezone.utc).hour
            ]])
            try:
                ml_prediction = self.ml_model.predict(features)[0]
                # Blend ML + rule-based (70% ML, 30% rule)
                base_time = (ml_prediction * 0.7) + (base_time * 0.3)
            except:
                pass  # Fallback to rule-based

        # Adjustments
        adjustments = 0
        adjustments += complexity * 2.0  # Complex items take longer
        adjustments += item_count * 1.5   # More items = more time
        if rush_hour:
            adjustments += BUFFER_RUSH_HOUR
        if profile.get('data_points', 0) < MIN_DATA_POINTS:
            adjustments += BUFFER_NEW_RESTAURANT

        return base_time + adjustments

    # ── DRIVE TIME PREDICTION ───────────────────────────────────────────────

    def _predict_drive_time(self, distance_km: float, driver_id: str = None,
                           traffic_factor: float = 1.0) -> float:
        """Predict driver delivery time."""

        # Base: 25 km/h average in city
        base_speed = 25.0

        # Driver experience bonus
        if driver_id:
            driver_profile = self._get_driver_profile(driver_id)
            if driver_profile.get('avg_speed'):
                base_speed = driver_profile['avg_speed']

        # Mapbox routing if available
        if self.mapbox:
            try:
                route = self.mapbox.get_route_duration(distance_km)
                if route:
                    return route * traffic_factor
            except:
                pass

        # Fallback calculation
        drive_time = (distance_km / base_speed) * 60  # minutes
        return drive_time * traffic_factor

    # ── BUFFER CALCULATION ──────────────────────────────────────────────────

    def _calculate_buffer(self, restaurant_profile: Dict, 
                         rush_hour: bool, weather: str) -> float:
        """Calculate safety buffer."""

        buffer = 3.0  # Base buffer

        # Restaurant variance
        variance = restaurant_profile.get('variance', 5.0)
        buffer += min(variance * 0.5, 5.0)

        # Rush hour
        if rush_hour:
            buffer += BUFFER_RUSH_HOUR

        # Weather
        if weather in ['rain', 'snow']:
            buffer += BUFFER_RAIN

        return buffer

    # ── CONFIDENCE ──────────────────────────────────────────────────────────

    def _calculate_confidence(self, restaurant_profile: Dict,
                             has_ml_model: bool, data_points: int) -> float:
        """Calculate prediction confidence (0-1)."""

        confidence = 0.5  # Base

        # More data = more confident
        if data_points >= 100:
            confidence += 0.3
        elif data_points >= 50:
            confidence += 0.2
        elif data_points >= MIN_DATA_POINTS:
            confidence += 0.1

        # ML model trained
        if has_ml_model:
            confidence += 0.1

        # Low variance = more confident
        variance = restaurant_profile.get('variance', 5.0)
        if variance < 3.0:
            confidence += 0.1

        return min(confidence, 1.0)

    # ── FEEDBACK LOOP ───────────────────────────────────────────────────────

    def record_feedback(self, order_id: str) -> WAPFeedback:
        """
        Compare prediction vs actual after order delivery.
        Called automatically when order status = DELIVERED.
        """

        with get_session() as session:
            order = session.query(Order).get(order_id)
            metric = session.query(KitchenMetric).filter_by(order_id=order_id).first()

            if not order or not metric:
                return None

            # Get stored prediction
            prediction_data = order.prediction_data
            if not prediction_data:
                return None

            predicted_total = prediction_data.get('total_eta_min', 0)

            # Calculate actual time
            actual_total = 0
            if metric.pos_received_at and metric.handoff_at:
                actual_total = (metric.handoff_at - metric.pos_received_at).total_seconds() / 60

            # Errors
            error_min = actual_total - predicted_total
            error_percentage = (error_min / predicted_total * 100) if predicted_total > 0 else 0

            prep_error = 0
            if metric.prep_duration and prediction_data.get('prep_time_min'):
                prep_error = metric.prep_duration - prediction_data['prep_time_min']

            drive_error = 0
            if metric.total_kitchen_time and metric.prep_duration:
                actual_drive = metric.total_kitchen_time - metric.prep_duration
                predicted_drive = prediction_data.get('drive_time_min', 0)
                drive_error = actual_drive - predicted_drive

            feedback = WAPFeedback(
                order_id=order_id,
                predicted_total=predicted_total,
                actual_total=round(actual_total, 1),
                error_min=round(error_min, 1),
                error_percentage=round(error_percentage, 1),
                prep_error=round(prep_error, 1),
                drive_error=round(drive_error, 1),
                learned=False
            )

            # Store feedback
            self._store_feedback(session, feedback)

            # Retrain model if enough new data
            if self._should_retrain(session, order.restaurant_id):
                self._retrain_model(session, order.restaurant_id)
                feedback.learned = True

            session.commit()

            return feedback

    def _store_feedback(self, session, feedback: WAPFeedback):
        """Store feedback for model improvement."""
        from database.schemas import WAPFeedback as WAPFeedbackModel

        fb = WAPFeedbackModel(
            order_id=feedback.order_id,
            predicted_total=feedback.predicted_total,
            actual_total=feedback.actual_total,
            error_min=feedback.error_min,
            error_percentage=feedback.error_percentage,
            prep_error=feedback.prep_error,
            drive_error=feedback.drive_error,
            model_version=WAP_VERSION
        )
        session.add(fb)

    def _should_retrain(self, session, restaurant_id: str) -> bool:
        """Check if we have enough new data to retrain."""
        from database.schemas import WAPFeedback as WAPFeedbackModel

        recent_feedback = session.query(WAPFeedbackModel).filter(
            WAPFeedbackModel.created_at >= datetime.now(timezone.utc) - timedelta(hours=6)
        ).count()

        return recent_feedback >= 10  # Retrain every 10 new orders

    def _retrain_model(self, session, restaurant_id: str):
        """Retrain ML model with new data."""

        # Get training data
        metrics = session.query(KitchenMetric).filter(
            KitchenMetric.restaurant_id == restaurant_id,
            KitchenMetric.prep_duration.isnot(None),
            KitchenMetric.total_items.isnot(None)
        ).limit(500).all()

        if len(metrics) < MIN_DATA_POINTS:
            return

        # Prepare features
        X = []
        y = []

        for m in metrics:
            X.append([
                m.total_items or 0,
                m.complex_items or 0,
                1.0 if m.rush_hour else 0.0,
                m.hour_of_day or 12,
                m.day_of_week or 0
            ])
            y.append(m.prep_duration)

        X = np.array(X)
        y = np.array(y)

        # Scale and train
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        self.ml_model.fit(X_scaled, y)
        self._model_trained = True

        print(f"[WAP] Model retrained for restaurant {restaurant_id} with {len(metrics)} samples")

    # ── HELPERS ─────────────────────────────────────────────────────────────

    def _get_restaurant_profile(self, restaurant_id: str) -> Dict:
        """Get restaurant performance profile."""

        with get_session() as session:
            # Get recent metrics
            since = datetime.now(timezone.utc) - timedelta(days=30)
            metrics = session.query(KitchenMetric).filter(
                KitchenMetric.restaurant_id == restaurant_id,
                KitchenMetric.prep_duration.isnot(None),
                KitchenMetric.created_at >= since
            ).all()

            if not metrics:
                return {
                    'avg_prep_time': 15.0,
                    'variance': 5.0,
                    'data_points': 0
                }

            prep_times = [m.prep_duration for m in metrics]

            return {
                'avg_prep_time': statistics.mean(prep_times),
                'median_prep_time': statistics.median(prep_times),
                'variance': statistics.stdev(prep_times) if len(prep_times) > 1 else 5.0,
                'min_prep_time': min(prep_times),
                'max_prep_time': max(prep_times),
                'data_points': len(metrics)
            }

    def _get_driver_profile(self, driver_id: str) -> Dict:
        """Get driver performance profile."""
        # TODO: Implement driver analytics
        return {'avg_speed': 25.0}

    def _estimate_complexity(self, order: Order) -> float:
        """Estimate order complexity (0-5)."""
        # Simple heuristic based on items
        item_count = getattr(order, 'item_count', 3)
        if item_count <= 2:
            return 1.0
        elif item_count <= 5:
            return 2.0
        else:
            return 3.0

    def _is_rush_hour(self, dt: datetime) -> bool:
        """Check if current time is rush hour."""
        hour = dt.hour
        # Lunch: 11-14, Dinner: 17-20
        return (11 <= hour <= 14) or (17 <= hour <= 20)

    def _get_traffic_factor(self, dt: datetime) -> float:
        """Get traffic multiplier."""
        hour = dt.hour
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            return 1.3  # Heavy traffic
        elif 11 <= hour <= 14:
            return 1.1  # Moderate
        else:
            return 1.0  # Light

    def _store_prediction(self, order_id: str, prediction: WAPPrediction):
        """Store prediction in order record."""

        with get_session() as session:
            order = session.query(Order).get(order_id)
            if order:
                order.prediction_data = {
                    'prep_time_min': prediction.prep_time_min,
                    'drive_time_min': prediction.drive_time_min,
                    'buffer_min': prediction.buffer_min,
                    'total_eta_min': prediction.total_eta_min,
                    'confidence': prediction.confidence,
                    'predicted_at': prediction.predicted_at.isoformat(),
                    'wap_version': prediction.wap_version
                }
                order.eta_predicted = prediction.total_eta_min
                session.commit()
