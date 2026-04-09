from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import re
import string
import random
import MySQLdb
import MySQLdb.cursors
from functools import wraps

auth_routes = Blueprint("auth", __name__, url_prefix='/api/auth')
admin_routes = Blueprint("admin", __name__, url_prefix='/api/admin')
warden_routes = Blueprint("warden", __name__, url_prefix='/api/warden')
common_routes = Blueprint("common", __name__, url_prefix='/api')
complaints_routes = Blueprint("complaints", __name__, url_prefix='/api/complaints')
attendance_routes = Blueprint("attendance", __name__, url_prefix='/api/attendance')
payments_routes = Blueprint("payments", __name__, url_prefix='/api/payments')
salaries_routes = Blueprint("salaries", __name__, url_prefix='/api/salaries')
health_routes = Blueprint("health", __name__, url_prefix='/api/health')

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ALLOWED_ROLES = {"student", "warden"}


def generate_password(length=12):
    characters = string.ascii_letters + string.digits + "!@#$%^&*()-_"
    return "".join(random.choice(characters) for _ in range(length))


def hash_password(password):
    return generate_password_hash(password)


def get_db():
    return MySQLdb.connect(
        host=current_app.config["MYSQL_HOST"],
        user=current_app.config["MYSQL_USER"],
        passwd=current_app.config["MYSQL_PASSWORD"],
        db=current_app.config["MYSQL_DB"],
        charset="utf8mb4",
        use_unicode=True,
    )


def create_token(user_id, role):
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12),
    }
    token = jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")
    return token.decode("utf-8") if isinstance(token, bytes) else token


def verify_token(token):
    try:
        return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "Authentication required"}), 401

        token = auth_header.split(" ", 1)[1]
        payload = verify_token(token)
        if not payload:
            return jsonify({"message": "Invalid or expired token"}), 401

        g.user = payload
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    @token_required
    def wrapper(*args, **kwargs):
        if g.user.get("role") != "admin":
            return jsonify({"message": "Access Denied"}), 403
        return fn(*args, **kwargs)

    return wrapper


# SIGNUP
@auth_routes.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    raw_role = str(data.get("role", "student")).strip().lower()

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400
    if len(name) < 2:
        return jsonify({"message": "Name must be at least 2 characters"}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Invalid email address"}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    if raw_role == "admin":
        return jsonify({"message": "Admin cannot be created via signup"}), 403
    role = raw_role if raw_role in ALLOWED_ROLES else "student"

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)

        cursor.execute(
            "SELECT COUNT(*) AS count FROM users WHERE LOWER(email) = LOWER(%s)",
            (email,),
        )
        result = cursor.fetchone()
        if result and result.get("count", 0) > 0:
            return jsonify({"message": "Email already registered"}), 409

        hashed_password = hash_password(password)
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            (name, email, hashed_password, role),
        )
        conn.commit()
        user_id = cursor.lastrowid
    except MySQLdb.Error as exc:
        current_app.logger.exception("Signup database error for email=%s", email)
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    token = create_token(user_id, role)

    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id,
        "name": name,
        "email": email,
        "role": role,
        "token": token,
    }), 201


# LOGIN
@auth_routes.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Invalid email address"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(
            "SELECT id, name, email, password, role FROM users WHERE LOWER(email) = LOWER(%s)",
            (email,),
        )
        user = cursor.fetchone()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Login database error for email=%s", email)
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    if not user:
        return jsonify({"message": "No account found with this email. Please sign up."}), 404

    stored_password = user.get("password")
    if stored_password is None:
        return jsonify({"message": "Invalid password"}), 401

    password_valid = False

    if stored_password:
        if isinstance(stored_password, bytes):
            stored_password = stored_password.decode("utf-8")

        stored_password = stored_password.strip()
        input_password = password.strip()

        try:
            password_valid = check_password_hash(stored_password, input_password)
        except Exception:
            password_valid = (stored_password == input_password)

    if password_valid:
        token = create_token(user.get("id"), user.get("role"))
        return jsonify({
            "message": "Login successful",
            "role": user.get("role"),
            "user_id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "token": token,
        }), 200

    return jsonify({"message": "Invalid password"}), 401


@auth_routes.route("/me", methods=["GET"])
@token_required
def me():
    user_id = g.user.get("user_id")
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, email, role FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
    except MySQLdb.Error:
        return jsonify({"message": "Database error"}), 500
    finally:
        cursor.close()
        conn.close()

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "role": user[3],
    })


@admin_routes.route("/dashboard", methods=["GET"])
@admin_required
def admin_dashboard():
    return jsonify({
        "message": "Admin access granted",
        "dashboard": "Secure admin dashboard data",
        "admin": True,
    })


