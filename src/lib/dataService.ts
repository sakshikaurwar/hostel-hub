// Data service layer - replace localStorage calls with API calls for backend integration

export type UserRole = "student" | "warden" | "admin";

export interface User {
  id: number;
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
  role: "student" | "warden";
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

export interface Student {
  id: number;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  year?: string;
  room_number?: string;
  status: 'active' | 'inactive';
}

export interface Staff {
  id: number;
  name: string;
  role_type: 'Warden' | 'Cleaner' | 'Electrician' | 'Security';
  phone?: string;
  salary?: number;
}

export interface WardenStaff {
  name: string;
  role_type: string;
  phone?: string;
}

export interface StaffContact {
  name: string;
  role: string;
  phone?: string;
}

export interface Salary {
  id: string;
  staffId: number;
  roleType: string;
  staffName: string;
  monthYear: string;
  amount: number;
  status: "Paid" | "Unpaid";
  paidDate?: string;
}

export interface RoomStudent {
  email: string;
  name: string;
  roomNumber: string;
}

export interface Room {
  room_id: number;
  room_no: number;
  capacity: number;
  occupied: number;
  status: string;
  hostel_id?: number;
}

// Removed localStorage functions - now using API calls

// For compatibility with existing code
export function getRoomStudents(): RoomStudent[] {
  return [];
}

export function getRoomNumbers(): string[] {
  return [];
}

export function getStudentsByRoom(roomNumber: string): RoomStudent[] {
  return [];
}

// Seed data is no longer needed - all data comes from backend
export function seedData() {
  // Data is now managed by backend
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const TOKEN_KEY = "authToken";
const USER_KEY = "currentUser";

interface AuthLoginResponse {
  message: string;
  role: UserRole;
  user_id: number;
  name: string;
  email: string;
  token: string;
}

interface AuthSignupResponse {
  message: string;
  role: UserRole;
  user_id: number;
  name: string;
  email: string;
  token: string;
}

function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function removeAuthToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

function getUserStorage(): User | null {
  try {
    const data = sessionStorage.getItem(USER_KEY);
    return data ? (JSON.parse(data) as User) : null;
  } catch {
    return null;
  }
}

function setUserStorage(user: User): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.message || response.statusText || "Request failed";
    throw new Error(errorMessage);
  }

  return response.json();
}

async function postJson<T>(endpoint: string, body: unknown, useAuth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useAuth) {
    Object.assign(headers, authHeaders());
  }

  return fetchJson<T>(`${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function putJson<T>(endpoint: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };

  return fetchJson<T>(`${endpoint}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}

export async function getJson<T>(endpoint: string): Promise<T> {
  const headers = authHeaders();
  return fetchJson<T>(endpoint, {
    method: "GET",
    headers,
  });
}

export async function signupUser(data: SignupData): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const result = await postJson<AuthSignupResponse>("/api/auth/signup", {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
      age: data.age,
      address: data.address,
      year: data.year,
      department: data.department,
      branch: data.branch,
      gender: data.gender,
      phone: data.phone,
    });
    const user: User = {
      id: result.user_id,
      email: result.email,
      name: result.name,
      role: result.role,
      phone: data.phone,
      age: data.age,
      address: data.address,
      year: data.year,
      department: data.department,
      branch: data.branch,
      gender: data.gender,
    };
    setUserStorage(user);
    setAuthToken(result.token);
    return { success: true, message: result.message, user };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Signup failed" };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: true; user: User } | { success: false; message: string }> {
  try {
    const result = await postJson<AuthLoginResponse>("/api/auth/login", { email, password });
    const user: User = {
      id: result.user_id,
      email: result.email,
      name: result.name,
      role: result.role,
    };
    setUserStorage(user);
    setAuthToken(result.token);
    return { success: true, user };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Login failed" };
  }
}

export function getCurrentUser(): User | null {
  const token = getAuthToken();
  if (!token) return null;
  return getUserStorage();
}

