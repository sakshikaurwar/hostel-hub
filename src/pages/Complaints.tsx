import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getComplaints, addComplaint, updateComplaintStatus, type Complaint } from "@/lib/dataService";
import { Plus, X, Eye } from "lucide-react";

export default function Complaints() {
  const user = getCurrentUser();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [viewDescription, setViewDescription] = useState<string | null>(null);

  const refresh = async () => {
    const data = user?.email ? await getComplaints(user.email) : await getComplaints();
    setComplaints(data);
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    await addComplaint({
      title: form.title,
      description: form.description,
      category: "General",
      priority: "Medium",
      createdBy: user?.email || "",
      createdByName: user?.name || "",
      roomNumber: user?.room || "N/A",
    });
    setForm({ title: "", description: "" });
    setShowForm(false);
    await refresh();
  };

  const handleStatusChange = async (id: string, status: Complaint["status"]) => {
    await updateComplaintStatus(id, status);
    await refresh();
  };

  const isWardenOrAdmin = user?.role === "warden" || user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">Manage and track complaints</p>
        </div>
        {user?.role === "student" && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "New Complaint"}
          </button>
        )}
      </div>

      {/* Student: simplified form with only Title and Description */}
      {showForm && user?.role === "student" && (
        <div className="bg-card rounded-lg border p-5 mb-6">
          <h3 className="font-semibold mb-4">Submit a Complaint</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Brief title for your complaint" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Describe your complaint in detail" required />
            </div>
            <button type="submit" className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Submit</button>
          </form>
        </div>
      )}

      {/* Description modal */}
      {viewDescription !== null && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4" onClick={() => setViewDescription(null)}>
          <div className="bg-card rounded-lg border shadow-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Complaint Description</h3>
              <button onClick={() => setViewDescription(null)} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
            </div>
            <p className="text-sm text-muted-foreground">{viewDescription}</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {isWardenOrAdmin && <th>Student Name</th>}
              {isWardenOrAdmin && <th>Room No.</th>}
              <th>Title</th>
              {!isWardenOrAdmin && <th>Category</th>}
              {!isWardenOrAdmin && <th>Priority</th>}
              <th>Status</th>
              <th>Date</th>
              {isWardenOrAdmin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {complaints.map(c => (
              <tr key={c.id}>
                {isWardenOrAdmin && <td className="font-medium">{c.createdByName || c.createdBy}</td>}
                {isWardenOrAdmin && <td>{c.roomNumber || "N/A"}</td>}
                <td>
                  {isWardenOrAdmin ? (
                    <button onClick={() => setViewDescription(c.description)} className="text-primary hover:underline font-medium flex items-center gap-1">
                      {c.title} <Eye size={14} />
                    </button>
                  ) : (
                    <span className="font-medium">{c.title}</span>
                  )}
                </td>
                {!isWardenOrAdmin && <td>{c.category}</td>}
                {!isWardenOrAdmin && <td><span className={`status-badge ${c.priority === "High" ? "status-pending" : c.priority === "Medium" ? "status-in-progress" : "status-resolved"}`}>{c.priority}</span></td>}
                <td><span className={`status-badge ${c.status === "Pending" ? "status-pending" : c.status === "In Progress" ? "status-in-progress" : "status-resolved"}`}>{c.status}</span></td>
                <td className="text-muted-foreground">{c.createdAt}</td>
                {isWardenOrAdmin && (
                  <td>
                    <select value={c.status} onChange={e => handleStatusChange(c.id, e.target.value as Complaint["status"])} className="px-2 py-1 rounded border bg-background text-xs">
                      <option>Pending</option><option>In Progress</option><option>Resolved</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
            {!complaints.length && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No complaints found</td></tr>}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