@common_routes.route("/staff-contacts", methods=["GET"])
@token_required
def get_staff_contacts():
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute(
            """
                SELECT u.name, sd.role_type, sd.phone
                FROM users u
                JOIN staff_details sd ON u.id = sd.user_id
            """
        )
        staff = cursor.fetchall()
        result = [{
            "name": row[0],
            "role": row[1],
            "phone": row[2],
        } for row in staff]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        current_app.logger.exception("Staff contacts database error")
        return jsonify({"message": "Database error"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/dashboard/stats", methods=["GET"])
@admin_required
def dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Optimized single query for most stats
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
                (SELECT COUNT(*) FROM rooms) AS total_rooms,
                (SELECT COUNT(DISTINCT r.room_id) FROM rooms r 
                 INNER JOIN allocations a ON r.room_id = a.room_id 
                 WHERE a.check_out IS NULL) AS occupied_rooms,
                (SELECT COUNT(DISTINCT r.room_id) FROM rooms r 
                 LEFT JOIN allocations a ON r.room_id = a.room_id AND a.check_out IS NULL 
                 WHERE a.allocation_id IS NULL) AS available_rooms,
                (SELECT COUNT(*) FROM staff_details WHERE role_type = 'Warden') AS total_wardens,
                (SELECT COUNT(*) FROM complaints WHERE status != 'Resolved') AS pending_complaints,
                (SELECT COUNT(*) FROM payments WHERE status IN ('Unpaid', 'Overdue')) AS pending_payments
        """)
        
        result = cursor.fetchone()
        if result:
            return jsonify({
                "totalStudents": result[0] or 0,
                "totalRooms": result[1] or 0,
                "occupiedRooms": result[2] or 0,
                "availableRooms": result[3] or 0,
                "totalWardens": result[4] or 0,
                "pendingComplaints": result[5] or 0,
                "pendingPayments": result[6] or 0,
            }), 200
        return jsonify({"message": "Failed to fetch stats"}), 500
    except MySQLdb.Error as e:
        current_app.logger.exception("Dashboard stats database error")
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ==================== COMPLAINTS ENDPOINTS ====================

@complaints_routes.route("", methods=["GET"])
@token_required
def get_complaints():
    user_id = g.user.get("user_id")
    role = g.user.get("role")
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        if role == "admin" or role == "warden":
            cursor.execute("""
                SELECT c.id, c.title, c.description, c.category, c.priority, 
                       c.status, c.room_number, c.created_at, u.name, u.email
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.created_at DESC
            """)
        else:
            cursor.execute("""
                SELECT c.id, c.title, c.description, c.category, c.priority, 
                       c.status, c.room_number, c.created_at, u.name, u.email
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                WHERE c.user_id = %s
                ORDER BY c.created_at DESC
            """, (user_id,))
        
        complaints = cursor.fetchall()
        result = [{
            "id": c[0],
            "title": c[1],
            "description": c[2],
            "category": c[3],
            "priority": c[4],
            "status": c[5],
            "roomNumber": c[6],
            "createdAt": str(c[7]),
            "createdByName": c[8],
            "createdBy": c[9],
        } for c in complaints]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@complaints_routes.route("", methods=["POST"])
@token_required
def create_complaint():
    user_id = g.user.get("user_id")
    data = request.get_json(silent=True) or {}
    
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    category = str(data.get("category", "Maintenance")).strip()
    priority = str(data.get("priority", "Medium")).strip()
    room_number = str(data.get("roomNumber", "")).strip()
    
    if not title or not description:
        return jsonify({"message": "Title and description are required"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO complaints (user_id, title, description, category, priority, room_number)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, title, description, category, priority, room_number))
        conn.commit()
        complaint_id = cursor.lastrowid
        
        return jsonify({
            "message": "Complaint created successfully",
            "id": complaint_id,
            "title": title,
            "status": "Pending"
        }), 201
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@complaints_routes.route("/<int:complaint_id>", methods=["PUT"])
@token_required
def update_complaint(complaint_id):
    user_id = g.user.get("user_id")
    role = g.user.get("role")
    data = request.get_json(silent=True) or {}
    
    new_status = str(data.get("status", "")).strip()
    if new_status not in ["Pending", "In Progress", "Resolved"]:
        return jsonify({"message": "Invalid status"}), 400
    
    if role not in ["admin", "warden"]:
        return jsonify({"message": "Only admin/warden can update complaints"}), 403
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE complaints SET status = %s WHERE id = %s", (new_status, complaint_id))
        conn.commit()
        return jsonify({"message": "Complaint updated", "status": new_status}), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ==================== ATTENDANCE ENDPOINTS ====================

@attendance_routes.route("", methods=["GET"])
@token_required
def get_attendance():
    user_id = g.user.get("user_id")
    role = g.user.get("role")
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        if role == "admin" or role == "warden":
            cursor.execute("""
                SELECT a.id, a.user_id, u.email, u.name, a.date, a.status, u.room_number
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE u.role = 'student'
                ORDER BY a.date DESC
            """)
        else:
            cursor.execute("""
                SELECT a.id, a.user_id, u.email, u.name, a.date, a.status, u.room_number
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE a.user_id = %s AND u.role = 'student'
                ORDER BY a.date DESC
            """, (user_id,))
        
        records = cursor.fetchall()
        result = [{
            "id": r[0],
            "studentEmail": r[2],
            "studentName": r[3],
            "date": str(r[4]),
            "status": r[5],
            "roomNumber": r[6] or "N/A",
            "markedBy": "Warden"
        } for r in records]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@attendance_routes.route("/percentage/<int:user_id>", methods=["GET"])
@token_required
def get_attendance_percentage(user_id):
    role = g.user.get("role")
    requester_id = g.user.get("user_id")
    
    if role == "student" and user_id != requester_id:
        return jsonify({"message": "Students can only view their own attendance percentage"}), 403
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check if target user is a student
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user or user[0] != 'student':
            return jsonify({"message": "Attendance percentage is only available for students"}), 400
        
        cursor.execute("SELECT COUNT(*) FROM attendance WHERE user_id = %s", (user_id,))
        total = cursor.fetchone()[0]
        
        if total == 0:
            return jsonify({"percentage": 0}), 200
        
        cursor.execute("""
            SELECT COUNT(*) FROM attendance 
            WHERE user_id = %s AND (status = 'Present' OR status = 'Late')
        """, (user_id,))
        present = cursor.fetchone()[0]
        
        percentage = round((present / total) * 100) if total > 0 else 0
        return jsonify({"percentage": percentage}), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@attendance_routes.route("", methods=["POST"])
@token_required
def mark_attendance():
    role = g.user.get("role")
    if role not in ["admin", "warden"]:
        return jsonify({"message": "Only admin/warden can mark attendance"}), 403
    
    data = request.get_json(silent=True) or {}
    user_id = data.get("studentId")
    date = str(data.get("date", "")).strip()
    status = str(data.get("status", "")).strip()
    
    if not user_id or not date or status not in ["Present", "Absent", "Late"]:
        return jsonify({"message": "Invalid data"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check if user is a student
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user or user[0] != 'student':
            return jsonify({"message": "Attendance can only be marked for students"}), 400
        
        # Check if attendance already exists for this date
        cursor.execute("SELECT id FROM attendance WHERE user_id = %s AND date = %s", (user_id, date))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("UPDATE attendance SET status = %s WHERE user_id = %s AND date = %s", 
                         (status, user_id, date))
        else:
            cursor.execute("""
                INSERT INTO attendance (user_id, date, status, marked_by)
                VALUES (%s, %s, %s, %s)
            """, (user_id, date, status, g.user.get("user_id")))
        
        conn.commit()
        return jsonify({"message": "Attendance marked"}), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ==================== PAYMENTS ENDPOINTS ====================

@payments_routes.route("", methods=["GET"])
@token_required
def get_payments():
    user_id = g.user.get("user_id")
    role = g.user.get("role")
    
    if role == "warden":
        return jsonify({"message": "Unauthorized"}), 403
    if role not in {"student", "admin"}:
        return jsonify({"message": "Unauthorized"}), 403
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        if role == "admin":
            cursor.execute("""
                SELECT p.id, p.user_id, u.email, u.name, p.description, p.amount, 
                       p.total_fees, p.due_date, p.status, p.paid_date, u.room_number
                FROM payments p
                JOIN users u ON p.user_id = u.id
                WHERE u.role = 'student'
                ORDER BY p.due_date DESC
            """)
        else:
            cursor.execute("""
                SELECT p.id, p.user_id, u.email, u.name, p.description, p.amount, 
                       p.total_fees, p.due_date, p.status, p.paid_date, u.room_number
                FROM payments p
                JOIN users u ON p.user_id = u.id
                WHERE p.user_id = %s AND u.role = 'student'
                ORDER BY p.due_date DESC
            """, (user_id,))
        
        payments = cursor.fetchall()
        result = [{
            "id": p[0],
            "studentEmail": p[2],
            "studentName": p[3],
            "description": p[4],
            "amount": float(p[5]),
            "totalFees": float(p[6]),
            "dueDate": str(p[7]),
            "status": p[8],
            "paidDate": str(p[9]) if p[9] else None,
            "roomNumber": p[10] or "N/A"
        } for p in payments]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@payments_routes.route("/<int:payment_id>", methods=["PUT"])
@admin_required
def update_payment(payment_id):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status", "")).strip()
    
    if new_status not in ["Paid", "Unpaid", "Overdue"]:
        return jsonify({"message": "Invalid status"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        if new_status == "Paid":
            paid_date = datetime.datetime.now().strftime("%Y-%m-%d")
            cursor.execute("""
                UPDATE payments SET status = %s, paid_date = %s WHERE id = %s
            """, (new_status, paid_date, payment_id))
        else:
            cursor.execute("UPDATE payments SET status = %s WHERE id = %s", (new_status, payment_id))
        
        conn.commit()
        return jsonify({"message": "Payment updated"}), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@payments_routes.route("", methods=["POST"])
@admin_required
def create_payment():
    data = request.get_json(silent=True) or {}
    user_id = data.get("studentId")
    description = str(data.get("description", "")).strip()
    amount = data.get("amount")
    total_fees = data.get("totalFees", amount)
    due_date = str(data.get("dueDate", "")).strip()
    
    if not user_id or not description or not amount or not due_date:
        return jsonify({"message": "Missing required fields"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT role FROM users WHERE id = %s",
            (user_id,),
        )
        user = cursor.fetchone()
        if not user or user[0] != 'student':
            return jsonify({"message": "Payments can only be created for students"}), 400

        cursor.execute("""
            INSERT INTO payments (user_id, description, amount, total_fees, due_date, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, description, amount, total_fees, due_date, "Unpaid"))
        conn.commit()
        return jsonify({"message": "Payment created"}), 201
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ==================== SALARIES ENDPOINTS ====================

@salaries_routes.route("", methods=["GET"])
@token_required
def get_salaries():
    user_id = g.user.get("user_id")
    role = g.user.get("role")
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        query = """
            SELECT s.id, s.user_id, COALESCE(sd.role_type, 'Staff'), u.name, s.month, s.year, s.amount, s.status, s.paid_date
            FROM salaries s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN staff_details sd ON sd.user_id = u.id
            WHERE u.role = 'warden'
        """
        params = []

        if role == "admin":
            query += " ORDER BY s.year DESC, s.month DESC, u.name"
        elif role == "warden":
            query += " AND u.id = %s ORDER BY s.year DESC, s.month DESC"
            params.append(user_id)
        else:
            return jsonify({"message": "Access denied"}), 403

        cursor.execute(query, params)
        salaries = cursor.fetchall()
        result = [{
            "id": s[0],
            "staffId": s[1],
            "roleType": s[2],
            "staffName": s[3],
            "monthYear": f"{s[5]}-{int(s[4]):02d}",
            "amount": float(s[6]),
            "status": s[7],
            "paidDate": str(s[8]) if s[8] else None,
        } for s in salaries]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@warden_routes.route("/salary", methods=["GET"])
@token_required
def get_warden_salary():
    if g.user.get("role") != "warden":
        return jsonify({"message": "Unauthorized"}), 403

    user_id = g.user.get("user_id")
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, month, year, amount, status, paid_date
            FROM salaries
            WHERE user_id = %s
            ORDER BY year DESC,
              FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December') DESC
        """, (user_id,))
        salaries = cursor.fetchall()
        result = [{
            "id": row[0],
            "month": row[1],
            "year": row[2],
            "amount": float(row[3]),
            "status": row[4],
            "paid_date": str(row[5]) if row[5] else None,
        } for row in salaries]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@salaries_routes.route("", methods=["POST"])
@admin_required
def create_salary():
    data = request.get_json(silent=True) or {}
    staff_id = data.get("staffId")
    month_year = str(data.get("monthYear", "")).strip()
    amount = data.get("amount")
    
    if not staff_id or not month_year or not amount:
        return jsonify({"message": "staffId, monthYear, and amount are required"}), 400

    try:
        year, month = month_year.split("-")
        month = int(month)
        year = int(year)
    except (ValueError, AttributeError):
        return jsonify({"message": "monthYear must be in YYYY-MM format"}), 400

    if month < 1 or month > 12:
        return jsonify({"message": "Invalid month in monthYear"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT u.role FROM users u WHERE u.id = %s",
            (staff_id,),
        )
        user = cursor.fetchone()
        if not user or user[0] != 'warden':
            return jsonify({"message": "Salary records can only be created for warden/staff users"}), 400

        cursor.execute("SELECT id FROM salaries WHERE user_id = %s AND month = %s AND year = %s", (staff_id, month, year))
        existing = cursor.fetchone()
        if existing:
            return jsonify({"message": "Salary already exists for this staff and month"}), 409
        
        cursor.execute("""
            INSERT INTO salaries (user_id, month, year, amount, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (staff_id, month, year, amount, "Unpaid"))
        conn.commit()
        salary_id = cursor.lastrowid
        
        return jsonify({
            "message": "Salary created successfully",
            "id": salary_id
        }), 201
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@salaries_routes.route("/<int:salary_id>", methods=["PUT"])
@admin_required
def update_salary(salary_id):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status", "")).strip()
    
    if new_status not in ["Paid", "Unpaid"]:
        return jsonify({"message": "Invalid status"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        if new_status == "Paid":
            paid_date = datetime.datetime.now().strftime("%Y-%m-%d")
            cursor.execute("""
                UPDATE salaries SET status = %s, paid_date = %s WHERE id = %s
            """, (new_status, paid_date, salary_id))
        else:
            cursor.execute("UPDATE salaries SET status = %s WHERE id = %s", (new_status, salary_id))
        
        conn.commit()
        return jsonify({"message": "Salary updated"}), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ==================== ADMIN STUDENTS ENDPOINTS ====================

@admin_routes.route("/students", methods=["GET"])
@admin_required
def get_students():
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute("""
            SELECT id, name, email, phone, department, year, room_number, status
            FROM users
            WHERE role = 'student'
            ORDER BY name
        """)
        students = cursor.fetchall()
        return jsonify(students), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/students", methods=["POST"])
@admin_required
def create_student():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    department = str(data.get("department", "")).strip()
    year = str(data.get("year", "")).strip()
    password = str(data.get("password", "")).strip()

    if not name or not email:
        return jsonify({"message": "Name and email are required"}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Invalid email address"}), 400
    if password and len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    generated_password = None
    if not password:
        generated_password = generate_password()
        password = generated_password

    hashed_password = hash_password(password)

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(
            "SELECT COUNT(*) AS count FROM users WHERE LOWER(email) = LOWER(%s)",
            (email,),
        )
        result = cursor.fetchone()
        if result and result.get("count", 0) > 0:
            return jsonify({"message": "Email already registered"}), 409

        cursor.execute(
            "INSERT INTO users (name, email, password, role, phone, department, year, status, room_number) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (name, email, hashed_password, 'student', phone, department, year, 'inactive', None),
        )
        conn.commit()
        user_id = cursor.lastrowid
    except MySQLdb.Error as exc:
        current_app.logger.exception("Create student database error for email=%s", email)
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    response = {
        "message": "Student created successfully",
        "id": user_id,
        "name": name,
        "email": email,
    }
    if generated_password is not None:
        response["generatedPassword"] = generated_password

    return jsonify(response), 201


@admin_routes.route("/students/<int:student_id>", methods=["PUT"])
@admin_required
def update_student(student_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    department = str(data.get("department", "")).strip()
    year = str(data.get("year", "")).strip()
    status = str(data.get("status", "")).strip()

    if not name or not email:
        return jsonify({"message": "Name and email are required"}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Invalid email address"}), 400
    if status and status not in ['active', 'inactive']:
        return jsonify({"message": "Invalid status"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(
            "SELECT id FROM users WHERE LOWER(email) = LOWER(%s) AND id != %s",
            (email, student_id),
        )
        existing = cursor.fetchone()
        if existing:
            return jsonify({"message": "Email already taken"}), 409

        update_fields = []
        update_values = []
        if name:
            update_fields.append("name = %s")
            update_values.append(name)
        if email:
            update_fields.append("email = %s")
            update_values.append(email)
        if phone:
            update_fields.append("phone = %s")
            update_values.append(phone)
        if department:
            update_fields.append("department = %s")
            update_values.append(department)
        if year:
            update_fields.append("year = %s")
            update_values.append(year)
        if status:
            update_fields.append("status = %s")
            update_values.append(status)

        if not update_fields:
            return jsonify({"message": "No fields to update"}), 400

        update_values.append(student_id)
        cursor.execute(
            f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s AND role = 'student'",
            update_values,
        )
        conn.commit()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Update student database error for id=%s", student_id)
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    return jsonify({"message": "Student updated successfully"}), 200


@admin_routes.route("/students/<int:student_id>", methods=["DELETE"])
@admin_required
def delete_student(student_id):
    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = %s AND role = 'student'", (student_id,))
        if not cursor.fetchone():
            return jsonify({"message": "Student not found"}), 404

        cursor.execute("DELETE FROM users WHERE id = %s AND role = 'student'", (student_id,))
        conn.commit()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Delete student database error for id=%s", student_id)
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    return jsonify({"message": "Student deleted successfully"}), 200


# ==================== ADMIN STAFF ENDPOINTS ====================

@admin_routes.route("/staff", methods=["GET"])
@admin_required
def get_staff():
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute("""
            SELECT s.id, u.name, s.role_type, s.phone, s.salary
            FROM staff_details s
            JOIN users u ON s.user_id = u.id
            ORDER BY u.name
        """)
        staff = cursor.fetchall()
        return jsonify(staff), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/staff", methods=["POST"])
@admin_required
def create_staff():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    role_type = str(data.get("role_type", "")).strip()
    phone = str(data.get("phone", "")).strip()
    salary = data.get("salary")
    password = str(data.get("password", "")).strip()

    if not name or not email or not role_type:
        return jsonify({"message": "Name, email, and role_type are required"}), 400
    if role_type not in ['Warden', 'Cleaner', 'Electrician', 'Security']:
        return jsonify({"message": "Invalid role_type"}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Invalid email address"}), 400
    if password and len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    generated_password = None
    if not password:
        generated_password = generate_password()
        password = generated_password

    hashed_password = hash_password(password)
    user_role = 'warden'

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(
            "SELECT COUNT(*) AS count FROM users WHERE LOWER(email) = LOWER(%s)",
            (email,),
        )
        result = cursor.fetchone()
        if result and result.get("count", 0) > 0:
            return jsonify({"message": "Email already registered"}), 409

        cursor.execute(
            "INSERT INTO users (name, email, password, role, status) VALUES (%s, %s, %s, %s, %s)",
            (name, email, hashed_password, user_role, 'active'),
        )
        user_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO staff_details (user_id, role_type, phone, salary, join_date) VALUES (%s, %s, %s, %s, %s)",
            (user_id, role_type, phone, salary, datetime.datetime.now().date()),
        )
        conn.commit()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Create staff database error for email=%s", email)
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    response = {
        "message": "Staff created successfully",
        "id": user_id,
        "name": name,
        "email": email,
    }
    if generated_password is not None:
        response["generatedPassword"] = generated_password

    return jsonify(response), 201


@admin_routes.route("/staff/<int:staff_id>", methods=["PUT"])
@admin_required
def update_staff(staff_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    role_type = str(data.get("role_type", "")).strip()
    phone = str(data.get("phone", "")).strip()
    salary = data.get("salary")

    if role_type and role_type not in ['Warden', 'Cleaner', 'Electrician', 'Security']:
        return jsonify({"message": "Invalid role_type"}), 400
    if email and not EMAIL_REGEX.match(email):
        return jsonify({"message": "Invalid email address"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute("SELECT user_id FROM staff_details WHERE id = %s", (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            return jsonify({"message": "Staff not found"}), 404
        user_id = staff['user_id']

        update_fields = []
        update_values = []
        if name:
            update_fields.append("name = %s")
            update_values.append(name)
        if email:
            cursor.execute(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(%s) AND id != %s",
                (email, user_id),
            )
            if cursor.fetchone():
                return jsonify({"message": "Email already taken"}), 409
            update_fields.append("email = %s")
            update_values.append(email)

        if update_fields:
            update_values.append(user_id)
            cursor.execute(
                f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s",
                update_values,
            )

        update_fields = []
        update_values = []
        if role_type:
            update_fields.append("role_type = %s")
            update_values.append(role_type)
        if phone:
            update_fields.append("phone = %s")
            update_values.append(phone)
        if salary is not None:
            update_fields.append("salary = %s")
            update_values.append(salary)

        if update_fields:
            update_values.append(staff_id)
            cursor.execute(
                f"UPDATE staff_details SET {', '.join(update_fields)} WHERE id = %s",
                update_values,
            )

        conn.commit()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Update staff database error for id=%s", staff_id)
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    return jsonify({"message": "Staff updated successfully"}), 200


@admin_routes.route("/staff/<int:staff_id>", methods=["DELETE"])
@admin_required
def delete_staff(staff_id):
    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM staff_details WHERE id = %s", (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            return jsonify({"message": "Staff not found"}), 404
        user_id = staff[0]
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Delete staff database error for id=%s", staff_id)
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    return jsonify({"message": "Staff deleted successfully"}), 200


# ==================== ADMIN ROOM ALLOCATION ENDPOINTS ====================

@admin_routes.route("/allocate-room", methods=["POST"])
@admin_required
def allocate_room():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    room_id = data.get("room_id")
    if not user_id or not room_id:
        return jsonify({"message": "user_id and room_id are required"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute("SELECT id, room_number FROM users WHERE id = %s AND role = 'student'", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"message": "User not found or not a student"}), 404
        cursor.execute("SELECT room_no, capacity, occupied, status FROM rooms WHERE room_id = %s", (room_id,))
        room = cursor.fetchone()
        if not room:
            return jsonify({"message": "Room not found"}), 404
        if room['status'] != 'available':
            return jsonify({"message": "Room is not available for allocation"}), 400
        if room['occupied'] >= room['capacity']:
            return jsonify({"message": "Room is full"}), 400
        if user['room_number']:
            return jsonify({"message": "User already has a room"}), 400

        check_in = datetime.datetime.now().date()
        cursor.execute(
            "INSERT INTO allocations (user_id, room_id, check_in) VALUES (%s, %s, %s)",
            (user_id, room_id, check_in),
        )
        cursor.execute(
            "UPDATE rooms SET occupied = occupied + 1, status = %s WHERE room_id = %s",
            ("occupied" if room['occupied'] + 1 >= room['capacity'] else "available", room_id),
        )
        cursor.execute(
            "UPDATE users SET room_number = %s, status = 'active' WHERE id = %s",
            (room['room_no'], user_id),
        )
        conn.commit()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Allocate room database error")
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    return jsonify({"message": "Room allocated successfully"}), 200


@admin_routes.route("/deallocate-room", methods=["POST"])
@admin_required
def deallocate_room():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute("""
            SELECT a.allocation_id, a.room_id, r.room_no
            FROM allocations a
            JOIN rooms r ON a.room_id = r.room_id
            WHERE a.user_id = %s AND a.check_out IS NULL
        """, (user_id,))
        allocation = cursor.fetchone()
        if not allocation:
            return jsonify({"message": "No active allocation found"}), 404

        cursor.execute(
            "UPDATE allocations SET check_out = %s WHERE allocation_id = %s",
            (datetime.datetime.now().date(), allocation['allocation_id']),
        )
        cursor.execute(
            "UPDATE rooms SET occupied = occupied - 1 WHERE room_id = %s",
            (allocation['room_id'],),
        )
        cursor.execute("SELECT occupied, capacity FROM rooms WHERE room_id = %s", (allocation['room_id'],))
        room = cursor.fetchone()
        if room:
            new_occupied = room[0]
            capacity = room[1]
            new_status = 'available' if new_occupied < capacity else 'occupied'
            cursor.execute(
                "UPDATE rooms SET status = %s WHERE room_id = %s",
                (new_status, allocation['room_id']),
            )
        cursor.execute(
            "UPDATE users SET room_number = NULL, status = 'inactive' WHERE id = %s AND role = 'student'",
            (user_id,),
        )
        conn.commit()
    except MySQLdb.Error as exc:
        current_app.logger.exception("Deallocate room database error")
        if conn:
            conn.rollback()
        return jsonify({"message": "Database error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    return jsonify({"message": "Room deallocated successfully"}), 200


# ==================== WARDEN STAFF ENDPOINTS ====================

@admin_routes.route("/rooms", methods=["GET"])
@token_required
def get_rooms():
    role = g.user.get("role")
    if role not in {"admin", "warden"}:
        return jsonify({"message": "Access denied"}), 403
    
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute("""
            SELECT r.room_id, r.room_no, r.capacity,
                   COUNT(a.allocation_id) AS occupied,
                   CASE 
                       WHEN COUNT(a.allocation_id) = 0 THEN 'available'
                       WHEN COUNT(a.allocation_id) = r.capacity THEN 'occupied'
                       ELSE 'available'
                   END AS status
            FROM rooms r
            LEFT JOIN allocations a ON r.room_id = a.room_id AND a.check_out IS NULL
            GROUP BY r.room_id, r.room_no, r.capacity
            ORDER BY r.room_no
        """)
        rooms = cursor.fetchall()
        result = [{
            "room_id": r["room_id"],
            "room_no": r["room_no"],
            "capacity": r["capacity"],
            "occupied": r["occupied"],
            "status": r["status"],
        } for r in rooms]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        current_app.logger.exception("Get rooms database error")
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/rooms/summary", methods=["GET"])
@token_required
def get_rooms_summary():
    role = g.user.get("role")
    if role not in {"admin", "warden"}:
        return jsonify({"message": "Access denied"}), 403
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
    SELECT 
        COUNT(*) AS total_rooms,
        SUM(CASE WHEN occupied = 0 THEN 1 ELSE 0 END) AS available_rooms,
        SUM(CASE WHEN occupied > 0 AND occupied < capacity THEN 1 ELSE 0 END) AS partial_rooms,
        SUM(CASE WHEN occupied = capacity THEN 1 ELSE 0 END) AS occupied_rooms
    FROM (
        SELECT 
            r.room_id,
            r.capacity,
            COUNT(a.user_id) AS occupied
        FROM rooms r
        LEFT JOIN allocations a 
            ON r.room_id = a.room_id 
            AND a.check_out IS NULL
        GROUP BY r.room_id, r.capacity
     ) AS room_counts
    """)
        
        result = cursor.fetchone()
        if result:
            return jsonify({
                "totalRooms": result[0] or 0,
                "availableRooms": result[1] or 0,
                "partialRooms": result[2] or 0,
                "occupiedRooms": result[3] or 0,
            }), 200
        return jsonify({
            "totalRooms": 0,
            "availableRooms": 0,
            "occupiedRooms": 0,
        }), 200
    except MySQLdb.Error as e:
        current_app.logger.exception("Get rooms summary database error")
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/rooms/<int:room_id>", methods=["GET"])
@token_required
def get_room_details(room_id):
    role = g.user.get("role")
    if role not in {"admin", "warden"}:
        return jsonify({"message": "Access denied"}), 403
    
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        # Get room details with calculated occupancy
        cursor.execute("""
            SELECT r.room_id, r.room_no, r.capacity,
                   COUNT(a.allocation_id) AS occupied,
                   CASE 
                       WHEN COUNT(a.allocation_id) = 0 THEN 'available'
                       WHEN COUNT(a.allocation_id) = r.capacity THEN 'occupied'
                       ELSE 'partial'
                   END AS status
            FROM rooms r
            LEFT JOIN allocations a ON r.room_id = a.room_id AND a.check_out IS NULL
            WHERE r.room_id = %s
            GROUP BY r.room_id, r.room_no, r.capacity
        """, (room_id,))
        room = cursor.fetchone()
        
        if not room:
            return jsonify({"message": "Room not found"}), 404
        
        # Get students allocated to this room
        cursor.execute("""
            SELECT a.allocation_id, u.id, u.name, u.email
            FROM allocations a
            JOIN users u ON a.user_id = u.id
            WHERE a.room_id = %s AND a.check_out IS NULL
            ORDER BY u.name
        """, (room_id,))
        students = cursor.fetchall()
        
        result = {
            "room_id": room["room_id"],
            "room_no": room["room_no"],
            "capacity": room["capacity"],
            "occupied": room["occupied"],
            "status": room["status"],
            "students": [{
                "id": s["id"],
                "name": s["name"],
                "email": s["email"],
                "allocation_id": s["allocation_id"],
            } for s in students]
        }
        return jsonify(result), 200
    except MySQLdb.Error as e:
        current_app.logger.exception("Get room details database error for room_id=%s", room_id)
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/rooms", methods=["POST"])
@admin_required
def create_room():
    data = request.get_json(silent=True) or {}
    room_no = data.get("room_no")
    capacity = data.get("capacity")
    hostel_id = data.get("hostel_id", 1)
    
    if not room_no or not capacity:
        return jsonify({"message": "room_no and capacity are required"}), 400
    
    try:
        capacity = int(capacity)
        room_no = int(room_no)
    except (ValueError, TypeError):
        return jsonify({"message": "room_no and capacity must be numbers"}), 400
    
    if capacity < 1:
        return jsonify({"message": "Capacity must be at least 1"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT room_id FROM rooms WHERE room_no = %s", (room_no,))
        if cursor.fetchone():
            return jsonify({"message": "Room number already exists"}), 409
        
        cursor.execute(
            "INSERT INTO rooms (hostel_id, room_no, capacity) VALUES (%s, %s, %s)",
            (hostel_id, room_no, capacity)
        )
        conn.commit()
        room_id = cursor.lastrowid
        
        return jsonify({
            "message": "Room created successfully",
            "room_id": room_id,
            "room_no": room_no,
            "capacity": capacity,
        }), 201
    except MySQLdb.Error as e:
        current_app.logger.exception("Create room database error")
        if conn:
            conn.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/available-students", methods=["GET"])
@token_required
def get_available_students():
    role = g.user.get("role")
    if role not in {"admin", "warden"}:
        return jsonify({"message": "Access denied"}), 403
    
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute("""
            SELECT u.id, u.name, u.email
            FROM users u
            WHERE u.role = 'student'
            AND u.id NOT IN (
                SELECT DISTINCT user_id FROM allocations 
                WHERE check_out IS NULL
            )
            ORDER BY u.name
        """)
        students = cursor.fetchall()
        result = [{
            "id": s["id"],
            "name": s["name"],
            "email": s["email"],
        } for s in students]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        current_app.logger.exception("Get available students database error")
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/allocations", methods=["POST"])
@admin_required
def allocate_student():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    room_id = data.get("room_id")
    
    if not user_id or not room_id:
        return jsonify({"message": "user_id and room_id are required"}), 400
    
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        # Check if student already allocated
        cursor.execute(
            "SELECT allocation_id FROM allocations WHERE user_id = %s AND check_out IS NULL",
            (user_id,)
        )
        if cursor.fetchone():
            return jsonify({"message": "Student is already allocated to a room"}), 409
        
        # Check room exists and get capacity
        cursor.execute("SELECT capacity FROM rooms WHERE room_id = %s", (room_id,))
        room = cursor.fetchone()
        if not room:
            return jsonify({"message": "Room not found"}), 404
        
        # Check room is not full
        cursor.execute(
            "SELECT COUNT(*) as count FROM allocations WHERE room_id = %s AND check_out IS NULL",
            (room_id,)
        )
        occupancy = cursor.fetchone()["count"]
        if occupancy >= room["capacity"]:
            return jsonify({"message": "Room is at full capacity"}), 400
        
        # Allocate student
        check_in = datetime.datetime.now().strftime("%Y-%m-%d")
        cursor.execute(
            "INSERT INTO allocations (user_id, room_id, check_in) VALUES (%s, %s, %s)",
            (user_id, room_id, check_in)
        )
        conn.commit()
        
        return jsonify({
            "message": "Student allocated successfully",
            "allocation_id": cursor.lastrowid,
        }), 201
    except MySQLdb.Error as e:
        current_app.logger.exception("Allocate student database error")
        if conn:
            conn.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_routes.route("/allocations/<int:allocation_id>/remove", methods=["PUT"])
@admin_required
def remove_student_allocation(allocation_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check allocation exists
        cursor.execute(
            "SELECT allocation_id FROM allocations WHERE allocation_id = %s AND check_out IS NULL",
            (allocation_id,)
        )
        if not cursor.fetchone():
            return jsonify({"message": "Allocation not found or already removed"}), 404
        
        # Mark check_out
        check_out = datetime.datetime.now().strftime("%Y-%m-%d")
        cursor.execute(
            "UPDATE allocations SET check_out = %s WHERE allocation_id = %s",
            (check_out, allocation_id)
        )
        conn.commit()
        
        return jsonify({"message": "Student removed successfully"}), 200
    except MySQLdb.Error as e:
        current_app.logger.exception("Remove student database error")
        if conn:
            conn.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ==================== HEALTH CHECK ENDPOINTS ====================

@health_routes.route("/db", methods=["GET"])
def health_db():
    """Test database connectivity"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            return jsonify({
                "db_connection": "success",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "message": "Database is reachable"
            }), 200
    except MySQLdb.Error as e:
        current_app.logger.error(f"Database connection failed: {str(e)}")
        return jsonify({
            "db_connection": "failed",
            "error": str(e),
            "message": "Cannot connect to database"
        }), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error during DB check: {str(e)}")
        return jsonify({
            "db_connection": "failed",
            "error": str(e),
            "message": "Unexpected error"
        }), 500


@health_routes.route("/full-check", methods=["GET"])
def health_full_check():
    """Comprehensive system health check"""
    
    status = {
        "db_connection": "unknown",
        "tables_exist": "unknown",
        "users_table": "unknown",
        "auth_system": "unknown",
        "overall_status": "unknown",
        "details": {}
    }
    
    required_tables = ['users', 'rooms', 'hostels', 'allocations', 'payments', 
                       'complaints', 'attendance', 'salaries', 'staff_details']
    
    conn = None
    cursor = None
    
    try:
        # 1. Check DB connection
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            status["db_connection"] = "success"
            current_app.logger.info("DB Connection: SUCCESS")
        except Exception as e:
            status["db_connection"] = "failed"
            status["details"]["db_error"] = str(e)
            current_app.logger.error(f"DB Connection: FAILED - {str(e)}")
            return jsonify(status), 500
        
        # 2. Check table existence
        try:
            cursor.execute("""
                SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE()
            """)
            existing_tables = [row[0] for row in cursor.fetchall()]
            missing_tables = [t for t in required_tables if t not in existing_tables]
            
            if not missing_tables:
                status["tables_exist"] = "ok"
                status["details"]["tables_found"] = len(existing_tables)
                current_app.logger.info(f"Tables: OK ({len(existing_tables)} found)")
            else:
                status["tables_exist"] = "incomplete"
                status["details"]["missing_tables"] = missing_tables
                current_app.logger.warning(f"Missing tables: {missing_tables}")
        except Exception as e:
            status["tables_exist"] = "failed"
            status["details"]["table_check_error"] = str(e)
            current_app.logger.error(f"Table check failed: {str(e)}")
        
        # 3. Check users table and query
        try:
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            status["users_table"] = "ok"
            status["details"]["user_count"] = user_count
            current_app.logger.info(f"Users table: OK ({user_count} users)")
        except Exception as e:
            status["users_table"] = "failed"
            status["details"]["users_error"] = str(e)
            current_app.logger.error(f"Users table check failed: {str(e)}")
        
        # 4. Check authentication system
        try:
            cursor.execute("""
                SELECT COUNT(*) FROM users 
                WHERE password IS NOT NULL
            """)
            users_with_pwd = cursor.fetchone()[0]
            
            # Test password verification logic
            cursor.execute("""
                SELECT id, email, password FROM users 
                WHERE password IS NOT NULL LIMIT 1
            """)
            test_user = cursor.fetchone()
            
            if test_user:
                stored_pw = test_user[2]
                if isinstance(stored_pw, bytes):
                    stored_pw = stored_pw.decode("utf-8")
                
                # Check if it's a valid format
                is_werkzeug_hash = stored_pw.startswith("pbkdf2:")
                is_plaintext = len(stored_pw) > 0 and not stored_pw.startswith("pbkdf2:")
                
                auth_details = {
                    "total_users_with_password": users_with_pwd,
                    "password_format": "werkzeug_hash" if is_werkzeug_hash else "plain_text" if is_plaintext else "unknown",
                    "verification_logic": "operational"
                }
                status["auth_system"] = "ok"
                status["details"]["auth"] = auth_details
                current_app.logger.info(f"Auth system: OK (format: {auth_details['password_format']})")
            else:
                status["auth_system"] = "empty"
                status["details"]["auth"] = {"message": "No users with passwords found"}
                current_app.logger.info("Auth system: Empty (no users)")
        except Exception as e:
            status["auth_system"] = "failed"
            status["details"]["auth_error"] = str(e)
            current_app.logger.error(f"Auth check failed: {str(e)}")
        
        # 5. Determine overall status
        if (status["db_connection"] == "success" and 
            status["tables_exist"] in ["ok", "incomplete"] and
            status["users_table"] == "ok" and
            status["auth_system"] in ["ok", "empty"]):
            status["overall_status"] = "healthy"
            http_code = 200
        else:
            status["overall_status"] = "degraded"
            http_code = 200
        
        current_app.logger.info(f"System check complete: {status['overall_status']}")
        
        return jsonify(status), http_code
    
    except Exception as e:
        status["overall_status"] = "unhealthy"
        status["details"]["unexpected_error"] = str(e)
        current_app.logger.error(f"Unexpected error in health check: {str(e)}")
        return jsonify(status), 500
    
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if conn:
            try:
                conn.close()
            except:
                pass
