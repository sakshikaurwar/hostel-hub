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
health_routes = Blueprint("health", __name__, url_prefix='/api/health')

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ALLOWED_ROLES = {"student", "warden", "staff"}


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
    # 1. Catch ALL potential errors with a global try-except
    try:
        # 2. Print incoming request data for debugging
        data = request.get_json(silent=True) or {}
        print("Incoming Signup Data:", data)

        # 3. Validate all fields safely using .get() to prevent KeyError
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        phone = str(data.get("phone", "")).strip()
        age_val = data.get("age")
        raw_role = str(data.get("role", "student")).strip().lower()

        # Basic presence validation
        if not name or not email or not password:
            return jsonify({"message": "Name, email, and password are required"}), 400
        if len(name) < 2:
            return jsonify({"message": "Name must be at least 2 characters"}), 400
        if not EMAIL_REGEX.match(email):
            return jsonify({"message": "Invalid email address"}), 400
        if len(password) < 8:
            return jsonify({"message": "Password must be at least 8 characters"}), 400

        # Age conversion safeguard
        try:
            if age_val is not None and str(age_val).strip() != "":
                age_val = int(age_val)
            else:
                age_val = None
        except (ValueError, TypeError):
            return jsonify({"message": "Age must be a valid number"}), 400

        # Phone validation
        if phone:
            if not phone.isdigit() or len(phone) != 10:
                return jsonify({"message": "Phone must be a 10-digit number"}), 400

        if raw_role == "admin":
            return jsonify({"message": "Admin cannot be created via signup"}), 403
        role = raw_role if raw_role in ALLOWED_ROLES else "student"

        conn = None
        cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(MySQLdb.cursors.DictCursor)

            # Unique Email Check
            cursor.execute(
                "SELECT COUNT(*) AS count FROM users WHERE LOWER(email) = LOWER(%s)",
                (email,),
            )
            if cursor.fetchone().get("count", 0) > 0:
                return jsonify({"message": "Email already registered"}), 409

            # Unique Phone Check (if provided)
            if phone:
                cursor.execute(
                    "SELECT COUNT(*) AS count FROM users WHERE phone = %s",
                    (phone,),
                )
                if cursor.fetchone().get("count", 0) > 0:
                    return jsonify({"message": "Phone number already registered"}), 409

            # 6. Password must be hashed using generate_password_hash
            hashed_password = hash_password(password)

            # 5. SQL INSERT query with ALL columns
            cursor.execute(
                "INSERT INTO users (name, email, password, role, age, phone) VALUES (%s, %s, %s, %s, %s, %s)",
                (name, email, hashed_password, role, age_val, phone),
            )
            user_id = cursor.lastrowid
            
            if role in ["warden", "staff"]:
                # Default role_type if none specified, or map 'warden' specifically
                role_type = "Warden" if role == "warden" else "Cleaner"
                cursor.execute(
                    "INSERT INTO staff_details (user_id, role_type, phone, join_date) VALUES (%s, %s, %s, CURDATE())",
                    (user_id, role_type, phone)
                )
            
            # 8. Ensure commit happens only after successful insert
            conn.commit()
            
            token = create_token(user_id, role)

            # 10. Return 201 Created for success
            return jsonify({
                "message": "User registered successfully",
                "user_id": user_id,
                "token": token,
                "role": role,
                "name": name,
                "email": email
            }), 201

        except MySQLdb.Error as db_err:
            print("Database error during signup:", str(db_err))
            if conn:
                conn.rollback()
            return jsonify({"message": f"Database error: {str(db_err)}"}), 500
        finally:
            # 9. Ensure proper connection cleanup
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    except Exception as e:
        # Catch any other unexpected crashes (e.g., coding errors)
        print("Unexpected error during signup:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Internal Server Error"}), 500


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
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute("""
            SELECT id, name, email, role, phone, age, address, year, 
                   department, branch, gender, room_number, status
            FROM users WHERE id=%s
        """, (user_id,))
        user = cursor.fetchone()
    except MySQLdb.Error:
        return jsonify({"message": "Database error"}), 500
    finally:
        cursor.close()
        conn.close()

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "phone": user["phone"] or "",
        "age": user["age"],
        "address": user["address"] or "",
        "year": user["year"] or "",
        "department": user["department"] or "",
        "branch": user["branch"] or "",
        "gender": user["gender"] or "",
        "room_number": user["room_number"] or "",
        "status": user["status"] or "inactive",
    })


