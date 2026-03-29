// Data service layer - replace localStorage calls with API calls for backend integration

export type UserRole = "Student" | "Warden" | "Admin";

export interface User {
  email: string;
  name: string;
  role: UserRole;
  room?: string;
  phone?: string;
  age?: number;
  address?: string;
  year?: string;
  department?: string;
  branch?: string;
  gender?: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  age?: number;
  address?: string;
  year?: string;
  department?: string;
  branch?: string;
  gender?: string;
  phone?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Resolved";
  createdBy: string;
  createdByName: string;
  roomNumber: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentEmail: string;
  studentName: string;
  roomNumber: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  markedBy: string;
}

export interface Payment {
  id: string;
  studentEmail: string;
  studentName: string;
  roomNumber: string;
  description: string;
  amount: number;
  totalFees: number;
  dueDate: string;
  status: "Paid" | "Unpaid" | "Overdue";
  paidDate?: string;
}

export interface RoomStudent {
  email: string;
  name: string;
  roomNumber: string;
}

function getStore<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Room-student mapping (3 students per room)
export function getRoomStudents(): RoomStudent[] {
  let data = getStore<RoomStudent>("roomStudents");
  if (!data.length) {
    data = [
      { email: "student1@hostel.com", name: "John Doe", roomNumber: "101" },
      { email: "student2@hostel.com", name: "Jane Smith", roomNumber: "101" },
      { email: "student3@hostel.com", name: "Raj Kumar", roomNumber: "101" },
      { email: "student4@hostel.com", name: "Priya Sharma", roomNumber: "102" },
      { email: "student5@hostel.com", name: "Amit Patel", roomNumber: "102" },
      { email: "student6@hostel.com", name: "Sara Khan", roomNumber: "102" },
      { email: "student7@hostel.com", name: "Vikram Singh", roomNumber: "201" },
      { email: "student8@hostel.com", name: "Neha Gupta", roomNumber: "201" },
      { email: "student9@hostel.com", name: "Arjun Reddy", roomNumber: "201" },
      { email: "student10@hostel.com", name: "Meera Nair", roomNumber: "202" },
      { email: "student11@hostel.com", name: "Karan Joshi", roomNumber: "202" },
      { email: "student12@hostel.com", name: "Ananya Das", roomNumber: "202" },
    ];
    setStore("roomStudents", data);
  }
  return data;
}

export function getRoomNumbers(): string[] {
  const students = getRoomStudents();
  return [...new Set(students.map(s => s.roomNumber))].sort();
}

export function getStudentsByRoom(roomNumber: string): RoomStudent[] {
  return getRoomStudents().filter(s => s.roomNumber === roomNumber);
}

