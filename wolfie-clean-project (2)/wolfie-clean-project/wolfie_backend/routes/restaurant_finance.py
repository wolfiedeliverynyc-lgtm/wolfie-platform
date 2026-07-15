"""
Restaurant Finance & Payout APIs
Balance, transactions, payout requests, bank updates
"""
import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import transaction, get_db_session
from models.payout import RestaurantBalance, RestaurantPayout, RestaurantTransaction, RestaurantPayoutAccount
from models.ai_subscription import RestaurantAISubscription
from services.payout_engine import payout_engine
from services.wap_service import wap_activation_service

restaurant_finance_bp = Blueprint('restaurant_finance', __name__)
logger = logging.getLogger('wolfie')
UTC = timezone.utc


@restaurant_finance_bp.route('/balance', methods=['GET'])
@require_auth(['restaurant'])
def get_balance():
    """GET /api/v1/restaurants/balance"""
    with get_db_session() as session:
        summary = payout_engine.get_balance_summary(session, request.user_id)
        return jsonify(summary), 200


@restaurant_finance_bp.route('/payouts', methods=['GET'])
@require_auth(['restaurant'])
def list_payouts():
    """GET /api/v1/restaurants/payouts — list payout history"""
    limit = int(request.args.get('limit', 20))
    offset = int(request.args.get('offset', 0))
    
    with get_db_session() as session:
        payouts = session.query(RestaurantPayout).filter_by(
            restaurant_id=request.user_id
        ).order_by(RestaurantPayout.created_at.desc()).limit(limit).offset(offset).all()
        
        return jsonify({
            'payouts': [{
                'id': p.id,
                'amount': p.amount,
                'payout_status': p.payout_status,
                'transfer_reference': p.transfer_reference,
                'failed_reason': p.failed_reason,
                'created_at': p.created_at.isoformat(),
                'updated_at': p.updated_at.isoformat(),
            } for p in payouts],
            'count': len(payouts),
        }), 200


@restaurant_finance_bp.route('/transactions', methods=['GET'])
@require_auth(['restaurant'])
def list_transactions():
    """GET /api/v1/restaurants/transactions — ledger"""
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    tx_type = request.args.get('type')  # optional filter
    
    with get_db_session() as session:
        q = session.query(RestaurantTransaction).filter_by(restaurant_id=request.user_id)
        if tx_type:
            q = q.filter_by(tx_type=tx_type)
        txs = q.order_by(RestaurantTransaction.created_at.desc()).limit(limit).offset(offset).all()
        
        # Weekly earnings summary
        week_start = datetime.now(UTC) - timedelta(days=7)
        weekly = session.query(RestaurantTransaction).filter(
            RestaurantTransaction.restaurant_id == request.user_id,
            RestaurantTransaction.tx_type == 'sale',
            RestaurantTransaction.created_at >= week_start
        ).all()
        weekly_earnings = round(sum(t.amount for t in weekly), 2)
        
        # Monthly earnings
        month_start = datetime.now(UTC) - timedelta(days=30)
        monthly = session.query(RestaurantTransaction).filter(
            RestaurantTransaction.restaurant_id == request.user_id,
            RestaurantTransaction.tx_type == 'sale',
            RestaurantTransaction.created_at >= month_start
        ).all()
        monthly_earnings = round(sum(t.amount for t in monthly), 2)
        
        return jsonify({
            'transactions': [{
                'id': t.id,
                'amount': t.amount,
                'tx_type': t.tx_type,
                'description': t.description,
                'order_id': t.order_id,
                'balance_after': t.balance_after,
                'created_at': t.created_at.isoformat(),
            } for t in txs],
            'count': len(txs),
            'weekly_earnings': weekly_earnings,
            'monthly_earnings': monthly_earnings,
        }), 200