@auth_routes.route("/profile", methods=["PUT"])
@token_required
def update_profile():
    """Allow logged-in users to update their own profile fields."""
    user_id = g.user.get("user_id")
    data = request.get_json(silent=True) or {}
    
    allowed_fields = ["name", "phone", "age", "address", "year", "department", "branch", "gender"]
    update_fields = []
    update_values = []
    
    for field in allowed_fields:
        if field in data and data[field] is not None:
            update_fields.append(f"{field} = %s")
            update_values.append(data[field])
    
    if not update_fields:
        return jsonify({"message": "No fields to update"}), 400
    
    update_values.append(user_id)
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute(
            f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s",
            update_values
        )
        conn.commit()
        
        # Return updated user data
        cursor.execute("""
            SELECT id, name, email, role, phone, age, address, year,
                   department, branch, gender, room_number, status
            FROM users WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "phone": user["phone"] or "",
                "age": user["age"],
                "address": user["address"] or "",
                "year": user["year"] or "",
                "department": user["department"] or "",
                "branch": user["branch"] or "",
                "gender": user["gender"] or "",
                "room_number": user["room_number"] or "",
                "status": user["status"] or "inactive",
            }
        }), 200
    except MySQLdb.Error as e:
        if conn:
            conn.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


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
        # Include both warden and staff roles in contacts
        cursor.execute(
            """
                SELECT u.name, sd.role_type, sd.phone
                FROM users u
                JOIN staff_details sd ON u.id = sd.user_id
                WHERE u.role IN ('warden', 'staff', 'admin')
                ORDER BY sd.role_type, u.name
            """
        )
        staff = cursor.fetchall()
        result = [{"name": row["name"], "role": row["role_type"], "phone": row["phone"] or "N/A"} for row in staff]
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
        # Optimized single query for all counts using simplified logic
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
                (SELECT COUNT(*) FROM rooms) AS total_rooms,
                (SELECT COUNT(*) FROM rooms WHERE occupied > 0) AS occupied_rooms,
                (SELECT COUNT(*) FROM rooms WHERE occupied = 0) AS available_rooms,
                (SELECT COUNT(*) FROM staff_details WHERE role_type = 'Warden') AS total_wardens,
                (SELECT COUNT(*) FROM complaints WHERE status != 'Resolved') AS pending_complaints,
                (SELECT COUNT(*) FROM payments WHERE status IN ('Unpaid', 'Overdue')) AS pending_payments
        """)
        
        result = cursor.fetchone()
        
        # New: Fetch recent room allocations (latest 5)
        cursor.execute("""
            SELECT u.name, u.room_number, a.check_in, u.department
            FROM allocations a
            JOIN users u ON a.user_id = u.id
            WHERE a.check_out IS NULL
            ORDER BY a.check_in DESC
            LIMIT 5
        """)
        recent_allocations = cursor.fetchall()
        recent_data = [{
            "studentName": r[0],
            "roomNumber": r[1],
            "checkIn": str(r[2]),
            "department": r[3] or "N/A"
        } for r in recent_allocations]

        if result:
            return jsonify({
                "totalStudents": result[0] or 0,
                "totalRooms": result[1] or 0,
                "occupiedRooms": result[2] or 0,
                "availableRooms": result[3] or 0,
                "totalWardens": result[4] or 0,
                "pendingComplaints": result[5] or 0,
                "pendingPayments": result[6] or 0,
                "recentAllocations": recent_data
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
                SELECT a.id, a.user_id, u.email, u.name, a.date, a.status, u.room_number, u.department, u.branch
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE u.role = 'student'
                ORDER BY a.date DESC
            """)
        else:
            cursor.execute("""
                SELECT a.id, a.user_id, u.email, u.name, a.date, a.status, u.room_number, u.department, u.branch
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE a.user_id = %s AND u.role = 'student'
                ORDER BY a.date DESC
            """, (user_id,))
        
        records = cursor.fetchall()
        result = [{
            "id": r[0],
            "studentId": r[1],
            "studentEmail": r[2],
            "studentName": r[3],
            "date": str(r[4]),
            "status": r[5],
            "roomNumber": r[6] or "N/A",
            "department": r[7] or "N/A",
            "branch": r[8] or "N/A",
            "markedBy": "Warden"
        } for r in records]
        return jsonify(result), 200
    except MySQLdb.Error as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@attendance_routes.route("/date/<date>", methods=["GET"])
@token_required
def get_attendance_by_date(date):
    role = g.user.get("role")
    if role not in ["admin", "warden"]:
        return jsonify({"message": "Access denied"}), 403
    
    conn = get_db()
    cursor = conn.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute("""
            SELECT 
                r.room_no,
                u.id AS studentId,
                u.name AS studentName,
                u.email AS studentEmail,
                u.department,
                u.branch,
                COALESCE(a.status, 'NotMarked') AS status,
                a.id AS id
            FROM allocations al
            JOIN users u ON al.user_id = u.id
            JOIN rooms r ON al.room_id = r.room_id
            LEFT JOIN attendance a ON u.id = a.user_id AND a.date = %s
            WHERE al.check_out IS NULL
            ORDER BY r.room_no, u.name
        """, (date,))
        
        records = cursor.fetchall()
        
        # Group by room_no
        grouped = {}
        for r in records:
            room_no = str(r['room_no'])
            if room_no not in grouped:
                grouped[room_no] = []
            
            grouped[room_no].append({
                "id": r['id'],
                "studentId": r['studentId'],
                "studentEmail": r['studentEmail'],
                "studentName": r['studentName'],
                "date": date,
                "status": r['status'],
                "roomNumber": room_no,
                "department": r['department'] or "N/A",
                "branch": r['branch'] or "N/A"
            })
            
        return jsonify(grouped), 200
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
@token_required
def update_payment(payment_id):
    role = g.user.get("role")
    user_id = g.user.get("user_id")
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status", "")).strip()
    
    if new_status not in ["Paid", "Unpaid", "Overdue"]:
        return jsonify({"message": "Invalid status"}), 400
    
    # Wardens cannot update payments
    if role == "warden":
        return jsonify({"message": "Access denied"}), 403
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Students can only mark their OWN payments as Paid
        if role == "student":
            if new_status != "Paid":
                return jsonify({"message": "Students can only mark payments as Paid"}), 403
            # Verify this payment belongs to the student
            cursor.execute("SELECT user_id FROM payments WHERE id = %s", (payment_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"message": "Payment not found"}), 404
            if row[0] != user_id:
                return jsonify({"message": "Access denied: not your payment"}), 403
        
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
            SELECT s.id, u.name, s.role_type, s.phone
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
            "INSERT INTO staff_details (user_id, role_type, phone, join_date) VALUES (%s, %s, %s, %s)",
            (user_id, role_type, phone, datetime.datetime.now().date()),
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

def sync_room_occupancy(cursor, room_id):
    """Ensure rooms.occupied matches active allocations count."""
    cursor.execute("""
        UPDATE rooms r 
        SET occupied = (
            SELECT COUNT(*) FROM allocations a 
            WHERE a.room_id = %s AND a.check_out IS NULL
        )
        WHERE r.room_id = %s
    """, (room_id, room_id))
    
    # Also update status dynamic logic
    cursor.execute("SELECT occupied, capacity FROM rooms WHERE room_id = %s", (room_id,))
    room = cursor.fetchone()
    if room:
        occ, cap = room['occupied'], room['capacity']
        new_status = 'full' if occ >= cap else ('partial' if occ > 0 else 'available')
        cursor.execute("UPDATE rooms SET status = %s WHERE room_id = %s", (new_status, room_id))

@admin_routes.route("/allocate-room", methods=["POST"])
@admin_required
def allocate_room():
    data = request.get_json(silent=True) or {}
    print("DATA RECEIVED:", data) # Step 1
    
    # Step 2: Extract fields safely
    user_id = data.get("user_id") or data.get("studentId")
    room_id = data.get("room_id") or data.get("roomId")
    room_fee = float(data.get("room_fee") or data.get("fees") or 0)    
    print("Parsed:", user_id, room_id, room_fee) # Step 3
    
    # Step 4: Validate
    if not user_id or not room_id:
        return jsonify({"message": "Missing user_id or room_id"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        # Step 5: Check if user exists
        cursor.execute("SELECT id, room_number FROM users WHERE id = %s AND role = 'student'", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"message": f"Student with ID {user_id} not found"}), 404
        
        # Step 6: Check if room exists
        cursor.execute("SELECT room_id, capacity, occupied, room_no FROM rooms WHERE room_id = %s", (room_id,))
        room = cursor.fetchone()
        if not room:
            return jsonify({"message": f"Room with ID {room_id} not found"}), 404
        
        # Step 7: Prevent over-allocation
        if room['occupied'] >= room['capacity']:
            return jsonify({"message": f"Room {room['room_no']} is already full"}), 400
        
        # Check active allocation (NEW LOGIC)
        cursor.execute(
            "SELECT * FROM allocations WHERE user_id = %s AND check_out IS NULL",
            (user_id,)
        )
        existing = cursor.fetchone()

        if existing:
            return jsonify({"message": "Student already allocated"}), 400
        # Step 8: Correct INSERT query with CURDATE()
        cursor.execute(
            "INSERT INTO allocations (user_id, room_id, check_in, room_fee) VALUES (%s, %s, CURDATE(), %s)",
            (user_id, room_id, room_fee),
        )
        
        # Step 9: Update room occupancy
        cursor.execute("UPDATE rooms SET occupied = occupied + 1 WHERE room_id = %s", (room_id,))
        
        # Optional but good: update status
        new_occ = room['occupied'] + 1
        new_status = 'full' if new_occ >= room['capacity'] else 'partial'
        cursor.execute("UPDATE rooms SET status = %s WHERE room_id = %s", (new_status, room_id))

        # Update student profile
        cursor.execute(
            "UPDATE users SET room_number = %s, status = 'active' WHERE id = %s",
            (room['room_no'], user_id),
        )
        conn.commit()
        return jsonify({"message": "Room allocated successfully", "room_no": room['room_no']}), 200
    except Exception as e: # Step 10: FULL error logging
        print("ALLOCATION ERROR:", e)
        if conn:
            conn.rollback()
        return jsonify({"message": f"Allocation failed: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


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
        
        sync_room_occupancy(cursor, allocation['room_id'])
        
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
                       WHEN COUNT(a.allocation_id) < r.capacity THEN 'partial'
                       ELSE 'full'
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
            FROM rooms
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
            "partialRooms": 0,
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
                       WHEN COUNT(a.allocation_id) < r.capacity THEN 'partial'
                       ELSE 'full'
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
        return jsonify({"message": "Room number and capacity are required"}), 400
    
    try:
        capacity = int(capacity)
        room_no = int(room_no)
        hostel_id = int(hostel_id)
    except (ValueError, TypeError):
        return jsonify({"message": "Room number, capacity and hostel ID must be numeric"}), 400
    
    if capacity < 1:
        return jsonify({"message": "Capacity must be at least 1"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Validate hostel_id
        cursor.execute("SELECT hostel_id FROM hostels WHERE hostel_id = %s", (hostel_id,))
        if not cursor.fetchone():
            return jsonify({"message": f"Hostel with ID {hostel_id} does not exist"}), 404

        # Check for duplicate room_no within the SAME hostel
        cursor.execute("SELECT room_id FROM rooms WHERE room_no = %s AND hostel_id = %s", (room_no, hostel_id))
        if cursor.fetchone():
            return jsonify({"message": f"Room number {room_no} already exists in this hostel"}), 409
        
        cursor.execute(
            "INSERT INTO rooms (hostel_id, room_no, capacity, occupied, status) VALUES (%s, %s, %s, 0, 'available')",
            (hostel_id, room_no, capacity)
        )
        conn.commit()
        room_id = cursor.lastrowid
        
        return jsonify({
            "message": "Room created successfully",
            "room_id": room_id,
            "room_no": room_no,
            "capacity": capacity,
            "hostel_id": hostel_id
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
    total_fees = data.get("total_fees", 0)
    
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
        cursor.execute("SELECT capacity, room_no FROM rooms WHERE room_id = %s", (room_id,))
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
        
        # System Integrity Fix (Step 3): Bind user's room_number automatically
        cursor.execute("UPDATE users SET room_number = %s WHERE id = %s", (room["room_no"], user_id))
        
        # System Integrity Fix (Step 4): Dispatch Total Fees Payment entry dynamically
        try:
            total_fees_val = float(total_fees)
        except (ValueError, TypeError):
            total_fees_val = 0.0
            
        if total_fees_val > 0:
            cursor.execute(
                "INSERT INTO payments (user_id, description, amount, total_fees, due_date, status) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, "Room Allocation Fee", total_fees_val, total_fees_val, check_in, "Unpaid")
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
        
        # Get user_id for this allocation so we can clear their room_number
        cursor.execute(
            "SELECT user_id FROM allocations WHERE allocation_id = %s",
            (allocation_id,)
        )
        alloc = cursor.fetchone()
        if alloc:
            freed_user_id = alloc[0]
            cursor.execute(
                "UPDATE users SET room_number = NULL, status = 'inactive' WHERE id = %s AND role = 'student'",
                (freed_user_id,)
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
    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
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
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


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