// Seed default data if empty
export function seedData() {
  getRoomStudents(); // ensure room data exists

  if (!getStore("complaints").length) {
    const complaints: Complaint[] = [
      { id: "c1", title: "Water leakage in Room 204", description: "There is a constant water leak from the ceiling near the window.", category: "Maintenance", priority: "High", status: "Pending", createdBy: "student1@hostel.com", createdByName: "John Doe", roomNumber: "101", createdAt: "2026-03-20" },
      { id: "c2", title: "Wi-Fi connectivity issues", description: "Wi-Fi drops every 30 minutes on the 3rd floor.", category: "IT", priority: "Medium", status: "In Progress", createdBy: "student2@hostel.com", createdByName: "Jane Smith", roomNumber: "101", createdAt: "2026-03-18" },
      { id: "c3", title: "Broken window latch", description: "Window latch in Room 112 is broken and needs replacement.", category: "Maintenance", priority: "Low", status: "Resolved", createdBy: "student4@hostel.com", createdByName: "Priya Sharma", roomNumber: "102", createdAt: "2026-03-15" },
    ];
    setStore("complaints", complaints);
  }

  if (!getStore("attendance").length) {
    const attendance: AttendanceRecord[] = [
      { id: "a1", studentEmail: "student1@hostel.com", studentName: "John Doe", roomNumber: "101", date: "2026-03-24", status: "Present", markedBy: "staff@hostel.com" },
      { id: "a2", studentEmail: "student1@hostel.com", studentName: "John Doe", roomNumber: "101", date: "2026-03-23", status: "Present", markedBy: "staff@hostel.com" },
      { id: "a3", studentEmail: "student1@hostel.com", studentName: "John Doe", roomNumber: "101", date: "2026-03-22", status: "Absent", markedBy: "staff@hostel.com" },
      { id: "a4", studentEmail: "student2@hostel.com", studentName: "Jane Smith", roomNumber: "101", date: "2026-03-24", status: "Late", markedBy: "staff@hostel.com" },
      { id: "a5", studentEmail: "student1@hostel.com", studentName: "John Doe", roomNumber: "101", date: "2026-03-21", status: "Present", markedBy: "staff@hostel.com" },
      { id: "a6", studentEmail: "student1@hostel.com", studentName: "John Doe", roomNumber: "101", date: "2026-03-20", status: "Present", markedBy: "staff@hostel.com" },
    ];
    setStore("attendance", attendance);
  }

  if (!getStore("payments").length) {
    const payments: Payment[] = [
      { id: "p1", studentEmail: "student1@hostel.com", studentName: "John Doe", roomNumber: "101", description: "Hostel Fee - Semester 1", amount: 25000, totalFees: 50000, dueDate: "2026-03-01", status: "Paid", paidDate: "2026-02-28" },
      { id: "p2", studentEmail: "student1@hostel.com", studentName: "John Doe", roomNumber: "101", description: "Mess Fee - March", amount: 5000, totalFees: 5000, dueDate: "2026-03-15", status: "Unpaid" },
      { id: "p3", studentEmail: "student2@hostel.com", studentName: "Jane Smith", roomNumber: "101", description: "Hostel Fee - Semester 1", amount: 25000, totalFees: 50000, dueDate: "2026-03-01", status: "Paid", paidDate: "2026-02-25" },
      { id: "p4", studentEmail: "student2@hostel.com", studentName: "Jane Smith", roomNumber: "101", description: "Mess Fee - March", amount: 5000, totalFees: 5000, dueDate: "2026-03-15", status: "Unpaid" },
      { id: "p5", studentEmail: "student4@hostel.com", studentName: "Priya Sharma", roomNumber: "102", description: "Hostel Fee - Semester 1", amount: 25000, totalFees: 50000, dueDate: "2026-03-01", status: "Unpaid" },
      { id: "p6", studentEmail: "student5@hostel.com", studentName: "Amit Patel", roomNumber: "102", description: "Laundry Fee - Q1", amount: 1500, totalFees: 1500, dueDate: "2026-04-01", status: "Unpaid" },
    ];
    setStore("payments", payments);
  }
}

// Auth
export function signupUser(data: SignupData): User | null {
  const users = getStore<SignupData>("registeredUsers");
  if (users.find(u => u.email === data.email)) return null; // already exists
  users.push(data);
  setStore("registeredUsers", users);

  // If student, add to room mapping
  if (data.role === "Student") {
    const roomStudents = getRoomStudents();
    // Find a room with less than 3 students or create new room
    const roomCounts: Record<string, number> = {};
    roomStudents.forEach(s => { roomCounts[s.roomNumber] = (roomCounts[s.roomNumber] || 0) + 1; });
    let assignedRoom = "";
    for (const room of Object.keys(roomCounts).sort()) {
      if (roomCounts[room] < 3) { assignedRoom = room; break; }
    }
    if (!assignedRoom) {
      const maxRoom = Math.max(0, ...Object.keys(roomCounts).map(Number));
      assignedRoom = String(maxRoom + 1);
    }
    roomStudents.push({ email: data.email, name: data.name, roomNumber: assignedRoom });
    setStore("roomStudents", roomStudents);
  }

  const user = loginUser(data.email, data.password);
  return user;
}

export function loginUser(email: string, password: string): User | null {
  // Check registered users first
  const users = getStore<SignupData>("registeredUsers");
  const registered = users.find(u => u.email === email);

  if (registered) {
    if (registered.password !== password) return null;
    const roomStudents = getRoomStudents();
    const roomEntry = roomStudents.find(s => s.email === email);
    const user: User = {
      email: registered.email,
      name: registered.name,
      role: registered.role,
      room: roomEntry?.roomNumber,
      phone: registered.phone || "+91 9876543210",
      age: registered.age,
      address: registered.address,
      year: registered.year,
      department: registered.department,
      branch: registered.branch,
      gender: registered.gender,
    };
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    return user;
  }

  // Fallback: demo-style detection for seeded data
  let role: UserRole = "Student";
  let name = "John Doe";
  if (email.includes("admin")) { role = "Admin"; name = "Admin User"; }
  else if (email.includes("staff") || email.includes("warden")) { role = "Warden"; name = "Warden"; }

  const roomStudents = getRoomStudents();
  const roomEntry = roomStudents.find(s => s.email === email);

  const user: User = { email, name, role, room: roomEntry?.roomNumber || (role === "Student" ? "101" : undefined), phone: "+91 9876543210" };
  sessionStorage.setItem("currentUser", JSON.stringify(user));
  return user;
}

