"""
Restaurant Payout Infrastructure Models
Stripe-style payout account, balance, transfer, transaction ledger
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Text, DateTime, ForeignKey, Index
from database.schemas import Base

UTC = timezone.utc

def _uuid(): return str(uuid.uuid4())
def _now(): return datetime.now(UTC)


class RestaurantPayoutAccount(Base):
    """Bank account / Stripe Connect details per restaurant."""
    __tablename__ = 'restaurant_payout_accounts'
    
    id                  = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id       = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    bank_name           = Column(String(100))
    account_last4       = Column(String(4))
    routing_number_hash = Column(String(128))  # hashed for security
    account_number_hash = Column(String(128))  # hashed for security
    stripe_connect_id   = Column(String(100))
    payout_schedule     = Column(String(20), default='weekly')  # weekly, monthly, manual
    identity_verified   = Column(Boolean, default=False)
    tax_info_provided   = Column(Boolean, default=False)
    created_at          = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at          = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)
    
    def __repr__(self):
        return f'<RestaurantPayoutAccount {self.restaurant_id} ***{self.account_last4}>'


class RestaurantBalance(Base):
    """Running balance ledger for each restaurant."""
    __tablename__ = 'restaurant_balances'
    
    id                = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id     = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    available_balance = Column(Float, default=0.0, nullable=False)
    pending_balance   = Column(Float, default=0.0, nullable=False)  # pending settlement
    lifetime_earned   = Column(Float, default=0.0, nullable=False)  # all-time earnings
    created_at        = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at        = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)
    
    def __repr__(self):
        return f'<RestaurantBalance {self.restaurant_id} avail=${self.available_balance:.2f}>'


class RestaurantPayout(Base):
    """A batch payout transfer to the restaurant bank account."""
    __tablename__ = 'restaurant_payouts'
    
    id                 = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id      = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    amount             = Column(Float, nullable=False)
    payout_status      = Column(String(20), default='pending')  # pending, processing, paid, failed
    failed_reason      = Column(Text)
    transfer_reference = Column(String(255))  # Stripe transfer ID or internal ref
    initiated_by       = Column(String(36))   # user_id who triggered the payout
    payout_method      = Column(String(20), default='bank_transfer')
    created_at         = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at         = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    __table_args__ = (
        Index('ix_restaurant_payouts_status', 'restaurant_id', 'payout_status'),
    )
    
    def __repr__(self):
        return f'<RestaurantPayout {self.id[:8]} ${self.amount:.2f} [{self.payout_status}]>'


class RestaurantTransaction(Base):
    """Complete financial ledger — every money movement recorded."""
    __tablename__ = 'restaurant_transactions'
    
    id            = Column(String(36), primary_key=True, default=_uuid)
    restaurant_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    order_id      = Column(String(36), ForeignKey('orders.id', ondelete='SET NULL'), nullable=True)
    payout_id     = Column(String(36), nullable=True)  # references restaurant_payouts.id
    amount        = Column(Float, nullable=False)
    # type: sale | commission_deduction | payout | refund_deduction | adjustment
    tx_type       = Column(String(30), nullable=False)
    description   = Column(Text)
    balance_after = Column(Float)  # snapshot of balance after this tx
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)
    
    __table_args__ = (
        Index('ix_restaurant_tx_restaurant_created', 'restaurant_id', 'created_at'),
    )
    
    def __repr__(self):
        return f'<RestaurantTransaction {self.tx_type} ${self.amount:.2f}>'