export function logoutUser(): void {
  removeAuthToken();
  sessionStorage.removeItem(USER_KEY);
}

// Update user profile
export async function updateUserProfile(email: string, updates: Partial<User>): Promise<User | null> {
  try {
    const current = getCurrentUser();
    if (current && current.email === email) {
      const updated = { ...current, ...updates };
      setUserStorage(updated);
      return updated;
    }
    return current;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return null;
  }
}

// Complaints
export async function getComplaints(userEmail?: string): Promise<Complaint[]> {
  try {
    const result = await fetchJson<any[]>("/api/complaints");
    
    if (userEmail) {
      return result.filter(c => c.createdBy === userEmail).map(c => ({
        id: String(c.id),
        title: c.title,
        description: c.description,
        category: c.category,
        priority: c.priority,
        status: c.status,
        createdBy: c.createdBy,
        createdByName: c.createdByName,
        roomNumber: c.roomNumber,
        createdAt: c.createdAt,
      }));
    }
    
    return result.map(c => ({
      id: String(c.id),
      title: c.title,
      description: c.description,
      category: c.category,
      priority: c.priority,
      status: c.status,
      createdBy: c.createdBy,
      createdByName: c.createdByName,
      roomNumber: c.roomNumber,
      createdAt: c.createdAt,
    }));
  } catch (error) {
    console.error("Failed to fetch complaints:", error);
    return [];
  }
}

export async function addComplaint(
  complaint: Omit<Complaint, "id" | "createdAt" | "status">
): Promise<Complaint | null> {
  try {
    const result = await postJson<any>("/api/complaints", {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      roomNumber: complaint.roomNumber,
    }, true);

    const user = getCurrentUser();
    return {
      id: String(result.id),
      title: result.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      status: "Pending",
      createdBy: user?.email || "",
      createdByName: user?.name || "",
      roomNumber: complaint.roomNumber,
      createdAt: new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to add complaint:", error);
    return null;
  }
}

export async function updateComplaintStatus(id: string, status: Complaint["status"]): Promise<void> {
  try {
    await putJson(`/api/complaints/${id}`, { status });
  } catch (error) {
    console.error("Failed to update complaint:", error);
  }
}

// Attendance
export async function getAttendance(studentEmail?: string): Promise<AttendanceRecord[]> {
  try {
    const result = await fetchJson<any[]>("/api/attendance");
    
    if (studentEmail) {
      return result.filter(a => a.studentEmail === studentEmail).map(a => ({
        id: String(a.id),
        studentEmail: a.studentEmail,
        studentName: a.studentName,
        roomNumber: a.roomNumber,
        date: a.date,
        status: a.status,
        markedBy: a.markedBy,
      }));
    }
    
    return result.map(a => ({
      id: String(a.id),
      studentEmail: a.studentEmail,
      studentName: a.studentName,
      roomNumber: a.roomNumber,
      date: a.date,
      status: a.status,
      markedBy: a.markedBy,
    }));
  } catch (error) {
    console.error("Failed to fetch attendance:", error);
    return [];
  }
}

export async function getAttendancePercentage(userId?: number): Promise<number> {
  try {
    if (!userId) return 0;
    const result = await fetchJson<{ percentage: number }>(`/api/attendance/percentage/${userId}`);
    return result.percentage;
  } catch (error) {
    console.error("Failed to fetch attendance percentage:", error);
    return 0;
  }
}

export async function markAttendance(record: Omit<AttendanceRecord, "id">): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user?.id) return;
    
    await postJson(
      "/api/attendance",
      {
        studentId: user.id,
        date: record.date,
        status: record.status,
      },
      true
    );
  } catch (error) {
    console.error("Failed to mark attendance:", error);
  }
}

export async function markBulkAttendance(records: Omit<AttendanceRecord, "id">[]): Promise<void> {
  try {
    for (const record of records) {
      await markAttendance(record);
    }
  } catch (error) {
    console.error("Failed to mark bulk attendance:", error);
  }
}

