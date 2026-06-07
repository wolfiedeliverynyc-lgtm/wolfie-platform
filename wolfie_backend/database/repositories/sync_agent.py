from datetime import datetime
from database.schemas import SyncAgent, KitchenMetric, RestaurantScore, ScoreHistory
from database.repositories.base import BaseRepository

class SyncAgentRepository(BaseRepository[SyncAgent]):
    model = SyncAgent

class KitchenMetricRepository(BaseRepository[KitchenMetric]):
    model = KitchenMetric

    def find_by_order(self, order_id: str) -> KitchenMetric | None:
        return self.find_by(order_id=order_id)

    def upsert_event(self, agent_id: str, restaurant_id: str, order_id: str, event_type: str, 
                     timestamp: datetime, **kwargs) -> KitchenMetric:
        metric = self.find_by(order_id=order_id)
        if not metric:
            metric = KitchenMetric(agent_id=agent_id, restaurant_id=restaurant_id, order_id=order_id)
            self.add(metric)
        
        # Update timestamps based on event_type
        if event_type == "received":
            metric.pos_received_at = timestamp
        elif event_type == "started":
            metric.kitchen_started_at = timestamp
        elif event_type == "ready":
            metric.kitchen_ready_at = timestamp
        elif event_type == "driver_assigned":
            metric.driver_assigned_at = timestamp
        elif event_type == "driver_arrived":
            metric.driver_arrived_at = timestamp
        elif event_type == "handoff":
            metric.handoff_at = timestamp
            
        for k, v in kwargs.items():
            if hasattr(metric, k) and v is not None:
                setattr(metric, k, v)
                
        self.session.flush()
        return metric

class RestaurantScoreRepository(BaseRepository[RestaurantScore]):
    model = RestaurantScore

class ScoreHistoryRepository(BaseRepository[ScoreHistory]):
    model = ScoreHistory
