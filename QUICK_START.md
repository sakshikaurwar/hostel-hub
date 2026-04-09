# QUICK START GUIDE - HOSTEL MANAGEMENT SYSTEM

## Prerequisites
- Python 3.9+
- Node.js 18+
- MySQL Server 8.0+

---

## 1️⃣ DATABASE SETUP (First Time Only)

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE hostel_management;"

# Import schema
mysql -u root -p hostel_management < hostel-hub/backend/schema.sql
```

---

## 2️⃣ BACKEND SETUP & RUN

```bash
cd hostel-hub/backend

# Install Python dependencies
pip install -r requirements.txt

# Create .env file with your MySQL credentials
# Copy the template below and edit with your credentials:

cat > .env << EOF
SECRET_KEY=your_secret_key_here_change_this
JWT_SECRET_KEY=your_jwt_secret_key_here_change_this
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_DB=hostel_management
EOF

# Create admin account (optional - for admin testing)
python create_admin.py

# Run backend server
python app.py

# ✅ Backend is now running on http://localhost:5000
```

---

## 3️⃣ FRONTEND SETUP & RUN

**In a NEW terminal window:**

```bash
cd hostel-hub

# Install npm dependencies
npm install

# Start development server
npm run dev

# ✅ Frontend is now running on http://localhost:8080
```

---

## 🧪 TEST THE APPLICATION

### Test 1: Signup as Student
1. Open http://localhost:8080
2. Click "Sign Up"
3. Fill the form:
   - Name: John Doe
   - Age: 20
   - Phone: 9876543210
   - Email: john@example.com
   - Password: SecurePass123 (8+ chars)
   - Role: Student
4. Click "Create Account"
5. ✅ Should land on Dashboard

### Test 2: Login as Admin
1. Go back to login page
2. Email: `admin@hostel.com`
3. Password: `Admin@12345`
4. ✅ Should see Admin menu item in sidebar
5. Click Admin → Should see "Admin access granted"

### Test 3: Non-Admin Cannot Access Admin Routes
1. Login as student (John Doe)
2. Try accessing http://localhost:8080/#/admin/dashboard directly
3. ❌ Should see "Access Denied" message

### Test 4: Logout
1. Click the Logout button in sidebar
2. ✅ Should return to login page without token

---

## 📝 DEFAULT ADMIN ACCOUNT

```
Email: admin@hostel.com
Password: Admin@12345
⚠️ Please change password after first login!
```

---

## 🛠️ TROUBLESHOOTING

### Backend Won't Start
```bash
# ✅ Check Python version
python --version  # Should be 3.9+

# ✅ Check if port 5000 is in use
# Windows:
netstat -ano | findstr :5000

# ✅ Install missing packages
pip install -r requirements.txt

# ✅ Check .env file exists and has correct MySQL credentials
cat backend/.env
```

### Frontend Won't Load
```bash
# ✅ Check Node version
node --version  # Should be 18+

# ✅ Clear npm cache
npm cache clean --force

# ✅ Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# ✅ Check if port 8080 is in use
# Windows:
netstat -ano | findstr :8080
```

### Database Connection Error
```bash
# ✅ Check MySQL is running
mysql -u root -p -e "SELECT 1;"

# ✅ Verify credentials in .env
cat backend/.env

# ✅ Check database exists
mysql -u root -p -e "SHOW DATABASES;" | grep hostel_management

# ✅ Check users table exists
mysql -u root -p hostel_management -e "SHOW TABLES;"
```

---

## 📚 KEY FILES TO UNDERSTAND

| **Component** | **File** | **Purpose** |
|---|---|---|
| Backend API | `backend/routes.py` | All authentication and admin endpoints |
| Frontend Auth | `src/pages/Login.tsx` | Signup/Login form |
| Dashboard | `src/pages/Dashboard.tsx` | Main dashboard after login |
| Admin Page | `src/pages/AdminDashboard.tsx` | Admin-only page |
| Data Service | `src/lib/dataService.ts` | API calls and local state |
| Setup | `backend/create_admin.py` | Create admin account |

---

## 🔐 SECURITY NOTES

✅ Passwords are hashed with bcrypt before storage  
✅ JWT tokens expire after 12 hours  
✅ All API requests need valid token in Authorization header  
✅ Admin role is protected and cannot be assigned via signup  
✅ Email uniqueness enforced in database  
✅ Input validation on all endpoints  

---

## 📞 SUPPORT

For issues:
1. Check SUBMISSION_REPORT.md for detailed documentation
2. Check backend/README.md for backend-specific details
3. Verify all prerequisites are installed
4. Check that both backend and frontend ports (5000 and 8080) are available

---

**Happy Testing! 🎉**
