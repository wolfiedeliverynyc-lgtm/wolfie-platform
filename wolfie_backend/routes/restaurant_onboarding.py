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


def _send_registration_email(email: str, restaurant_name: str):
    """Send a welcome / under-review notification to a newly registered restaurant."""
    try:
        api_key = __import__('os').getenv("RESEND_API_KEY")
        from_email = __import__('os').getenv("EMAIL_FROM", "noreply@wolfie.delivery")
        html = f"""
        <!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{{margin:0;padding:0;background:#F6F6F6;font-family:'Helvetica Neue',sans-serif;}}
          .wrap{{max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);}}
          .hdr{{background:#080808;padding:32px;text-align:center;color:#fff;}}
          .hdr h1{{margin:0;font-size:22px;font-weight:900;letter-spacing:3px;}}
          .hdr span{{color:#FFE100;}}
          .body{{padding:40px;color:#333;line-height:1.7;}}
          .badge{{background:#FFF8D6;border:1px solid #FFE100;border-radius:12px;padding:18px 24px;margin:24px 0;text-align:center;}}
          .badge p{{margin:0;font-size:15px;font-weight:700;color:#333;}}
          .badge small{{color:#888;font-size:12px;}}
          .ftr{{background:#F8F9FA;padding:20px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;}}
        </style></head><body>
        <div class="wrap">
          <div class="hdr"><h1>WOLFIE <span>OS</span></h1>
            <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#FFE100;font-weight:700;">Restaurant Partner Portal</p>
          </div>
          <div class="body">
            <p style="font-size:16px;font-weight:700;">مرحباً بك في Wolfie! 🐺</p>
            <p>تم استلام طلب انضمام مطعم <strong>{restaurant_name}</strong> بنجاح.</p>
            <div class="badge">
              <p>🕐 حسابك قيد المراجعة</p>
              <small>سيقوم فريقنا بمراجعة مستنداتك خلال 24-48 ساعة عمل وإشعارك بالقرار عبر البريد الإلكتروني.</small>
            </div>
            <p style="font-size:13px;color:#666;">إذا كان لديك أي استفسار، يرجى التواصل معنا على <a href="mailto:partners@wolfie.delivery" style="color:#FFE100;">partners@wolfie.delivery</a></p>
          </div>
          <div class="ftr">Wolfie Inc. © 2026 · Secured with 256-bit encryption</div>
        </div></body></html>"""
        mock = not api_key or api_key.startswith("your_") or api_key == "mock"
        if mock:
            logger.info(f"[MOCK EMAIL] Registration confirmation sent to {email} for {restaurant_name}")
            return
        import requests as req
        req.post("https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": f"Wolfie Restaurant OS <{from_email}>", "to": [email],
                  "subject": f"تم استلام طلب انضمام {restaurant_name} — Wolfie OS", "html": html},
            timeout=10)
    except Exception as e:
        logger.warning(f"_send_registration_email failed: {e}")


