
# ══════════════════════════════════════════════════════════════════════════════
# WAP (Wolfie AI Prediction) TABLES
# ══════════════════════════════════════════════════════════════════════════════

class WAPPrediction(Base):
    """Stored prediction for each order."""
    __tablename__ = 'wap_predictions'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey('orders.id'), nullable=False, unique=True)
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)

    # Prediction components
    prep_time_min = Column(Float)
    drive_time_min = Column(Float)
    buffer_min = Column(Float)
    total_eta_min = Column(Float)
    confidence = Column(Float)  # 0.0 - 1.0

    # Breakdown (JSON)
    breakdown = Column(Text)  # JSON string

    # Metadata
    predicted_at = Column(DateTime(timezone=True))
    wap_version = Column(String(10))
    model_version = Column(String(20))

    # Relations
    order = relationship("Order", back_populates="wap_prediction")


class WAPFeedback(Base):
    """Feedback after order completion — for ML training."""
    __tablename__ = 'wap_feedback'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey('orders.id'), nullable=False)
    restaurant_id = Column(String(36), ForeignKey('users.id'))

    # Prediction vs Actual
    predicted_total = Column(Float)
    actual_total = Column(Float)
    error_min = Column(Float)
    error_percentage = Column(Float)

    # Component errors
    prep_error = Column(Float)
    drive_error = Column(Float)

    # Learning
    model_version = Column(String(20))
    learned = Column(Boolean, default=False)  # Used for retraining?

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class WAPModelMetrics(Base):
    """Track ML model performance over time."""
    __tablename__ = 'wap_model_metrics'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey('users.id'))

    # Model performance
    mae = Column(Float)  # Mean Absolute Error
    rmse = Column(Float)  # Root Mean Square Error
    mape = Column(Float)  # Mean Absolute Percentage Error
    r2_score = Column(Float)

    # Data
    training_samples = Column(Integer)
    feature_importance = Column(Text)  # JSON

    # Version
    model_version = Column(String(20))
    trained_at = Column(DateTime(timezone=True))
