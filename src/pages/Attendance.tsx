import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getAttendance, getAttendancePercentage, markAttendance, type AttendanceRecord } from "@/lib/dataService";

export default function Attendance() {
  const user = getCurrentUser();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [markForm, setMarkForm] = useState({ studentName: "", studentEmail: "", status: "Present" as AttendanceRecord["status"] });

  const refresh = () => {
    const data = user?.role === "Student" ? getAttendance(user.email) : getAttendance();
    setRecords(data);
    if (user?.role === "Student") setPercentage(getAttendancePercentage(user.email));
  };

  useEffect(refresh, []);

  const handleMark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!markForm.studentName.trim() || !markForm.studentEmail.trim()) return;
    markAttendance({ ...markForm, date: new Date().toISOString().split("T")[0], markedBy: user?.email || "" });
    setMarkForm({ studentName: "", studentEmail: "", status: "Present" });
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Track and manage hostel attendance</p>
      </div>

      {user?.role === "Student" && (
        <div className="stat-card mb-6 max-w-sm">
          <p className="text-sm text-muted-foreground mb-2">Your Attendance</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{percentage}%</span>
            <span className="text-sm text-muted-foreground mb-1">({records.filter(r => r.status === "Present" || r.status === "Late").length}/{records.length} days)</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      )}

      {(user?.role === "Staff" || user?.role === "Admin") && (
        <div className="bg-card rounded-lg border p-5 mb-6">
          <h3 className="font-semibold mb-4">Mark Attendance</h3>
          <form onSubmit={handleMark} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Student Name</label>
              <input value={markForm.studentName} onChange={e => setMarkForm({ ...markForm, studentName: e.target.value })} className="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Student Email</label>
              <input value={markForm.studentEmail} onChange={e => setMarkForm({ ...markForm, studentEmail: e.target.value })} className="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={markForm.status} onChange={e => setMarkForm({ ...markForm, status: e.target.value as any })} className="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Present</option><option>Absent</option><option>Late</option>
              </select>
            </div>
            <button type="submit" className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Mark</button>
          </form>
        </div>
      )}

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Student</th><th>Date</th><th>Status</th><th>Marked By</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td className="font-medium">{r.studentName}</td>
                <td>{r.date}</td>
                <td><span className={`status-badge ${r.status === "Present" ? "status-resolved" : r.status === "Late" ? "status-pending" : "status-unpaid"}`}>{r.status}</span></td>
                <td className="text-muted-foreground">{r.markedBy}</td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No records found</td></tr>}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
