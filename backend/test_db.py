import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

conn = pymysql.connect(
    host=os.getenv('MYSQL_HOST', '127.0.0.1'),
    user=os.getenv('MYSQL_USER', 'root'),
    password=os.getenv('MYSQL_PASSWORD', ''),
    database=os.getenv('MYSQL_DB', 'hostel_management')
)

cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM users")
result = cursor.fetchone()
print(f"Total users: {result[0]}")
conn.close()