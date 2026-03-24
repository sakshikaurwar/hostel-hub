import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getDashboardStats, seedData } from "@/lib/dataService";
import { AlertTriangle, CheckCircle, CalendarCheck, CreditCard } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({ totalComplaints: 0, pendingIssues: 0, attendancePercent: 0, unpaidAmount: 0, feeStatus: "Clear" });
  const user = getCurrentUser();

  useEffect(() => {
    seedData();
    if (user) setStats(getDashboardStats(user));
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's what's happening in your hostel today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total Complaints</span>
            <AlertTriangle size={18} className="text-warning" />
          </div>
          <p className="text-3xl font-bold">{stats.totalComplaints}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Pending Issues</span>
            <CheckCircle size={18} className="text-destructive" />
          </div>
          <p className="text-3xl font-bold">{stats.pendingIssues}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Attendance %</span>
            <CalendarCheck size={18} className="text-success" />
          </div>
          <p className="text-3xl font-bold">{user?.role === "Student" ? `${stats.attendancePercent}%` : "N/A"}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Fee Status</span>
            <CreditCard size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-bold">{stats.feeStatus}</p>
          {stats.unpaidAmount > 0 && <p className="text-sm text-destructive mt-1">₹{stats.unpaidAmount.toLocaleString()} due</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
