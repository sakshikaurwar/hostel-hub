import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getPayments, markPaymentPaid, updatePaymentFees, createPayment, getStudents, type Payment, type Student } from "@/lib/dataService";
import { Pencil, Check, X, Plus } from "lucide-react";

export default function Payments() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ totalFees: 0, pendingFees: 0 });
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ studentId: "", description: "", amount: "", dueDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";

  const refresh = async () => {
    setLoading(true);
    try {
      // Backend handles role-based filtering
      const data = await getPayments();
      console.log("[Payments] State updated with", data.length, "records");
      setPayments(data);
      // Only admin needs student list for creating payments
      if (isAdmin) {
        const studs = await getStudents();
        setStudents(studs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "warden") {
      navigate("/dashboard");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const totalDue = payments.filter(p => p.status !== "Paid").reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === "Paid").reduce((s, p) => s + p.amount, 0);

  // Admin summary: one row per student
  const studentSummary = useMemo(() => {
    if (isStudent) return [];
    const map: Record<string, { studentEmail: string; studentName: string; roomNumber: string; totalFees: number; pendingFees: number }> = {};
    payments.forEach(p => {
      if (!map[p.studentEmail]) {
        map[p.studentEmail] = {
          studentEmail: p.studentEmail,
          studentName: p.studentName || p.studentEmail,
          roomNumber: p.roomNumber || "N/A",
          totalFees: 0,
          pendingFees: 0,
        };
      }
      map[p.studentEmail].totalFees += p.totalFees || p.amount;
      if (p.status !== "Paid") map[p.studentEmail].pendingFees += p.amount;
    });
    return Object.values(map);
  }, [payments, isStudent]);

  const handleEditStart = (s: typeof studentSummary[0]) => {
    setEditingEmail(s.studentEmail);
    setEditForm({ totalFees: s.totalFees, pendingFees: s.pendingFees });
  };

  const handleEditSave = async () => {
    if (!editingEmail) return;
    setError(null);
    try {
      await updatePaymentFees(editingEmail, editForm.totalFees, editForm.pendingFees);
      setEditingEmail(null);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update payment");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.studentId || !addForm.amount || !addForm.dueDate) return;
    setError(null);
    try {
      const amount = parseFloat(addForm.amount);
      await createPayment({
        studentId: parseInt(addForm.studentId),
        description: addForm.description || "Hostel Fee",
        amount,
        totalFees: amount,
        dueDate: addForm.dueDate,
      });
      setAddForm({ studentId: "", description: "", amount: "", dueDate: "" });
      setShowAddForm(false);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create payment");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">View fee status and payment history</p>
        </div>
        {/* ONLY admin can create new payments */}
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} /> New Payment
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Admin: Add Payment Modal */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-card rounded-lg border shadow-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Create New Payment</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Student</label>
                <select
                  value={addForm.studentId}
                  onChange={e => setAddForm({ ...addForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                  required
                >
                  <option value="">Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  value={addForm.description}
                  onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                  placeholder="e.g. Monthly Fee"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={addForm.amount}
                  onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={addForm.dueDate}
                  onChange={e => setAddForm({ ...addForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                  required
                />
              </div>
              <button type="submit" className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                Create Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Student: individual payment list */}
      {isStudent && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="stat-card">
              <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-success">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
              <p className="text-2xl font-bold text-destructive">₹{totalDue.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
          </div>

          <div className="bg-card rounded-lg border overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.description}</td>
                    <td>₹{p.amount.toLocaleString()}</td>
                    <td>{p.dueDate}</td>
                    <td>
                      <span className={`status-badge ${p.status === "Paid" ? "status-paid" : "status-unpaid"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{p.paidDate || "—"}</td>
                    <td>
                      {/* Students CAN pay their own unpaid fees */}
                      {p.status !== "Paid" && (
                        <button
                          onClick={async () => {
                            try {
                              await markPaymentPaid(p.id);
                              console.log("[Payments] Pay Now clicked, refreshing...");
                              await refresh();
                            } catch (err: any) {
                              setError(err.message || "Failed to mark as paid");
                            }
                          }}
                          className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                        >
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!payments.length && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Admin: summary table with edit capability */}
      {!isStudent && (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Room Number</th>
                <th>Total Fees</th>
                <th>Pending Fees</th>
                {/* Only admin sees edit action */}
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {studentSummary.map((s, i) => (
                <tr key={i}>
                  <td className="font-medium">{s.studentName}</td>
                  <td>{s.roomNumber}</td>
                  <td>
                    {editingEmail === s.studentEmail && isAdmin ? (
                      <input
                        type="number"
                        value={editForm.totalFees}
                        onChange={e => setEditForm(prev => ({ ...prev, totalFees: parseInt(e.target.value) || 0 }))}
                        className="w-24 px-2 py-1 rounded border bg-background text-sm"
                      />
                    ) : (
                      `₹${s.totalFees.toLocaleString()}`
                    )}
                  </td>
                  <td>
                    {editingEmail === s.studentEmail && isAdmin ? (
                      <input
                        type="number"
                        value={editForm.pendingFees}
                        onChange={e => setEditForm(prev => ({ ...prev, pendingFees: parseInt(e.target.value) || 0 }))}
                        className="w-24 px-2 py-1 rounded border bg-background text-sm"
                      />
                    ) : (
                      <span className={s.pendingFees > 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                        ₹{s.pendingFees.toLocaleString()}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      {editingEmail === s.studentEmail ? (
                        <div className="flex gap-1">
                          <button onClick={handleEditSave} className="p-1 rounded hover:bg-muted text-success"><Check size={16} /></button>
                          <button onClick={() => setEditingEmail(null)} className="p-1 rounded hover:bg-muted text-destructive"><X size={16} /></button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditStart(s)} className="p-1 rounded hover:bg-muted text-primary">
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!studentSummary.length && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No payment records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
