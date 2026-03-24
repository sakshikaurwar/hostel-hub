import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getComplaints, addComplaint, updateComplaintStatus, type Complaint } from "@/lib/dataService";
import { Plus, X } from "lucide-react";

export default function Complaints() {
  const user = getCurrentUser();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Maintenance", priority: "Medium" as const });

  const refresh = () => {
    const data = user?.role === "Student" ? getComplaints(user.email) : getComplaints();
    setComplaints(data);
  };

  useEffect(refresh, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    addComplaint({ ...form, priority: form.priority as Complaint["priority"], createdBy: user?.email || "" });
    setForm({ title: "", description: "", category: "Maintenance", priority: "Medium" });
    setShowForm(false);
    refresh();
  };

  const handleStatusChange = (id: string, status: Complaint["status"]) => {
    updateComplaintStatus(id, status);
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">Manage and track complaints</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Complaint"}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg border p-5 mb-6">
          <h3 className="font-semibold mb-4">Submit a Complaint</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Maintenance</option><option>IT</option><option>Hygiene</option><option>Security</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" required />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Submit</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th>{(user?.role === "Staff" || user?.role === "Admin") && <th>Action</th>}</tr>
          </thead>
          <tbody>
            {complaints.map(c => (
              <tr key={c.id}>
                <td className="font-medium">{c.title}</td>
                <td>{c.category}</td>
                <td><span className={`status-badge ${c.priority === "High" ? "status-pending" : c.priority === "Medium" ? "status-in-progress" : "status-resolved"}`}>{c.priority}</span></td>
                <td><span className={`status-badge ${c.status === "Pending" ? "status-pending" : c.status === "In Progress" ? "status-in-progress" : "status-resolved"}`}>{c.status}</span></td>
                <td className="text-muted-foreground">{c.createdAt}</td>
                {(user?.role === "Staff" || user?.role === "Admin") && (
                  <td>
                    <select value={c.status} onChange={e => handleStatusChange(c.id, e.target.value as Complaint["status"])} className="px-2 py-1 rounded border bg-background text-xs">
                      <option>Pending</option><option>In Progress</option><option>Resolved</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
            {!complaints.length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No complaints found</td></tr>}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
