#!/usr/bin/env python3
"""
Script to create an admin account in the database.
Usage: python create_admin.py
"""

import os
import sys
from werkzeug.security import generate_password_hash
import MySQLdb
from dotenv import load_dotenv

load_dotenv()

required_env_vars = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DB"]
missing_vars = [name for name in required_env_vars if not os.getenv(name)]
if missing_vars:
    print(f"Error: Missing environment variables: {', '.join(missing_vars)}")
    sys.exit(1)

try:
    conn = MySQLdb.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        passwd=os.getenv("MYSQL_PASSWORD"),
        db=os.getenv("MYSQL_DB"),
        charset="utf8mb4",
        use_unicode=True,
    )
    cursor = conn.cursor()

    # Check if admin already exists
    cursor.execute("SELECT id FROM users WHERE role='admin' LIMIT 1")
    if cursor.fetchone():
        print("✓ Admin account already exists")
        sys.exit(0)

    # Create admin account
    email = "admin@hostel.com"
    password = "Admin@12345"  # Default password - user should change this
    name = "System Administrator"
    
    hashed_password = generate_password_hash(password)
    
    cursor.execute(
        "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
        (name, email, hashed_password, "admin")
    )
    conn.commit()
    
    print("✓ Admin account created successfully!")
    print(f"  Email: {email}")
    print(f"  Password: {password}")
    print("  ⚠️  Please change the password after first login!")
    
except MySQLdb.Error as e:
    print(f"✗ Database error: {e}")
    sys.exit(1)
finally:
    cursor.close()
    conn.close()
