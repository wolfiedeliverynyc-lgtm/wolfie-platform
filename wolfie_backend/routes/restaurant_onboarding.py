"""
Restaurant Onboarding API
Handles multi-step merchant registration flow
"""
import uuid, logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from routes.auth import require_auth, _generate_tokens
from database import transaction, get_db_session
from database.repositories import UserRepository
from models.legal_acceptance import RestaurantLegalAcceptance
from models.payout import RestaurantPayoutAccount, RestaurantBalance
from models.ai_subscription import RestaurantAISubscription, AI_PLAN_LIMITS
from models.audit_log import RestaurantAuditLog
from services.wap_service import wap_activation_service
from services.payout_engine import payout_engine

restaurant_onboarding_bp = Blueprint('restaurant_onboarding', __name__)
logger = logging.getLogger('wolfie')
UTC = timezone.utc


@restaurant_onboarding_bp.route('/register', methods=['POST'])
def register_restaurant():
    """Step 1 & 2: Register restaurant account + business details."""
    data = request.get_json(silent=True) or {}
    required = ['email', 'password', 'full_name', 'phone', 'restaurant_name']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {missing}'}), 400
    
    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.create(
                email=data['email'],
                password=data['password'],
                full_name=data['full_name'],
                phone=data['phone'],
                role='restaurant',
                extra={
                    'restaurant_name': data['restaurant_name'],
                    'cuisine_type': data.get('cuisine_type', ''),
                    'address': data.get('address', ''),
                }
            )
            tokens = _generate_tokens(user.id, user.role, current_app.config['JWT_SECRET_KEY'])
            user_id = user.id
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f'register_restaurant: {e}')
        return jsonify({'error': 'Registration failed'}), 500
    
    return jsonify({
        'message': 'Restaurant registered',
        'user_id': user_id,
        'role': 'restaurant',
        **tokens
    }), 201


@restaurant_onboarding_bp.route('/legal/accept', methods=['POST'])
@require_auth(['restaurant'])
def accept_legal():
    """Step 3: Store legal acceptance record."""
    data = request.get_json(silent=True) or {}
    
    if not all([data.get('accepted_terms'), data.get('accepted_privacy'), data.get('accepted_wap_ai_terms')]):
        return jsonify({'error': 'All three policies must be accepted'}), 400
    
    try:
        with transaction() as session:
            acceptance = RestaurantLegalAcceptance(
                id=str(uuid.uuid4()),
                restaurant_id=request.user_id,
                accepted_terms=True,
                accepted_privacy=True,
                accepted_wap_ai_terms=True,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', ''),
                policy_version=data.get('policy_version', '1.0.0'),
                accepted_at=datetime.now(UTC),
                created_at=datetime.now(UTC),
            )
            session.add(acceptance)
            
            # Audit log
            log = RestaurantAuditLog(
                id=str(uuid.uuid4()),
                restaurant_id=request.user_id,
                actor_id=request.user_id,
                actor_role='restaurant',
                action='legal_accepted',
                target_type='legal_acceptance',
                target_id=acceptance.id,
                new_values={'policy_version': acceptance.policy_version},
                ip_address=request.remote_addr,
                created_at=datetime.now(UTC),
            )
            session.add(log)
    except Exception as e:
        logger.error(f'accept_legal: {e}')
        return jsonify({'error': 'Failed to store legal acceptance'}), 500
    
    return jsonify({'message': 'Legal policies accepted', 'accepted_at': datetime.now(UTC).isoformat()}), 200


@restaurant_onboarding_bp.route('/wap/activate', methods=['POST'])
@require_auth(['restaurant'])
def activate_wap():
    """Step 4: Activate WAP AI plan."""
    data = request.get_json(silent=True) or {}
    plan = data.get('plan', 'free').lower()
    
    if plan not in AI_PLAN_LIMITS:
        return jsonify({'error': f'Invalid plan. Choose: {list(AI_PLAN_LIMITS.keys())}'}), 400
    
    try:
        with transaction() as session:
            sub = wap_activation_service.activate_plan(
                session=session,
                restaurant_id=request.user_id,
                plan=plan,
                actor_id=request.user_id,
                ip_address=request.remote_addr,
            )
            info = wap_activation_service.get_subscription_info(session, request.user_id)
    except Exception as e:
        logger.error(f'activate_wap: {e}')
        return jsonify({'error': 'Failed to activate WAP AI'}), 500
    
    return jsonify({'message': f'WAP AI {plan} plan activated', 'subscription': info}), 200


