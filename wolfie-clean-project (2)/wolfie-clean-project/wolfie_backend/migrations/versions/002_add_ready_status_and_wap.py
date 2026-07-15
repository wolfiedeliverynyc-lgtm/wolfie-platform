"""add_ready_status_and_wap

Revision ID: 002
Revises: 001
Create Date: 2026-05-17 20:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add "ready" to order_status ENUM
    # PostgreSQL requires COMMIT before ALTER TYPE
    if op.get_context().dialect.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready' AFTER 'preparing'")

    # 2. Add new columns to orders
    op.add_column('orders', sa.Column('prediction_data', sa.JSON(), nullable=True))
    op.add_column('orders', sa.Column('eta_predicted', sa.Float(), nullable=True))

    # 3. Create WAP tables
    op.create_table('wap_predictions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('order_id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('prep_time_min', sa.Float(), nullable=True),
        sa.Column('drive_time_min', sa.Float(), nullable=True),
        sa.Column('buffer_min', sa.Float(), nullable=True),
        sa.Column('total_eta_min', sa.Float(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('breakdown', sa.Text(), nullable=True),
        sa.Column('predicted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('wap_version', sa.String(length=10), nullable=True),
        sa.Column('model_version', sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['restaurant_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_id')
    )
    
    op.create_table('wap_feedback',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('order_id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=True),
        sa.Column('predicted_total', sa.Float(), nullable=True),
        sa.Column('actual_total', sa.Float(), nullable=True),
        sa.Column('error_min', sa.Float(), nullable=True),
        sa.Column('error_percentage', sa.Float(), nullable=True),
        sa.Column('prep_error', sa.Float(), nullable=True),
        sa.Column('drive_error', sa.Float(), nullable=True),
        sa.Column('model_version', sa.String(length=20), nullable=True),
        sa.Column('learned', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['restaurant_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('wap_model_metrics',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=True),
        sa.Column('mae', sa.Float(), nullable=True),
        sa.Column('rmse', sa.Float(), nullable=True),
        sa.Column('mape', sa.Float(), nullable=True),
        sa.Column('r2_score', sa.Float(), nullable=True),
        sa.Column('training_samples', sa.Integer(), nullable=True),
        sa.Column('feature_importance', sa.Text(), nullable=True),
        sa.Column('model_version', sa.String(length=20), nullable=True),
        sa.Column('trained_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Create Sync Agent tables
    op.create_table('sync_agents',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('device_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('device_name', sa.String(length=100), nullable=True),
        sa.Column('pos_type', sa.String(length=20), nullable=True),
        sa.Column('pos_version', sa.String(length=20), nullable=True),
        sa.Column('agent_version', sa.String(length=10), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('installed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_heartbeat', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('port', sa.Integer(), nullable=True),
        sa.Column('total_orders_synced', sa.Integer(), nullable=True),
        sa.Column('total_errors', sa.Integer(), nullable=True),
        sa.Column('uptime_percentage', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_fingerprint'),
        sa.UniqueConstraint('restaurant_id')
    )
    
    op.create_table('kitchen_metrics',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('agent_id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('order_id', sa.String(length=36), nullable=True),
        sa.Column('pos_received_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('kitchen_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('kitchen_ready_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('driver_assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('driver_arrived_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('handoff_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('queue_duration', sa.Float(), nullable=True),
        sa.Column('prep_duration', sa.Float(), nullable=True),
        sa.Column('wait_for_driver', sa.Float(), nullable=True),
        sa.Column('total_kitchen_time', sa.Float(), nullable=True),
        sa.Column('total_items', sa.Integer(), nullable=True),
        sa.Column('complex_items', sa.Integer(), nullable=True),
        sa.Column('rush_hour', sa.Boolean(), nullable=True),
        sa.Column('day_of_week', sa.Integer(), nullable=True),
        sa.Column('hour_of_day', sa.Integer(), nullable=True),
        sa.Column('predicted_prep_time', sa.Float(), nullable=True),
        sa.Column('actual_prep_time', sa.Float(), nullable=True),
        sa.Column('prediction_error', sa.Float(), nullable=True),
        sa.Column('raw_pos_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['sync_agents.id'], ),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['restaurant_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('restaurant_scores',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('speed_score', sa.Float(), nullable=True),
        sa.Column('accuracy_score', sa.Float(), nullable=True),
        sa.Column('consistency_score', sa.Float(), nullable=True),
        sa.Column('reliability_score', sa.Float(), nullable=True),
        sa.Column('customer_satisfaction', sa.Float(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('tier', sa.String(length=20), nullable=True),
        sa.Column('data_points', sa.Integer(), nullable=True),
        sa.Column('calculation_window_days', sa.Integer(), nullable=True),
        sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('previous_score', sa.Float(), nullable=True),
        sa.Column('trend_direction', sa.String(length=10), nullable=True),
        sa.Column('trend_percentage', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('score_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('speed_score', sa.Float(), nullable=True),
        sa.Column('accuracy_score', sa.Float(), nullable=True),
        sa.Column('consistency_score', sa.Float(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('orders_count', sa.Integer(), nullable=True),
        sa.Column('avg_prep_time', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('restaurant_id', 'date', name='unique_daily_score')
    )


def downgrade():
    op.drop_table('score_history')
    op.drop_table('restaurant_scores')
    op.drop_table('kitchen_metrics')
    op.drop_table('sync_agents')
    op.drop_table('wap_model_metrics')
    op.drop_table('wap_feedback')
    op.drop_table('wap_predictions')
    
    op.drop_column('orders', 'eta_predicted')
    op.drop_column('orders', 'prediction_data')
    
    # Note: Removing enum values in postgres is tricky, so it's usually skipped
    pass
