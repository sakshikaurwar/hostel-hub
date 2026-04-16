import os
import MySQLdb
from dotenv import load_dotenv

load_dotenv()

def test_allocation():
    conn = MySQLdb.connect(
        host=os.getenv('MYSQL_HOST', '127.0.0.1'),
        user=os.getenv('MYSQL_USER', 'root'),
        passwd=os.getenv('MYSQL_PASSWORD', ''),
        db=os.getenv('MYSQL_DB', 'hostel_management')
    )
    cursor = conn.cursor()
    
    try:
        # Try to update status to 'partial' or 'full'
        print("Testing status update to 'partial'...")
        cursor.execute("UPDATE rooms SET status = 'partial' WHERE room_id = (SELECT room_id FROM (SELECT room_id FROM rooms LIMIT 1) AS tmp)")
        conn.commit()
        print("Success!")
    except Exception as e:
        print(f"Failed: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_allocation()