// Payments
export async function getPayments(studentEmail?: string): Promise<Payment[]> {
  try {
    const result = await fetchJson<any[]>("/api/payments");
    
    if (studentEmail) {
      return result.filter(p => p.studentEmail === studentEmail).map(p => ({
        id: String(p.id),
        studentEmail: p.studentEmail,
        studentName: p.studentName,
        roomNumber: p.roomNumber,
        description: p.description,
        amount: p.amount,
        totalFees: p.totalFees,
        dueDate: p.dueDate,
        status: p.status,
        paidDate: p.paidDate,
      }));
    }
    
    return result.map(p => ({
      id: String(p.id),
      studentEmail: p.studentEmail,
      studentName: p.studentName,
      roomNumber: p.roomNumber,
      description: p.description,
      amount: p.amount,
      totalFees: p.totalFees,
      dueDate: p.dueDate,
      status: p.status,
      paidDate: p.paidDate,
    }));
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return [];
  }
}

export async function markPaymentPaid(id: string): Promise<void> {
  try {
    await putJson(`/api/payments/${id}`, { status: "Paid" });
  } catch (error) {
    console.error("Failed to mark payment as paid:", error);
  }
}

export async function updatePaymentFees(
  studentEmail: string,
  totalFees: number,
  pendingFees: number
): Promise<void> {
  try {
    const payments = await getPayments(studentEmail);
    if (payments.length > 0) {
      await putJson(`/api/payments/${payments[0].id}`, {
        totalFees,
        amount: pendingFees,
        status: pendingFees <= 0 ? "Paid" : "Unpaid",
      });
    }
  } catch (error) {
    console.error("Failed to update payment fees:", error);
  }
}

// Students
export async function getStudents(): Promise<Student[]> {
  try {
    const result = await getJson<any[]>("/api/admin/students");
    return result.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      department: s.department,
      year: s.year,
      room_number: s.room_number,
      status: s.status,
    }));
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return [];
  }
}

export async function createStudent(student: Omit<Student, "id">): Promise<Student | null> {
  try {
    const result = await postJson<any>("/api/admin/students", student, true);
    return {
      id: result.id,
      name: result.name,
      email: result.email,
      phone: student.phone,
      department: student.department,
      year: student.year,
      room_number: student.room_number,
      status: student.status,
    };
  } catch (error) {
    console.error("Failed to create student:", error);
    return null;
  }
}

export async function updateStudent(id: number, updates: Partial<Student>): Promise<void> {
  try {
    await putJson(`/api/admin/students/${id}`, updates);
  } catch (error) {
    console.error("Failed to update student:", error);
  }
}

