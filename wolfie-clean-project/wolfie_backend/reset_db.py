from database import init_db, drop_tables, create_tables
from app import create_app
app = create_app()
with app.app_context():
    init_db(app)
    drop_tables()
    create_tables()
print("DB recreated successfully!")
