import sqlite3
import os

db_path = r"c:\Users\DELL\Desktop\wolfie front end\wolfie_backend\wolfie_dev.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check details of the restaurant ID from the latest order
    target_id = "1a937818-5cb5-4c16-96ab-58ef09b8df6c"
    try:
        cursor.execute("SELECT id, email, restaurant_name, role FROM users WHERE id = ?", (target_id,))
        row = cursor.fetchone()
        print("--- TARGET RESTAURANT DETAILS ---")
        if row:
            print(f"ID: {row[0]}\nEmail: {row[1]}\nName: {row[2]}\nRole: {row[3]}")
        else:
            print(f"No user found with ID {target_id}")
            
        # Also print the logged-in/seeded Wendy's account details
        print("\n--- WENDY'S ACCOUNT DETAILS ---")
        cursor.execute("SELECT id, email, restaurant_name, role FROM users WHERE email = 'wendys@wolfie.delivery'")
        row = cursor.fetchone()
        if row:
            print(f"ID: {row[0]}\nEmail: {row[1]}\nName: {row[2]}\nRole: {row[3]}")
        else:
            print("No Wendy's account found by email")
    except Exception as e:
        print("Error querying database:", e)
        
    conn.close()