export function getCurrentUser(): User | null {
  try {
    const data = sessionStorage.getItem("currentUser");
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function logoutUser(): void {
  sessionStorage.removeItem("currentUser");
}

// Update user profile
export function updateUserProfile(email: string, updates: Partial<User>): User | null {
  // Update in registeredUsers
  const users = getStore<SignupData>("registeredUsers");
  const idx = users.findIndex(u => u.email === email);
  if (idx !== -1) {
    Object.assign(users[idx], updates);
    setStore("registeredUsers", users);
  }

  // Update current session
  const current = getCurrentUser();
  if (current && current.email === email) {
    const updated = { ...current, ...updates };
    sessionStorage.setItem("currentUser", JSON.stringify(updated));
    return updated;
  }
  return current;
}

// Complaints
export function getComplaints(userEmail?: string): Complaint[] {
  const all = getStore<Complaint>("complaints");
  return userEmail ? all.filter(c => c.createdBy === userEmail) : all;
}

export function addComplaint(complaint: Omit<Complaint, "id" | "createdAt" | "status">): Complaint {
  const complaints = getStore<Complaint>("complaints");
  const newComplaint: Complaint = { ...complaint, id: "c" + Date.now(), status: "Pending", createdAt: new Date().toISOString().split("T")[0] };
  complaints.unshift(newComplaint);
  setStore("complaints", complaints);
  return newComplaint;
}

export function updateComplaintStatus(id: string, status: Complaint["status"]): void {
  const complaints = getStore<Complaint>("complaints");
  const idx = complaints.findIndex(c => c.id === id);
  if (idx !== -1) { complaints[idx].status = status; setStore("complaints", complaints); }
}

// Attendance
export function getAttendance(studentEmail?: string): AttendanceRecord[] {
  const all = getStore<AttendanceRecord>("attendance");
  return studentEmail ? all.filter(a => a.studentEmail === studentEmail) : all;
}

export function getAttendancePercentage(studentEmail: string): number {
  const records = getAttendance(studentEmail);
  if (!records.length) return 0;
  const present = records.filter(r => r.status === "Present" || r.status === "Late").length;
  return Math.round((present / records.length) * 100);
}

export function markAttendance(record: Omit<AttendanceRecord, "id">): void {
  const records = getStore<AttendanceRecord>("attendance");
  // Prevent duplicate for same student + date
  const exists = records.find(r => r.studentEmail === record.studentEmail && r.date === record.date);
  if (exists) {
    exists.status = record.status;
    setStore("attendance", records);
    return;
  }
  records.unshift({ ...record, id: "a" + Date.now() + Math.random().toString(36).slice(2, 5) });
  setStore("attendance", records);
}

export function markBulkAttendance(records: Omit<AttendanceRecord, "id">[]): void {
  records.forEach(r => markAttendance(r));
}

// Payments
export function getPayments(studentEmail?: string): Payment[] {
  const all = getStore<Payment>("payments");
  return studentEmail ? all.filter(p => p.studentEmail === studentEmail) : all;
}

export function markPaymentPaid(id: string): void {
  const payments = getStore<Payment>("payments");
  const idx = payments.findIndex(p => p.id === id);
  if (idx !== -1) { payments[idx].status = "Paid"; payments[idx].paidDate = new Date().toISOString().split("T")[0]; setStore("payments", payments); }
}

export function updatePaymentFees(studentEmail: string, totalFees: number, pendingFees: number): void {
  const payments = getStore<Payment>("payments");
  const studentPayments = payments.filter(p => p.studentEmail === studentEmail);
  if (studentPayments.length > 0) {
    studentPayments[0].totalFees = totalFees;
    studentPayments[0].amount = pendingFees;
    if (pendingFees <= 0) {
      studentPayments[0].status = "Paid";
    } else {
      studentPayments[0].status = "Unpaid";
    }
    setStore("payments", payments);
  }
}

// Summary stats
export function getDashboardStats(user: User) {
  const complaints = user.role === "Student" ? getComplaints(user.email) : getComplaints();
  const payments = user.role === "Student" ? getPayments(user.email) : getPayments();
  const attendance = user.role === "Student" ? getAttendancePercentage(user.email) : 0;

  const totalComplaints = complaints.length;
  const pendingIssues = complaints.filter(c => c.status !== "Resolved").length;
  const unpaidAmount = payments.filter(p => p.status === "Unpaid" || p.status === "Overdue").reduce((s, p) => s + p.amount, 0);

  return { totalComplaints, pendingIssues, attendancePercent: attendance, unpaidAmount, feeStatus: unpaidAmount > 0 ? "Due" : "Clear" };
}
