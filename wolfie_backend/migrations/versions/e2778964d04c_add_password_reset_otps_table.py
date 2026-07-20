"""add_password_reset_otps_table

Revision ID: e2778964d04c
Revises: e1778964d04b
Create Date: 2026-07-16 18:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2778964d04c'
down_revision: Union[str, Sequence[str], None] = 'e1778964d04b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('password_reset_otps',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('user_type', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('otp_hash', sa.String(length=512), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_reset_otps_user_id'), 'password_reset_otps', ['user_id'], unique=False)
    op.create_index(op.f('ix_password_reset_otps_email'), 'password_reset_otps', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_password_reset_otps_email'), table_name='password_reset_otps')
    op.drop_index(op.f('ix_password_reset_otps_user_id'), table_name='password_reset_otps')
    op.drop_table('password_reset_otps')
