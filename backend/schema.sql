CREATE DATABASE hostel_management;
USE hostel_management;

-- USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255),
    role ENUM('student','warden','admin') NOT NULL DEFAULT 'student',
    phone VARCHAR(20),
    age INT,
    address TEXT,
    year VARCHAR(10),
    department VARCHAR(100),
    branch VARCHAR(100),
    gender VARCHAR(20),
    room_number VARCHAR(10),
    status ENUM('active','inactive') DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HOSTELS
CREATE TABLE hostels (
    hostel_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_name VARCHAR(100),
    address TEXT,
    hostel_type VARCHAR(50),
    total_rooms INT,
    contact_no VARCHAR(15)
);

-- ROOMS
CREATE TABLE rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT,
    room_no INT,
    capacity INT,
    occupied INT DEFAULT 0,
    status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id)
);

-- ALLOCATIONS
CREATE TABLE allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    room_id INT,
    check_in DATE,
    check_out DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

-- PAYMENTS
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    description VARCHAR(255),
    amount DECIMAL(10,2),
    total_fees DECIMAL(10,2),
    due_date DATE,
    status ENUM('Paid','Unpaid','Overdue') DEFAULT 'Unpaid',
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SALARIES
CREATE TABLE salaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10,2),
    month VARCHAR(20),
    year INT,
    status ENUM('Paid','Unpaid') DEFAULT 'Unpaid',
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- COMPLAINTS
CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(100),
    description TEXT,
    category VARCHAR(100),
    priority ENUM('Low','Medium','High') DEFAULT 'Medium',
    status ENUM('Pending','In Progress','Resolved') DEFAULT 'Pending',
    room_number VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ATTENDANCE
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    date DATE,
    status ENUM('Present','Absent','Late') DEFAULT 'Present',
    marked_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id),
    UNIQUE KEY unique_attendance (user_id, date)
);

-- STAFF DETAILS
CREATE TABLE staff_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    role_type ENUM('Warden','Cleaner','Electrician','Security'),
    salary DECIMAL(10,2),
    join_date DATE,
    phone VARCHAR(15),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

