import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import Attendance from "./pages/Attendance";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import MarkAttendance from "./pages/MarkAttendance";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import Students from "./pages/Students";
import StaffInfo from "./pages/StaffInfo";
import RoomAllocation from "./pages/RoomAllocation";
import Rooms from "./pages/Rooms";
import Salaries from "./pages/Salaries";
import WardenStaff from "./pages/WardenStaff";
import StaffContacts from "./pages/StaffContacts";
import { getCurrentUser } from "./lib/dataService";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = getCurrentUser();
  return user ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const user = getCurrentUser();
  return user?.role === "admin" ? children : <Navigate to="/" replace />;
}

function WardenRoute({ children }: { children: JSX.Element }) {
  const user = getCurrentUser();
  return user?.role === "warden" ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
      <Route path="/attendance/mark" element={<ProtectedRoute><MarkAttendance /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/admin/students" element={<AdminRoute><Students /></AdminRoute>} />
      <Route path="/admin/staff" element={<AdminRoute><StaffInfo /></AdminRoute>} />
      <Route path="/admin/salaries" element={<AdminRoute><Salaries /></AdminRoute>} />
      <Route path="/admin/rooms" element={<AdminRoute><Rooms /></AdminRoute>} />
      <Route path="/admin/room-allocation" element={<AdminRoute><RoomAllocation /></AdminRoute>} />
      <Route path="/warden/staff-contacts" element={<WardenRoute><StaffContacts /></WardenRoute>} />
      <Route path="/warden/salary" element={<WardenRoute><WardenStaff /></WardenRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
