import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getDashboardStats, getAdminDashboardStats } from "@/lib/dataService";
import { AlertTriangle, CheckCircle, CalendarCheck, CreditCard, Users, Building, UserCheck, Home } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const user = getCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        getAdminDashboardStats().then(setStats);
      } else {
        getDashboardStats(user).then(setStats);
      }
    }
  }, [user]);

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

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's what's happening in your hostel today.</p>
      </div>

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
            <p className="text-3xl font-bold">{card.value}</p>
            {card.extra && <p className="text-sm text-destructive mt-1">{card.extra}</p>}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
