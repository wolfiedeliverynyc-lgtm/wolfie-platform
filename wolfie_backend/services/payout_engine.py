"""
Restaurant Financial Engine (Payout Engine)
Handles all money movements: sales crediting, payout transfers, refund deductions.
"""
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import transaction, get_db_session
from models.payout import RestaurantBalance, RestaurantPayout, RestaurantTransaction, RestaurantPayoutAccount
from models.audit_log import RestaurantAuditLog

logger = logging.getLogger('wolfie.payout_engine')
UTC = timezone.utc

WOLFIE_COMMISSION_RATE = 0.18  # 18% platform fee default


class PayoutEngine:
    """Core financial ledger engine for restaurant payouts."""
    
    def get_or_create_balance(self, session: Session, restaurant_id: str) -> RestaurantBalance:
        """Get or initialise a restaurant balance record."""
        balance = session.query(RestaurantBalance).filter_by(restaurant_id=restaurant_id).first()
        if not balance:
            now = datetime.now(UTC)
            balance = RestaurantBalance(
                id=str(uuid.uuid4()),
                restaurant_id=restaurant_id,
                available_balance=0.0,
                pending_balance=0.0,
                lifetime_earned=0.0,
                created_at=now,
                updated_at=now,
            )
            session.add(balance)
        return balance
    
    def credit_sale(self, session: Session, restaurant_id: str,
                    order_id: str, gross_amount: float,
                    commission_rate: float = None) -> dict:
        """Credit restaurant after an order is delivered. Goes to pending first."""
        rate = commission_rate if commission_rate is not None else WOLFIE_COMMISSION_RATE
        commission = round(gross_amount * rate, 2)
        net = round(gross_amount - commission, 2)
        
        balance = self.get_or_create_balance(session, restaurant_id)
        balance.pending_balance = round(balance.pending_balance + net, 2)
        balance.lifetime_earned = round(balance.lifetime_earned + net, 2)
        balance.updated_at = datetime.now(UTC)
        
        # Log commission deduction
        self._write_tx(session, restaurant_id, order_id=order_id,
                       amount=-commission, tx_type='commission_deduction',
                       description=f'Platform commission ({rate*100:.0f}%) on order {order_id}',
                       balance_after=balance.pending_balance + balance.available_balance)
        
        # Log sale credit
        self._write_tx(session, restaurant_id, order_id=order_id,
                       amount=net, tx_type='sale',
                       description=f'Sale credited for order {order_id}',
                       balance_after=balance.pending_balance + balance.available_balance)
        
        logger.info(f'Sale credited: restaurant={restaurant_id} gross=${gross_amount} net=${net} commission=${commission}')
        return {'gross': gross_amount, 'commission': commission, 'net': net, 'pending_balance': balance.pending_balance}
    
    def settle_pending(self, session: Session, restaurant_id: str) -> float:
        """Move pending balance to available (call on settlement schedule)."""
        balance = self.get_or_create_balance(session, restaurant_id)
        amount = balance.pending_balance
        
        if amount <= 0:
            return 0.0
        
        balance.available_balance = round(balance.available_balance + amount, 2)
        balance.pending_balance = 0.0
        balance.updated_at = datetime.now(UTC)
        
        self._write_tx(session, restaurant_id,
                       amount=amount, tx_type='settlement',
                       description='Pending balance settled to available',
                       balance_after=balance.available_balance)
        
        return amount
    
    def create_payout(self, session: Session, restaurant_id: str,
                      amount: float, actor_id: str = None,
                      ip_address: str = None) -> RestaurantPayout:
        """Request a payout transfer from available balance."""
        balance = self.get_or_create_balance(session, restaurant_id)
        
        if amount <= 0:
            raise ValueError('Payout amount must be greater than 0')
        
        if balance.available_balance < amount:
            raise ValueError(f'Insufficient balance. Available: ${balance.available_balance:.2f}')
        
        # Debit available balance
        balance.available_balance = round(balance.available_balance - amount, 2)
        balance.updated_at = datetime.now(UTC)
        
        # Create payout record
        now = datetime.now(UTC)
        payout = RestaurantPayout(
            id=str(uuid.uuid4()),
            restaurant_id=restaurant_id,
            amount=round(amount, 2),
            payout_status='processing',
            transfer_reference=f'WLF-{str(uuid.uuid4())[:8].upper()}',
            initiated_by=actor_id,
            created_at=now,
            updated_at=now,
        )
        session.add(payout)
        
        # Transaction log
        self._write_tx(session, restaurant_id, payout_id=payout.id,
                       amount=-amount, tx_type='payout',
                       description=f'Payout transfer {payout.transfer_reference}',
                       balance_after=balance.available_balance)
        
        # Audit
        self._audit(session, restaurant_id, actor_id, 'payout_created',
                    'payout', payout.id,
                    new_values={'amount': amount, 'ref': payout.transfer_reference},
                    ip_address=ip_address)
        
        logger.info(f'Payout created: restaurant={restaurant_id} amount=${amount} ref={payout.transfer_reference}')
        return payout
    
    def deduct_refund(self, session: Session, restaurant_id: str,
                      order_id: str, refund_amount: float) -> dict:
        """Deduct refund from restaurant balance."""
        balance = self.get_or_create_balance(session, restaurant_id)
        
        # Try available first, then pending
        if balance.available_balance >= refund_amount:
            balance.available_balance = round(balance.available_balance - refund_amount, 2)
        elif balance.pending_balance >= refund_amount:
            balance.pending_balance = round(balance.pending_balance - refund_amount, 2)
        else:
            # Deduct from both (negative balance possible on refunds)
            balance.available_balance = round(balance.available_balance - refund_amount, 2)
        
        balance.updated_at = datetime.now(UTC)
        
        self._write_tx(session, restaurant_id, order_id=order_id,
                       amount=-refund_amount, tx_type='refund_deduction',
                       description=f'Refund deduction for order {order_id}',
                       balance_after=balance.available_balance + balance.pending_balance)
        
        logger.info(f'Refund deducted: restaurant={restaurant_id} amount=${refund_amount} order={order_id}')
        return {'deducted': refund_amount, 'available_balance': balance.available_balance}
    
    def get_balance_summary(self, session: Session, restaurant_id: str) -> dict:
        balance = self.get_or_create_balance(session, restaurant_id)
        account = session.query(RestaurantPayoutAccount).filter_by(restaurant_id=restaurant_id).first()
        return {
            'available_balance': balance.available_balance,
            'pending_balance': balance.pending_balance,
            'lifetime_earned': balance.lifetime_earned,
            'total_balance': round(balance.available_balance + balance.pending_balance, 2),
            'bank_connected': account is not None,
            'payout_schedule': account.payout_schedule if account else None,
            'bank_last4': account.account_last4 if account else None,
        }
    
    def _write_tx(self, session: Session, restaurant_id: str,
                  amount: float, tx_type: str, description: str,
                  order_id: str = None, payout_id: str = None,
                  balance_after: float = None):
        tx = RestaurantTransaction(
            id=str(uuid.uuid4()),
            restaurant_id=restaurant_id,
            order_id=order_id,
            payout_id=payout_id,
            amount=round(amount, 2),
            tx_type=tx_type,
            description=description,
            balance_after=round(balance_after, 2) if balance_after is not None else None,
            created_at=datetime.now(UTC),
        )
        session.add(tx)
    
    def _audit(self, session, restaurant_id, actor_id, action,
               target_type, target_id, old_values=None, new_values=None, ip_address=None):
        log = RestaurantAuditLog(
            id=str(uuid.uuid4()),
            restaurant_id=restaurant_id,
            actor_id=actor_id or restaurant_id,
            actor_role='restaurant',
            action=action,
            target_type=target_type,
            target_id=target_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            created_at=datetime.now(UTC),
        )
        session.add(log)


# Singleton
payout_engine = PayoutEngine()
