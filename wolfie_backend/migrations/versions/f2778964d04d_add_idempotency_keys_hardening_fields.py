"""add_idempotency_keys_hardening_fields

Revision ID: f2778964d04d
Revises: e2778964d04c
Create Date: 2026-08-07 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2778964d04d'
down_revision: Union[str, Sequence[str], None] = 'e2778964d04c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table('idempotency_keys', schema=None) as batch_op:
        batch_op.add_column(sa.Column('customer_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('route', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('request_hash', sa.String(length=64), nullable=True))
        batch_op.create_index('ix_idempotency_keys_customer_id', ['customer_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('idempotency_keys', schema=None) as batch_op:
        batch_op.drop_index('ix_idempotency_keys_customer_id')
        batch_op.drop_column('request_hash')
        batch_op.drop_column('route')
        batch_op.drop_column('customer_id')
