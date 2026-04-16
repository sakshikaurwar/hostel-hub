import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, fetchCurrentUser, getDashboardStats, getAdminDashboardStats, type User } from "@/lib/dataService";
import { AlertTriangle, CheckCircle, CalendarCheck, CreditCard, Users, Building, UserCheck, Home } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    // Always fetch fresh user data from backend (gets latest room_number etc.)
    fetchCurrentUser().then(fresh => {
      if (fresh) setUser(fresh);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      console.log("[Dashboard] Loading admin stats...");
      getAdminDashboardStats().then(data => {
        console.log("[Dashboard] Admin stats loaded:", data);
        setStats(data);
      });
    } else {
      console.log("[Dashboard] Loading user stats for role:", user.role);
      getDashboardStats(user).then(data => {
        console.log("[Dashboard] User stats loaded:", data);
        setStats(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const getCards = () => {
    if (user?.role === "admin") {
      return [
        { label: "Total Students", value: stats.totalStudents, icon: Users, iconClass: "text-blue-500", path: "/admin/students" },
        { label: "Total Rooms", value: stats.totalRooms, icon: Building, iconClass: "text-green-500", path: "/admin/rooms" },
        { label: "Occupied Rooms", value: stats.occupiedRooms, icon: UserCheck, iconClass: "text-orange-500", path: "/admin/rooms" },
        { label: "Available Rooms", value: stats.availableRooms, icon: Home, iconClass: "text-green-500", path: "/admin/rooms" },
        { label: "Total Wardens", value: stats.totalWardens, icon: UserCheck, iconClass: "text-purple-500", path: "/admin/staff" },
        { label: "Pending Complaints", value: stats.pendingComplaints, icon: AlertTriangle, iconClass: "text-red-500", path: "/complaints" },
        { label: "Pending Payments", value: stats.pendingPayments, icon: CreditCard, iconClass: "text-yellow-500", path: "/payments" },
      ];
    }

    if (user?.role === "warden") {
      return [
        { label: "Total Complaints", value: stats.totalComplaints, icon: AlertTriangle, iconClass: "text-warning", path: "/complaints" },
        { label: "Pending Issues", value: stats.pendingIssues, icon: CheckCircle, iconClass: "text-destructive", path: "/complaints" },
        { label: "Attendance %", value: `${stats.attendancePercent ?? 0}%`, icon: CalendarCheck, iconClass: "text-success", path: "/attendance" },
      ];
    }

    return [
      { label: "Total Complaints", value: stats.totalComplaints, icon: AlertTriangle, iconClass: "text-warning", path: "/complaints" },
      { label: "Pending Issues", value: stats.pendingIssues, icon: CheckCircle, iconClass: "text-destructive", path: "/complaints" },
      { label: "Attendance %", value: `${stats.attendancePercent ?? 0}%`, icon: CalendarCheck, iconClass: "text-success", path: "/attendance" },
      { label: "Fee Status", value: stats.feeStatus, icon: CreditCard, iconClass: "text-primary", path: "/payments", extra: stats.unpaidAmount > 0 ? `₹${stats.unpaidAmount.toLocaleString()} due` : undefined },
    ];
  };

  const cards = getCards();
  const roomNumber = user?.room_number || user?.room;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's what's happening in your hostel today.</p>
      </div>

      {/* Room info card for students */}
      {user?.role === "student" && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${roomNumber ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-card"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roomNumber ? "bg-green-100" : "bg-muted"}`}>
            <Home size={18} className={roomNumber ? "text-green-600" : "text-muted-foreground"} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your Allocated Room</p>
            {roomNumber ? (
              <p className="text-lg font-bold text-green-700 dark:text-green-400">Room {roomNumber}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No room allocated yet</p>
            )}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${user?.role === "warden" ? "3" : "4"} gap-4`}>
        {cards.map(card => (
          <div
            key={card.label}
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            onClick={() => navigate(card.path)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon size={18} className={card.iconClass} />
            </div>
            <p className="text-3xl font-bold">{card.value ?? "—"}</p>
            {card.extra && <p className="text-sm text-destructive mt-1">{card.extra}</p>}
          </div>
        ))}
      </div>

      {/* Admin: Recent Allocations Section */}
      {user?.role === "admin" && stats.recentAllocations && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Room Allocations</h2>
            <button onClick={() => navigate("/admin/room-allocation")} className="text-sm text-primary hover:underline font-medium">
              View All
            </button>
          </div>
          <div className="bg-card rounded-lg border overflow-hidden">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Room</th>
                  <th>Department</th>
                  <th>Check In</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAllocations.map((alloc: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium">{alloc.studentName}</td>
                    <td>Room {alloc.roomNumber}</td>
                    <td className="text-muted-foreground">{alloc.department}</td>
                    <td className="text-muted-foreground">{alloc.checkIn}</td>
                  </tr>
                ))}
                {!stats.recentAllocations.length && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-muted-foreground italic">
                      No recent allocations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
