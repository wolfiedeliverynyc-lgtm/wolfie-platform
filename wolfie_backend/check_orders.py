import sqlite3
import os

db_path = r"c:\Users\DELL\Desktop\wolfie front end\wolfie_backend\wolfie_dev.db"

if not os.path.exists(db_path):
    print("Database file not found at", db_path)
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List latest 5 orders
    try:
        cursor.execute("SELECT id, customer_id, restaurant_id, status, payment_method, total, created_at FROM orders ORDER BY created_at DESC LIMIT 5")
        rows = cursor.fetchall()
        print("--- LATEST 5 ORDERS ---")
        for row in rows:
            print(f"ID: {row[0]}, Customer: {row[1]}, Restaurant: {row[2]}, Status: {row[3]}, Method: {row[4]}, Total: ${row[5]}, Placed: {row[6]}")
    except Exception as e:
        print("Error reading orders table:", e)
        
    conn.close()