export async function deleteStudent(id: number): Promise<void> {
  try {
    await fetchJson(`/api/admin/students/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch (error) {
    console.error("Failed to delete student:", error);
  }
}

// Staff
export async function getStaff(): Promise<Staff[]> {
  try {
    const result = await getJson<any[]>("/api/admin/staff");
    return result.map(s => ({
      id: s.id,
      name: s.name,
      role_type: s.role_type,
      phone: s.phone,
      salary: s.salary,
    }));
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return [];
  }
}

export async function getStaffContacts(): Promise<StaffContact[]> {
  try {
    const result = await getJson<any[]>("/api/staff-contacts");
    return result.map(s => ({
      name: s.name,
      role: s.role,
      phone: s.phone,
    }));
  } catch (error) {
    console.error("Failed to fetch staff contacts:", error);
    return [];
  }
}

export async function createStaff(staff: Omit<Staff, "id"> & { email: string }): Promise<Staff | null> {
  try {
    const result = await postJson<any>("/api/admin/staff", staff, true);
    return {
      id: result.id,
      name: result.name,
      role_type: staff.role_type,
      phone: staff.phone,
      salary: staff.salary,
    };
  } catch (error) {
    console.error("Failed to create staff:", error);
    return null;
  }
}

export async function updateStaff(id: number, updates: Partial<Staff>): Promise<void> {
  try {
    await putJson(`/api/admin/staff/${id}`, updates);
  } catch (error) {
    console.error("Failed to update staff:", error);
  }
}

export async function deleteStaff(id: number): Promise<void> {
  try {
    await fetchJson(`/api/admin/staff/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch (error) {
    console.error("Failed to delete staff:", error);
  }
}

// Salaries
export async function getSalaries(): Promise<Salary[]> {
  try {
    const result = await fetchJson<any[]>("/api/salaries");
    return result.map(s => ({
      id: String(s.id),
      staffId: s.staffId,
      roleType: s.roleType,
      staffName: s.staffName,
      monthYear: s.monthYear,
      amount: s.amount,
      status: s.status,
      paidDate: s.paidDate,
    }));
  } catch (error) {
    console.error("Failed to fetch salaries:", error);
    return [];
  }
}

export async function getWardenSalary(): Promise<Salary[]> {
  try {
    const result = await getJson<any[]>("/api/warden/salary");
    return result.map(s => ({
      id: String(s.id),
      staffId: s.user_id ?? 0,
      roleType: s.roleType ?? "Warden",
      staffName: s.staffName ?? "",
      monthYear: `${s.month}-${s.year}`,
      amount: s.amount,
      status: s.status,
      paidDate: s.paid_date || s.paidDate || undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch warden salary:", error);
    return [];
  }
}

export async function createSalary(salary: Omit<Salary, "id">): Promise<Salary | null> {
  try {
    const result = await postJson<any>("/api/salaries", {
      staffId: salary.staffId,
      monthYear: salary.monthYear,
      amount: salary.amount,
    }, true);
    return {
      id: String(result.id),
      staffId: salary.staffId,
      roleType: salary.roleType,
      staffName: salary.staffName,
      monthYear: salary.monthYear,
      amount: salary.amount,
      status: "Unpaid",
    };
  } catch (error) {
    console.error("Failed to create salary:", error);
    return null;
  }
}

export async function updateSalaryStatus(id: string, status: Salary["status"]): Promise<void> {
  try {
    await putJson(`/api/salaries/${id}`, { status });
  } catch (error) {
    console.error("Failed to update salary:", error);
  }
}

// Rooms
export async function getRooms(): Promise<Room[]> {
  try {
    const result = await getJson<any[]>("/api/admin/rooms");
    return result.map(r => ({
      room_id: r.room_id,
      room_no: r.room_no,
      capacity: r.capacity,
      occupied: r.occupied,
      status: r.status,
    }));
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return [];
  }
}

export async function allocateRoom(userId: number, roomId: number): Promise<void> {
  try {
    await postJson("/api/admin/allocate-room", { user_id: userId, room_id: roomId }, true);
  } catch (error) {
    console.error("Failed to allocate room:", error);
  }
}

export async function deallocateRoom(userId: number): Promise<void> {
  try {
    await postJson("/api/admin/deallocate-room", { user_id: userId }, true);
  } catch (error) {
    console.error("Failed to deallocate room:", error);
  }
}

// Warden Staff
export async function getWardenStaff(): Promise<WardenStaff[]> {
  try {
    const result = await getJson<any[]>("/api/warden/staff");
    return result.map(s => ({
      name: s.name,
      role_type: s.role_type,
      phone: s.phone,
    }));
  } catch (error) {
    console.error("Failed to fetch warden staff:", error);
    return [];
  }
}

// Summary stats
export async function getDashboardStats(user: User) {
  try {
    const complaints = await getComplaints(user.email);
    const attendance = user.id ? await getAttendancePercentage(user.id) : 0;

    let unpaidAmount = 0;
    let feeStatus = "Clear";

    if (user.role === "student") {
      const payments = await getPayments(user.email);
      unpaidAmount = payments
        .filter(p => p.status === "Unpaid" || p.status === "Overdue")
        .reduce((s, p) => s + p.amount, 0);
      feeStatus = unpaidAmount > 0 ? "Due" : "Clear";
    }

    const totalComplaints = complaints.length;
    const pendingIssues = complaints.filter(c => c.status !== "Resolved").length;

    return {
      totalComplaints,
      pendingIssues,
      attendancePercent: attendance,
      unpaidAmount,
      feeStatus,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
      totalComplaints: 0,
      pendingIssues: 0,
      attendancePercent: 0,
      unpaidAmount: 0,
      feeStatus: "Clear",
    };
  }
}

// Rooms
export interface RoomSummary {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
}

export interface RoomWithStatus {
  room_id: number;
  room_no: number;
  capacity: number;
  occupied: number;
  status: "available" | "occupied" | "maintenance";
}

export interface RoomDetail extends RoomWithStatus {
  students: Array<{
    id: number;
    name: string;
    email: string;
    allocation_id: number;
  }>;
}

export async function getRoomsSummary(): Promise<RoomSummary> {
  try {
    const result = await getJson<RoomSummary>("/api/admin/rooms/summary");
    return result;
  } catch (error) {
    console.error("Failed to fetch rooms summary:", error);
    return {
      totalRooms: 0,
      availableRooms: 0,
      occupiedRooms: 0,
    };
  }
}

export async function getAllRooms(): Promise<RoomWithStatus[]> {
  try {
    const result = await getJson<RoomWithStatus[]>("/api/admin/rooms");
    return result;
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return [];
  }
}

export async function getRoomDetails(roomId: number): Promise<RoomDetail | null> {
  try {
    const result = await getJson<RoomDetail>(`/api/admin/rooms/${roomId}`);
    return result;
  } catch (error) {
    console.error("Failed to fetch room details:", error);
    return null;
  }
}

export interface Student {
  id: number;
  name: string;
  email: string;
}

export async function createRoom(roomNo: number, capacity: number, hostelId?: number): Promise<boolean> {
  try {
    await postJson("/api/admin/rooms", {
      room_no: roomNo,
      capacity,
      hostel_id: hostelId || 1,
    }, true);
    return true;
  } catch (error) {
    console.error("Failed to create room:", error);
    return false;
  }
}

export async function getAvailableStudents(): Promise<Student[]> {
  try {
    const result = await getJson<Student[]>("/api/admin/available-students");
    return result;
  } catch (error) {
    console.error("Failed to fetch available students:", error);
    return [];
  }
}

export async function allocateStudent(userId: number, roomId: number): Promise<boolean> {
  try {
    await postJson("/api/admin/allocations", {
      user_id: userId,
      room_id: roomId,
    }, true);
    return true;
  } catch (error) {
    console.error("Failed to allocate student:", error);
    return false;
  }
}

export async function removeStudentAllocation(allocationId: number): Promise<boolean> {
  try {
    await putJson(`/api/admin/allocations/${allocationId}/remove`, {});
    return true;
  } catch (error) {
    console.error("Failed to remove student allocation:", error);
    return false;
  }
}

// Admin dashboard stats
export async function getAdminDashboardStats(): Promise<{
  totalStudents: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  totalWardens: number;
  pendingComplaints: number;
  pendingPayments: number;
}> {
  try {
    const result = await getJson<{
      totalStudents: number;
      totalRooms: number;
      occupiedRooms: number;
      availableRooms: number;
      totalWardens: number;
      pendingComplaints: number;
      pendingPayments: number;
    }>("/api/admin/dashboard/stats");
    return result;
  } catch (error) {
    console.error("Failed to fetch admin dashboard stats:", error);
    return {
      totalStudents: 0,
      totalRooms: 0,
      occupiedRooms: 0,
      availableRooms: 0,
      totalWardens: 0,
      pendingComplaints: 0,
      pendingPayments: 0,
    };
  }
}
