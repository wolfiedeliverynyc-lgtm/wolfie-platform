import os
import sys
import uuid
from datetime import datetime, timezone

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from database import transaction, get_db_session
from database.schemas import User
from models.legal_acceptance import RestaurantLegalAcceptance
from models.payout import RestaurantPayoutAccount, RestaurantBalance
from models.ai_subscription import RestaurantAISubscription

def complete_onboarding_for_all_restaurants():
    app = create_app("development")
    UTC = timezone.utc
    now = datetime.now(UTC)

    with app.app_context():
        session = get_db_session()
        restaurants = session.query(User).filter_by(role="restaurant").all()

        if not restaurants:
            print("No restaurant accounts found to onboard.")
            return

        for r in restaurants:
            print(f"Completing onboarding for restaurant {r.email} ({r.restaurant_name})...")
            
            # 1. Ensure restaurant name exists
            if not r.restaurant_name:
                r.restaurant_name = r.full_name or "Test Restaurant"
            
            # 2. Check and insert Legal Acceptance
            legal = session.query(RestaurantLegalAcceptance).filter_by(restaurant_id=r.id).first()
            if not legal:
                legal = RestaurantLegalAcceptance(
                    id=str(uuid.uuid4()),
                    restaurant_id=r.id,
                    accepted_terms=True,
                    accepted_privacy=True,
                    accepted_wap_ai_terms=True,
                    ip_address="127.0.0.1",
                    user_agent="Seed Script",
                    policy_version="1.0.0",
                    accepted_at=now,
                    created_at=now
                )
                session.add(legal)
                print("  - Legal acceptance seeded.")
            else:
                print("  - Legal acceptance already exists.")

            # 3. Check and insert AI Subscription
            ai_sub = session.query(RestaurantAISubscription).filter_by(restaurant_id=r.id).first()
            if not ai_sub:
                ai_sub = RestaurantAISubscription(
                    id=str(uuid.uuid4()),
                    restaurant_id=r.id,
                    ai_plan="pro",
                    ai_enabled=True,
                    ai_billing_status="active",
                    created_at=now,
                    updated_at=now
                )
                session.add(ai_sub)
                print("  - AI Subscription seeded.")
            else:
                print("  - AI Subscription already exists.")

            # 4. Check and insert Payout Account
            payout = session.query(RestaurantPayoutAccount).filter_by(restaurant_id=r.id).first()
            if not payout:
                payout = RestaurantPayoutAccount(
                    id=str(uuid.uuid4()),
                    restaurant_id=r.id,
                    bank_name="Test Partner Bank",
                    account_last4="9876",
                    routing_number_hash="seeded_routing_hash",
                    account_number_hash="seeded_account_hash",
                    payout_schedule="weekly",
                    identity_verified=True,
                    tax_info_provided=True,
                    created_at=now,
                    updated_at=now
                )
                session.add(payout)
                print("  - Payout account seeded.")
            else:
                print("  - Payout account already exists.")

            # 5. Check and insert Restaurant Balance
            balance = session.query(RestaurantBalance).filter_by(restaurant_id=r.id).first()
            if not balance:
                balance = RestaurantBalance(
                    id=str(uuid.uuid4()),
                    restaurant_id=r.id,
                    available_balance=1500.0,
                    pending_balance=350.0,
                    lifetime_earned=5000.0,
                    created_at=now,
                    updated_at=now
                )
                session.add(balance)
                print("  - Balance details seeded.")
            else:
                print("  - Balance details already exists.")

        session.commit()
        print("All restaurants successfully onboarded in database!")

if __name__ == "__main__":
    complete_onboarding_for_all_restaurants()
