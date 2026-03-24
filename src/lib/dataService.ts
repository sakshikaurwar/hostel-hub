// Data service layer - replace localStorage calls with API calls for backend integration

export type UserRole = "Student" | "Staff" | "Admin";

export interface User {
  email: string;
  name: string;
  role: UserRole;
  room?: string;
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
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentEmail: string;
  studentName: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  markedBy: string;
}

export interface Payment {
  id: string;
  studentEmail: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "Paid" | "Unpaid" | "Overdue";
  paidDate?: string;
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

// Seed default data if empty
export function seedData() {
  if (!getStore("complaints").length) {
    const complaints: Complaint[] = [
      { id: "c1", title: "Water leakage in Room 204", description: "There is a constant water leak from the ceiling near the window.", category: "Maintenance", priority: "High", status: "Pending", createdBy: "student@hostel.com", createdAt: "2026-03-20" },
      { id: "c2", title: "Wi-Fi connectivity issues", description: "Wi-Fi drops every 30 minutes on the 3rd floor.", category: "IT", priority: "Medium", status: "In Progress", createdBy: "student@hostel.com", createdAt: "2026-03-18" },
      { id: "c3", title: "Broken window latch", description: "Window latch in Room 112 is broken and needs replacement.", category: "Maintenance", priority: "Low", status: "Resolved", createdBy: "student2@hostel.com", createdAt: "2026-03-15" },
    ];
    setStore("complaints", complaints);
  }

  if (!getStore("attendance").length) {
    const attendance: AttendanceRecord[] = [
      { id: "a1", studentEmail: "student@hostel.com", studentName: "John Doe", date: "2026-03-24", status: "Present", markedBy: "staff@hostel.com" },
      { id: "a2", studentEmail: "student@hostel.com", studentName: "John Doe", date: "2026-03-23", status: "Present", markedBy: "staff@hostel.com" },
      { id: "a3", studentEmail: "student@hostel.com", studentName: "John Doe", date: "2026-03-22", status: "Absent", markedBy: "staff@hostel.com" },
      { id: "a4", studentEmail: "student2@hostel.com", studentName: "Jane Smith", date: "2026-03-24", status: "Late", markedBy: "staff@hostel.com" },
      { id: "a5", studentEmail: "student@hostel.com", studentName: "John Doe", date: "2026-03-21", status: "Present", markedBy: "staff@hostel.com" },
      { id: "a6", studentEmail: "student@hostel.com", studentName: "John Doe", date: "2026-03-20", status: "Present", markedBy: "staff@hostel.com" },
    ];
    setStore("attendance", attendance);
  }

  if (!getStore("payments").length) {
    const payments: Payment[] = [
      { id: "p1", studentEmail: "student@hostel.com", description: "Hostel Fee - Semester 1", amount: 25000, dueDate: "2026-03-01", status: "Paid", paidDate: "2026-02-28" },
      { id: "p2", studentEmail: "student@hostel.com", description: "Mess Fee - March", amount: 5000, dueDate: "2026-03-15", status: "Unpaid" },
      { id: "p3", studentEmail: "student@hostel.com", description: "Laundry Fee - Q1", amount: 1500, dueDate: "2026-04-01", status: "Unpaid" },
    ];
    setStore("payments", payments);
  }
}

// Auth - replace with API call later
export function loginUser(email: string, _password: string): User | null {
  let role: UserRole = "Student";
  let name = "John Doe";
  if (email.includes("admin")) { role = "Admin"; name = "Admin User"; }
  else if (email.includes("staff")) { role = "Staff"; name = "Staff Member"; }
  
  const user: User = { email, name, role, room: role === "Student" ? "204" : undefined, phone: "+91 9876543210" };
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
  records.unshift({ ...record, id: "a" + Date.now() });
  setStore("attendance", records);
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
