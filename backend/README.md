# Hostel Management Backend

Flask-based REST API for the Hostel Management System.

## Requirements

- Python 3.9+
- MySQL Server 8.0+
- pip or python package manager

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Database

Edit `.env` file with your MySQL credentials:
```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=hostel_management
```

### 3. Create Database and Tables

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE hostel_management;"

# Import schema
mysql -u root -p hostel_management < schema.sql
```

### 4. Generate Security Keys

Update `.env` with secure random keys:
```bash
# Generate a secure key in Python:
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy output to:
- `SECRET_KEY=<generated_key>`
- `JWT_SECRET_KEY=<generated_key>`

### 5. Create Admin Account (Optional)

```bash
python create_admin.py
```

Default admin credentials:
- Email: `admin@hostel.com`
- Password: `Admin@12345`

⚠️ **Change the admin password after first login!**

### 6. Run the Backend

```bash
python app.py
```

Backend runs on: `http://localhost:5000`

## API Endpoints

- **POST** `/api/auth/signup` - Create new user account
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/me` - Get current user info (requires token)
- **GET** `/admin/dashboard` - Access admin dashboard (admin only)

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Security Features

✓ Password hashing with bcrypt  
✓ JWT token-based authentication  
✓ Email validation  
✓ Input sanitization  
✓ Admin role protection  
✓ CORS enabled for frontend integration