@restaurant_finance_bp.route('/payouts/request', methods=['POST'])
@require_auth(['restaurant'])
def request_payout():
    """POST /api/v1/restaurants/payouts/request — manual payout"""
    data = request.get_json(silent=True) or {}
    amount = data.get('amount')
    
    with get_db_session() as session:
        # Check bank connected
        account = session.query(RestaurantPayoutAccount).filter_by(
            restaurant_id=request.user_id
        ).first()
        if not account:
            return jsonify({'error': 'No bank account connected. Please setup payout first.'}), 400
    
    try:
        with transaction() as session:
            balance = payout_engine.get_or_create_balance(session, request.user_id)
            
            # If no amount specified, use full available balance
            payout_amount = float(amount) if amount else balance.available_balance
            
            if payout_amount <= 0:
                return jsonify({'error': 'No available balance to payout'}), 400
            
            payout = payout_engine.create_payout(
                session=session,
                restaurant_id=request.user_id,
                amount=payout_amount,
                actor_id=request.user_id,
                ip_address=request.remote_addr,
            )
            
            return jsonify({
                'message': 'Payout initiated successfully',
                'payout_id': payout.id,
                'amount': payout.amount,
                'transfer_reference': payout.transfer_reference,
                'payout_status': payout.payout_status,
                'estimated_arrival': '1-3 business days',
            }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f'request_payout: {e}')
        return jsonify({'error': 'Payout request failed'}), 500


@restaurant_finance_bp.route('/bank-account', methods=['POST'])
@require_auth(['restaurant'])
def update_bank_account():
    """POST /api/v1/restaurants/bank-account — update bank details"""
    data = request.get_json(silent=True) or {}
    
    import uuid, hashlib
    def _hash(val): return hashlib.sha256(val.encode()).hexdigest()
    
    try:
        with transaction() as session:
            now = datetime.now(UTC)
            account = session.query(RestaurantPayoutAccount).filter_by(
                restaurant_id=request.user_id
            ).first()
            
            if account:
                if data.get('bank_name'):       account.bank_name = data['bank_name']
                if data.get('account_last4'):   account.account_last4 = data['account_last4'][-4:]
                if data.get('routing_number'):  account.routing_number_hash = _hash(data['routing_number'])
                if data.get('account_number'):  account.account_number_hash = _hash(data['account_number'])
                if data.get('payout_schedule'): account.payout_schedule = data['payout_schedule']
                account.updated_at = now
            else:
                required = ['bank_name', 'account_last4', 'routing_number', 'account_number']
                missing = [f for f in required if not data.get(f)]
                if missing:
                    return jsonify({'error': f'Missing: {missing}'}), 400
                
                account = RestaurantPayoutAccount(
                    id=str(uuid.uuid4()),
                    restaurant_id=request.user_id,
                    bank_name=data['bank_name'],
                    account_last4=data['account_last4'][-4:],
                    routing_number_hash=_hash(data['routing_number']),
                    account_number_hash=_hash(data['account_number']),
                    payout_schedule=data.get('payout_schedule', 'weekly'),
                    identity_verified=True,
                    created_at=now,
                    updated_at=now,
                )
                session.add(account)
        
        return jsonify({'message': 'Bank account updated', 'account_last4': account.account_last4}), 200
    except Exception as e:
        logger.error(f'update_bank_account: {e}')
        return jsonify({'error': 'Failed to update bank account'}), 500


@restaurant_finance_bp.route('/ai/subscription', methods=['GET'])
@require_auth(['restaurant'])
def get_ai_subscription():
    """GET /api/v1/restaurants/ai/subscription"""
    with get_db_session() as session:
        info = wap_activation_service.get_subscription_info(session, request.user_id)
        return jsonify(info), 200


@restaurant_finance_bp.route('/ai/upgrade', methods=['POST'])
@require_auth(['restaurant'])
def upgrade_ai_plan():
    """POST /api/v1/restaurants/ai/upgrade — change AI plan"""
    data = request.get_json(silent=True) or {}
    plan = data.get('plan', 'free').lower()
    
    try:
        with transaction() as session:
            wap_activation_service.activate_plan(
                session=session,
                restaurant_id=request.user_id,
                plan=plan,
                actor_id=request.user_id,
                ip_address=request.remote_addr,
            )
            info = wap_activation_service.get_subscription_info(session, request.user_id)
        return jsonify({'message': f'Plan upgraded to {plan}', 'subscription': info}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f'upgrade_ai_plan: {e}')
        return jsonify({'error': 'Failed to upgrade AI plan'}), 500