def _send_kyc_decision_email(email: str, restaurant_name: str, approved: bool, reason: str = ""):
    """Send KYC approval or rejection email to restaurant."""
    try:
        api_key = __import__('os').getenv("RESEND_API_KEY")
        from_email = __import__('os').getenv("EMAIL_FROM", "noreply@wolfie.delivery")
        if approved:
            status_ar = "✅ تمت الموافقة على حسابك!"
            color = "#22c55e"
            msg_ar = "يسعدنا إعلامك بأن طلب انضمامك تمت الموافقة عليه. يمكنك الآن تسجيل الدخول والبدء في استقبال الطلبات."
            action = f'<a href="https://restaurant.wolfie.delivery/login" style="display:inline-block;margin-top:16px;padding:14px 32px;background:#FFE100;color:#000;font-weight:900;border-radius:12px;text-decoration:none;font-size:13px;letter-spacing:1px;">ادخل إلى لوحة التحكم</a>'
            status_en = "Your account has been approved"
        else:
            status_ar = "❌ تعذّر قبول طلبك"
            color = "#EF2A39"
            reason_html = f'<div style="background:#FFF0F0;border:1px solid #EF2A39;border-radius:10px;padding:16px;margin:16px 0;"><strong>السبب:</strong> {reason or "المستندات المقدمة غير مكتملة أو غير واضحة."}</div>'
            msg_ar = f"نأسف لإعلامك بأنه لم يتم قبول طلب انضمام مطعمك في الوقت الحالي. {reason_html} يمكنك إعادة التقديم بعد تصحيح المشكلة."
            action = f'<a href="https://restaurant.wolfie.delivery/register" style="display:inline-block;margin-top:16px;padding:14px 32px;background:#EF2A39;color:#fff;font-weight:900;border-radius:12px;text-decoration:none;font-size:13px;letter-spacing:1px;">إعادة التقديم</a>'
            status_en = "Your application was not approved"

        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{{margin:0;padding:0;background:#F6F6F6;font-family:'Helvetica Neue',sans-serif;}}
          .wrap{{max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);}}
          .hdr{{background:#080808;padding:32px;text-align:center;color:#fff;}}
          .body{{padding:40px;color:#333;line-height:1.7;}}
          .ftr{{background:#F8F9FA;padding:20px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;}}
        </style></head><body>
        <div class="wrap">
          <div class="hdr">
            <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:3px;color:#fff;">WOLFIE <span style="color:#FFE100;">OS</span></h1>
            <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#FFE100;font-weight:700;">Restaurant Partner Portal</p>
          </div>
          <div class="body">
            <p style="font-size:20px;font-weight:900;color:{color};">{status_ar}</p>
            <p>مطعم: <strong>{restaurant_name}</strong></p>
            <p>{msg_ar}</p>
            <div style="text-align:center;">{action}</div>
          </div>
          <div class="ftr">Wolfie Inc. © 2026 · {status_en}</div>
        </div></body></html>"""

        mock = not api_key or api_key.startswith("your_") or api_key == "mock"
        if mock:
            logger.info(f"[MOCK EMAIL] KYC {'approved' if approved else 'rejected'} email to {email}")
            return
        import requests as req
        subj = f"{'تمت الموافقة على' if approved else 'رفض طلب'} {restaurant_name} — Wolfie OS"
        req.post("https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": f"Wolfie Restaurant OS <{from_email}>", "to": [email],
                  "subject": subj, "html": html},
            timeout=10)
    except Exception as e:
        logger.warning(f"_send_kyc_decision_email failed: {e}")


@restaurant_onboarding_bp.route('/register', methods=['POST'])
def register_restaurant():
    """Step 1: Register restaurant account + basic business details."""
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
                    'menu_management_type': data.get('menu_management_type', ''),
                    'estimated_menu_items': data.get('estimated_menu_items', ''),
                }
            )
            tokens = _generate_tokens(user.id, user.role, current_app.config['JWT_SECRET_KEY'])
            user_id = user.id
            user_email = user.email
            restaurant_name = data['restaurant_name']
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f'register_restaurant: {e}')
        return jsonify({'error': 'Registration failed'}), 500
    
    try:
        _send_registration_email(user_email, restaurant_name)
    except Exception:
        pass
    
    return jsonify({
        'message': 'Restaurant registered',
        'user_id': user_id,
        'role': 'restaurant',
        **tokens
    }), 201


@restaurant_onboarding_bp.route('/kyc/upload', methods=['POST'])
@require_auth(['restaurant'])
def upload_kyc_documents():
    """Step 2: Upload KYC identity documents to Supabase Storage."""
    from services.storage import storage_provider
    
    doc_types = ['owner_id', 'business_license', 'health_permit', 'storefront_photo']
    uploaded_docs = {}
    errors = []

    for doc_type in doc_types:
        file = request.files.get(doc_type)
        if file:
            try:
                url = storage_provider.upload(file, context='kyc')
                uploaded_docs[doc_type] = url
            except ValueError as e:
                errors.append(f"{doc_type}: {str(e)}")
            except Exception as e:
                logger.error(f'kyc upload {doc_type}: {e}')
                errors.append(f"{doc_type}: Upload failed")

    if errors and not uploaded_docs:
        return jsonify({'error': 'All uploads failed', 'details': errors}), 400

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)
            
            existing_docs = dict(getattr(user, 'kyc_documents', None) or {})
            existing_docs.update(uploaded_docs)
            user.kyc_documents = existing_docs
            
            if uploaded_docs:
                user.kyc_status = 'pending'
            
            log = RestaurantAuditLog(
                id=str(uuid.uuid4()),
                restaurant_id=request.user_id,
                actor_id=request.user_id,
                actor_role='restaurant',
                action='kyc_documents_uploaded',
                target_type='user',
                target_id=request.user_id,
                new_values={'uploaded_docs': list(uploaded_docs.keys())},
                ip_address=request.remote_addr,
                created_at=datetime.now(UTC),
            )
            session.add(log)
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f'upload_kyc_documents save: {e}')
        return jsonify({'error': 'Failed to save KYC document references'}), 500

    return jsonify({
        'message': 'KYC documents uploaded successfully',
        'uploaded': uploaded_docs,
        'errors': errors if errors else None,
        'kyc_status': 'pending'
    }), 200


@restaurant_onboarding_bp.route('/profile/setup', methods=['POST'])
@require_auth(['restaurant'])
def setup_restaurant_profile():
    """Step 5: Save restaurant page profile — logo, hero image, bio, operational questions."""
    data = request.get_json(silent=True) or {}

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(request.user_id)

            updates = {}
            if data.get('description'):      updates['description']       = data['description']
            if data.get('logo_url'):          updates['logo_url']          = data['logo_url']
            if data.get('hero_image_url'):    updates['hero_image_url']    = data['hero_image_url']
            if data.get('latitude'):          updates['latitude']          = float(data['latitude'])
            if data.get('longitude'):         updates['longitude']         = float(data['longitude'])
            if data.get('address'):           updates['address']           = data['address']

            ops_survey = {}
            for field in ['daily_orders_estimate', 'peak_hours', 'uses_delivery_currently',
                          'current_platform', 'delivery_radius_km']:
                if field in data:
                    ops_survey[field] = data[field]
            if ops_survey:
                existing_extra = dict(getattr(user, 'extra', None) or {})
                existing_extra['ops_survey'] = ops_survey
                updates['extra'] = existing_extra

            if updates:
                repo.update(user, **updates)

            log = RestaurantAuditLog(
                id=str(uuid.uuid4()),
                restaurant_id=request.user_id,
                actor_id=request.user_id,
                actor_role='restaurant',
                action='profile_setup_completed',
                target_type='user',
                target_id=request.user_id,
                new_values={'fields_updated': list(updates.keys())},
                ip_address=request.remote_addr,
                created_at=datetime.now(UTC),
            )
            session.add(log)
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f'setup_restaurant_profile: {e}')
        return jsonify({'error': 'Failed to save profile'}), 500

    return jsonify({'message': 'Restaurant profile saved successfully'}), 200


@restaurant_onboarding_bp.route('/kyc/decision', methods=['POST'])
@require_auth(['admin'])
def kyc_decision():
    """Admin endpoint: approve or reject a restaurant KYC application."""
    data = request.get_json(silent=True) or {}
    restaurant_id = data.get('restaurant_id')
    decision = data.get('decision')  # 'approved' | 'rejected'
    reason = data.get('reason', '')

    if not restaurant_id or decision not in ('approved', 'rejected'):
        return jsonify({'error': 'restaurant_id and decision (approved|rejected) required'}), 400

    try:
        with transaction() as session:
            repo = UserRepository(session)
            user = repo.get_or_404(restaurant_id)

            user.kyc_status = decision
            if decision == 'approved':
                user.is_active = True

            log = RestaurantAuditLog(
                id=str(uuid.uuid4()),
                restaurant_id=restaurant_id,
                actor_id=request.user_id,
                actor_role='admin',
                action=f'kyc_{decision}',
                target_type='user',
                target_id=restaurant_id,
                new_values={'decision': decision, 'reason': reason},
                ip_address=request.remote_addr,
                created_at=datetime.now(UTC),
            )
            session.add(log)

            email = user.email
            restaurant_name = getattr(user, 'restaurant_name', '') or user.full_name
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f'kyc_decision: {e}')
        return jsonify({'error': 'Failed to update KYC decision'}), 500

    try:
        _send_kyc_decision_email(email, restaurant_name, approved=(decision == 'approved'), reason=reason)
    except Exception:
        pass

    return jsonify({
        'message': f'Restaurant KYC {decision}',
        'restaurant_id': restaurant_id,
        'kyc_status': decision,
        'is_active': decision == 'approved'
    }), 200


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
        
        has_payout = session.query(RestaurantPayoutAccount).filter_by(
            restaurant_id=restaurant_id
        ).first() is not None

        kyc_status = getattr(user, 'kyc_status', 'not_submitted') if user else 'not_submitted'
        has_kyc_docs = bool(getattr(user, 'kyc_documents', None))
        
        steps = [
            {'step': 1, 'name': 'business_info', 'label': 'Basic Information', 'completed': bool(user and user.restaurant_name)},
            {'step': 2, 'name': 'kyc', 'label': 'KYC Verification', 'completed': has_kyc_docs},
            {'step': 3, 'name': 'legal_and_payout', 'label': 'Banking & Legal', 'completed': has_legal and has_payout},
            {'step': 4, 'name': 'menu_location', 'label': 'Menu & Location', 'completed': bool(user and getattr(user, 'address', None))},
            {'step': 5, 'name': 'profile_setup', 'label': 'Restaurant Profile', 'completed': bool(user and getattr(user, 'description', None))},
        ]
        
        completed_count = sum(1 for s in steps if s['completed'])
        next_step = next((s for s in steps if not s['completed']), steps[-1])
        is_approved = kyc_status == 'approved' and getattr(user, 'is_active', False)
        
        return jsonify({
            'restaurant_id': restaurant_id,
            'onboarding_complete': is_approved,
            'kyc_status': kyc_status,
            'is_active': getattr(user, 'is_active', False),
            'completed_steps': completed_count,
            'total_steps': len(steps),
            'steps': steps,
            'next_step': next_step,
            'ai_plan': ai_sub.ai_plan if ai_sub else 'none',
        }), 200
