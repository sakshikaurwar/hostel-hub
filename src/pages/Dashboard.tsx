import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getDashboardStats, seedData } from "@/lib/dataService";
import { AlertTriangle, CheckCircle, CalendarCheck, CreditCard } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({ totalComplaints: 0, pendingIssues: 0, attendancePercent: 0, unpaidAmount: 0, feeStatus: "Clear" });
  const user = getCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    seedData();
    if (user) setStats(getDashboardStats(user));
  }, []);

  const cards = [
    { label: "Total Complaints", value: stats.totalComplaints, icon: AlertTriangle, iconClass: "text-warning", path: "/complaints" },
    { label: "Pending Issues", value: stats.pendingIssues, icon: CheckCircle, iconClass: "text-destructive", path: "/complaints" },
    { label: "Attendance %", value: user?.role === "Student" ? `${stats.attendancePercent}%` : "N/A", icon: CalendarCheck, iconClass: "text-success", path: "/attendance" },
    { label: "Fee Status", value: stats.feeStatus, icon: CreditCard, iconClass: "text-primary", path: "/payments", extra: stats.unpaidAmount > 0 ? `₹${stats.unpaidAmount.toLocaleString()} due` : undefined },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's what's happening in your hostel today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
