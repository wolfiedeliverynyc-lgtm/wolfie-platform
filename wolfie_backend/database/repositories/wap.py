from database.schemas import WAPPrediction, WAPFeedback, WAPModelMetrics
from database.repositories.base import BaseRepository

class WAPPredictionRepository(BaseRepository[WAPPrediction]):
    model = WAPPrediction

class WAPFeedbackRepository(BaseRepository[WAPFeedback]):
    model = WAPFeedback

class WAPModelMetricsRepository(BaseRepository[WAPModelMetrics]):
    model = WAPModelMetrics