@restaurant_onboarding_bp.route('/payout/setup', methods=['POST'])
@require_auth(['restaurant'])
def setup_payout():
    """Step 5: Connect bank account and initialize balance."""
    data = request.get_json(silent=True) or {}
    required = ['bank_name', 'account_last4', 'routing_number', 'account_number']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {missing}'}), 400
    
    import hashlib
    def _hash(val): return hashlib.sha256(val.encode()).hexdigest()
    
    try:
        with transaction() as session:
            # Upsert payout account
            existing = session.query(RestaurantPayoutAccount).filter_by(
                restaurant_id=request.user_id
            ).first()
            
            now = datetime.now(UTC)
            if existing:
                existing.bank_name = data['bank_name']
                existing.account_last4 = data['account_last4'][-4:]
                existing.routing_number_hash = _hash(data['routing_number'])
                existing.account_number_hash = _hash(data['account_number'])
                existing.payout_schedule = data.get('payout_schedule', 'weekly')
                existing.identity_verified = True
                existing.updated_at = now
                account = existing
            else:
                account = RestaurantPayoutAccount(
                    id=str(uuid.uuid4()),
                    restaurant_id=request.user_id,
                    bank_name=data['bank_name'],
                    account_last4=data['account_last4'][-4:],
                    routing_number_hash=_hash(data['routing_number']),
                    account_number_hash=_hash(data['account_number']),
                    stripe_connect_id=data.get('stripe_connect_id'),
                    payout_schedule=data.get('payout_schedule', 'weekly'),
                    identity_verified=True,
                    tax_info_provided=bool(data.get('tax_id')),
                    created_at=now,
                    updated_at=now,
                )
                session.add(account)
            
            # Initialize balance record
            payout_engine.get_or_create_balance(session, request.user_id)
            
            # Audit
            log = RestaurantAuditLog(
                id=str(uuid.uuid4()),
                restaurant_id=request.user_id,
                actor_id=request.user_id,
                actor_role='restaurant',
                action='bank_account_connected',
                target_type='payout_account',
                target_id=account.id,
                new_values={'bank': data['bank_name'], 'last4': data['account_last4'][-4:]},
                ip_address=request.remote_addr,
                created_at=now,
            )
            session.add(log)
    except Exception as e:
        logger.error(f'setup_payout: {e}')
        return jsonify({'error': 'Failed to setup payout account'}), 500
    
    return jsonify({
        'message': 'Bank account connected',
        'bank_name': data['bank_name'],
        'account_last4': data['account_last4'][-4:],
        'payout_schedule': data.get('payout_schedule', 'weekly'),
        'identity_verified': True
    }), 200


@restaurant_onboarding_bp.route('/onboarding/status', methods=['GET'])
@require_auth(['restaurant'])
def onboarding_status():
    """Get current onboarding progress."""
    restaurant_id = request.user_id
    
    with get_db_session() as session:
        # Check each step
        user_repo = UserRepository(session)
        user = user_repo.get(restaurant_id)
        
        has_legal = session.query(RestaurantLegalAcceptance).filter_by(
            restaurant_id=restaurant_id
        ).first() is not None
        
        ai_sub = session.query(RestaurantAISubscription).filter_by(
            restaurant_id=restaurant_id
        ).first()
        has_ai = ai_sub is not None
        
        has_payout = session.query(RestaurantPayoutAccount).filter_by(
            restaurant_id=restaurant_id
        ).first() is not None
        
        steps = [
            {'step': 1, 'name': 'business_info', 'label': 'Business Information', 'completed': bool(user and user.restaurant_name)},
            {'step': 2, 'name': 'restaurant_details', 'label': 'Restaurant Details', 'completed': bool(user and user.restaurant_name)},
            {'step': 3, 'name': 'legal_acceptance', 'label': 'Legal Acceptance', 'completed': has_legal},
            {'step': 4, 'name': 'wap_activation', 'label': 'WAP AI Activation', 'completed': has_ai},
            {'step': 5, 'name': 'payout_setup', 'label': 'Payout Setup', 'completed': has_payout},
            {'step': 6, 'name': 'complete', 'label': 'Complete', 'completed': all([bool(user and user.restaurant_name), has_legal, has_ai, has_payout])},
        ]
        
        completed_count = sum(1 for s in steps if s['completed'])
        next_step = next((s for s in steps if not s['completed']), steps[-1])
        
        return jsonify({
            'restaurant_id': restaurant_id,
            'onboarding_complete': completed_count == len(steps),
            'completed_steps': completed_count,
            'total_steps': len(steps),
            'steps': steps,
            'next_step': next_step,
            'ai_plan': ai_sub.ai_plan if ai_sub else 'none',
        }), 200
