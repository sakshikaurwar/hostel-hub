import os
import MySQLdb
from dotenv import load_dotenv

load_dotenv()

def run_migrations():
    conn = MySQLdb.connect(
        host=os.getenv('MYSQL_HOST', '127.0.0.1'),
        user=os.getenv('MYSQL_USER', 'root'),
        passwd=os.getenv('MYSQL_PASSWORD', ''),
        db=os.getenv('MYSQL_DB', 'hostel_management')
    )
    cursor = conn.cursor()
    
    try:
        # 1. Add unique constraint to rooms (hostel_id, room_no)
        print("Checking/Adding unique constraint to rooms...")
        # Check if it already exists to avoid errors
        cursor.execute("SHOW INDEX FROM rooms WHERE Key_name = 'unique_hostel_room'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE rooms ADD CONSTRAINT unique_hostel_room UNIQUE (hostel_id, room_no)")
            print("Unique constraint added.")
        else:
            print("Unique constraint already exists.")
            
        # 2. Add room_fee to allocations
        print("Checking/Adding room_fee to allocations...")
        cursor.execute("SHOW COLUMNS FROM allocations LIKE 'room_fee'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE allocations ADD COLUMN room_fee DECIMAL(10,2) DEFAULT 0.00")
            print("room_fee column added.")
        else:
            print("room_fee column already exists.")
            
        # 3. Add 'staff' to users.role ENUM
        print("Checking/Adding 'staff' to users.role ENUM...")
        cursor.execute("ALTER TABLE users MODIFY COLUMN role ENUM('student','warden','admin','staff') NOT NULL DEFAULT 'student'")
        print("'staff' role added to ENUM.")
            
        conn.commit()
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migrations()
