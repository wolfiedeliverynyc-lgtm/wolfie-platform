
# ══════════════════════════════════════════════════════════════════════════════
# SYNC AGENT TABLES
# ══════════════════════════════════════════════════════════════════════════════

class SyncAgent(Base):
    """Wolfie Sync Agent installed in restaurant."""
    __tablename__ = 'sync_agents'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False, unique=True)
    device_fingerprint = Column(String(64), nullable=False, unique=True)
    device_name = Column(String(100))
    pos_type = Column(String(20))  # square, toast, clover, lightspeed, custom
    pos_version = Column(String(20))
    agent_version = Column(String(10), default='1.0.0')

    # Status
    status = Column(String(20), default='pending')  # pending, active, offline, error, suspended
    installed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_heartbeat = Column(DateTime(timezone=True))
    last_sync_at = Column(DateTime(timezone=True))

    # Connection
    ip_address = Column(String(45))
    port = Column(Integer, default=8080)

    # Metrics
    total_orders_synced = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)
    uptime_percentage = Column(Float, default=0.0)

    # Relations
    restaurant = relationship("User", back_populates="sync_agent")
    metrics = relationship("KitchenMetric", back_populates="agent", cascade="all, delete-orphan")

    def is_online(self):
        if not self.last_heartbeat:
            return False
        return (datetime.now(timezone.utc) - self.last_heartbeat).total_seconds() < 300  # 5 min


class KitchenMetric(Base):
    """Raw kitchen timing data from Sync Agent."""
    __tablename__ = 'kitchen_metrics'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(36), ForeignKey('sync_agents.id'), nullable=False)
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    order_id = Column(String(36), ForeignKey('orders.id'))

    # Timestamps (all UTC)
    pos_received_at = Column(DateTime(timezone=True))      # POS received order
    kitchen_started_at = Column(DateTime(timezone=True))   # Chef started
    kitchen_ready_at = Column(DateTime(timezone=True))     # Food ready
    driver_assigned_at = Column(DateTime(timezone=True))   # Driver matched
    driver_arrived_at = Column(DateTime(timezone=True))    # Driver at restaurant
    handoff_at = Column(DateTime(timezone=True))           # Food given to driver

    # Durations (minutes)
    queue_duration = Column(Float)      # received → started
    prep_duration = Column(Float)       # started → ready
    wait_for_driver = Column(Float)     # ready → handoff
    total_kitchen_time = Column(Float)  # received → handoff

    # Context
    total_items = Column(Integer, default=0)
    complex_items = Column(Integer, default=0)  # items needing grill/fry
    rush_hour = Column(Boolean, default=False)  # peak time?
    day_of_week = Column(Integer)  # 0=Monday
    hour_of_day = Column(Integer)

    # Prediction vs Reality
    predicted_prep_time = Column(Float)
    actual_prep_time = Column(Float)
    prediction_error = Column(Float)  # positive = slower than expected

    # Raw data (for debugging)
    raw_pos_data = Column(Text)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relations
    agent = relationship("SyncAgent", back_populates="metrics")
    restaurant = relationship("User", back_populates="kitchen_metrics")
    order = relationship("Order", back_populates="kitchen_metric")


class RestaurantScore(Base):
    """Calculated score for restaurant performance."""
    __tablename__ = 'restaurant_scores'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)

    # Component Scores (0-100)
    speed_score = Column(Float, default=0.0)       # How fast they prep
    accuracy_score = Column(Float, default=0.0)    # ETA prediction accuracy
    consistency_score = Column(Float, default=0.0) # Low variance = consistent
    reliability_score = Column(Float, default=0.0) # Uptime, error rate
    customer_satisfaction = Column(Float, default=0.0)  # From ratings

    # Overall
    overall_score = Column(Float, default=0.0)
    tier = Column(String(20), default='unranked')  # unranked, bronze, silver, gold, wolfie_pro

    # Metadata
    data_points = Column(Integer, default=0)  # Orders analyzed
    calculation_window_days = Column(Integer, default=7)
    calculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Trend
    previous_score = Column(Float)
    trend_direction = Column(String(10))  # up, down, stable
    trend_percentage = Column(Float)

    # Relations
    restaurant = relationship("User", back_populates="scores")


class ScoreHistory(Base):
    """Daily score snapshots for trend analysis."""
    __tablename__ = 'score_history'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    date = Column(Date, nullable=False)

    speed_score = Column(Float)
    accuracy_score = Column(Float)
    consistency_score = Column(Float)
    overall_score = Column(Float)

    orders_count = Column(Integer)
    avg_prep_time = Column(Float)

    __table_args__ = (UniqueConstraint('restaurant_id', 'date', name='unique_daily_score'),)
