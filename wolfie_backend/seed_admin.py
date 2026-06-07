"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — seed_admin.py                          ║
║     ينشئ أول admin مباشرة في قاعدة البيانات                  ║
╚══════════════════════════════════════════════════════════════╝

الاستخدام:
    python seed_admin.py
    ADMIN_EMAIL=me@wolfie.com ADMIN_PASSWORD=MyPass123 python seed_admin.py
"""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))

def seed_admin():
    email    = os.getenv("ADMIN_EMAIL",    "admin@wolfie.com")
    password = os.getenv("ADMIN_PASSWORD", "Wolfie@Admin2024!")
    name     = os.getenv("ADMIN_NAME",     "Wolfie Admin")
    phone    = os.getenv("ADMIN_PHONE",    "+13475550000")

    print(f"\n🐺 Wolfie Admin Seed")
    print(f"   Email : {email}")
    print(f"   Name  : {name}\n")

    from app import create_app
    app = create_app(os.getenv("FLASK_ENV", "development"))

    with app.app_context():
        from database import transaction
        from database.repositories import UserRepository

        try:
            with transaction() as session:
                repo     = UserRepository(session)
                existing = repo.find_by_email(email)

                if existing:
                    if existing.role == "admin":
                        print(f"⚠️  Admin موجود: {email} (ID: {existing.id})")
                        return
                    repo.set_role(existing, "admin")
                    print(f"✅ تمت ترقية {email} إلى admin (ID: {existing.id})")
                    return

                # Create new admin (bypass role restriction)
                import uuid, hashlib, os as _os
                from datetime import datetime, timezone
                from database.schemas import User

                salt = _os.urandom(16).hex()
                h    = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
                now  = datetime.now(timezone.utc)

                admin = User(
                    id            = str(uuid.uuid4()),
                    email         = email.lower().strip(),
                    password_hash = f"{salt}:{h.hex()}",
                    full_name     = name,
                    phone         = phone,
                    role          = "admin",
                    is_active     = True,
                    created_at    = now,
                    updated_at    = now,
                )
                session.add(admin)
                admin_id = admin.id

            print(f"✅ Admin created!")
            print(f"   ID       : {admin_id}")
            print(f"   Email    : {email}")
            print(f"   Password : {password}")
            print(f"\n⚠️  احفظ كلمة السر — لن تظهر مرة أخرى\n")

        except Exception as e:
            print(f"❌ فشل: {e}")
            sys.exit(1)

if __name__ == "__main__":
    seed_admin()
