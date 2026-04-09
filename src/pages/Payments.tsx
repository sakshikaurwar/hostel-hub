import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getPayments, markPaymentPaid, updatePaymentFees, type Payment } from "@/lib/dataService";
import { Pencil, Check, X } from "lucide-react";

export default function Payments() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ totalFees: 0, pendingFees: 0 });

  const refresh = async () => {
    const data = user?.email ? await getPayments(user.email) : await getPayments();
    setPayments(data);
  };

  useEffect(() => {
    if (user?.role === "warden") {
      navigate("/dashboard");
      return;
    }
    refresh();
  }, [user, navigate]);

  const isStudent = user?.role === "student";
  const isAdminOrWarden = user?.role === "admin" || user?.role === "warden";
  const totalDue = payments.filter(p => p.status !== "Paid").reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === "Paid").reduce((s, p) => s + p.amount, 0);

  const studentSummary = useMemo(() => {
    if (isStudent) return [];
    const map: Record<string, { studentEmail: string; studentName: string; roomNumber: string; totalFees: number; pendingFees: number }> = {};
    payments.forEach(p => {
      if (!map[p.studentEmail]) {
        map[p.studentEmail] = { studentEmail: p.studentEmail, studentName: p.studentName || p.studentEmail, roomNumber: p.roomNumber || "N/A", totalFees: 0, pendingFees: 0 };
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

  const handleEditSave = () => {
    if (!editingEmail) return;
    updatePaymentFees(editingEmail, editForm.totalFees, editForm.pendingFees);
    setEditingEmail(null);
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View fee status and payment history</p>
      </div>

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
              <thead><tr><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Paid Date</th><th>Action</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.description}</td>
                    <td>₹{p.amount.toLocaleString()}</td>
                    <td>{p.dueDate}</td>
                    <td><span className={`status-badge ${p.status === "Paid" ? "status-paid" : "status-unpaid"}`}>{p.status}</span></td>
                    <td className="text-muted-foreground">{p.paidDate || "—"}</td>
                    <td>
                      {p.status !== "Paid" && (
                        <button onClick={() => { markPaymentPaid(p.id); refresh(); }} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">Pay Now</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!payments.length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No payments found</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!isStudent && (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Student Name</th><th>Room Number</th><th>Total Fees</th><th>Pending Fees</th>{isAdminOrWarden && <th>Action</th>}</tr></thead>
            <tbody>
              {studentSummary.map((s, i) => (
                <tr key={i}>
                  <td className="font-medium">{s.studentName}</td>
                  <td>{s.roomNumber}</td>
                  <td>
                    {editingEmail === s.studentEmail ? (
                      <input type="number" value={editForm.totalFees} onChange={e => setEditForm(prev => ({ ...prev, totalFees: parseInt(e.target.value) || 0 }))} className="w-24 px-2 py-1 rounded border bg-background text-sm" />
                    ) : (
                      `₹${s.totalFees.toLocaleString()}`
                    )}
                  </td>
                  <td>
                    {editingEmail === s.studentEmail ? (
                      <input type="number" value={editForm.pendingFees} onChange={e => setEditForm(prev => ({ ...prev, pendingFees: parseInt(e.target.value) || 0 }))} className="w-24 px-2 py-1 rounded border bg-background text-sm" />
                    ) : (
                      <span className={s.pendingFees > 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                        ₹{s.pendingFees.toLocaleString()}
                      </span>
                    )}
                  </td>
                  {isAdminOrWarden && (
                    <td>
                      {editingEmail === s.studentEmail ? (
                        <div className="flex gap-1">
                          <button onClick={handleEditSave} className="p-1 rounded hover:bg-muted text-success"><Check size={16} /></button>
                          <button onClick={() => setEditingEmail(null)} className="p-1 rounded hover:bg-muted text-destructive"><X size={16} /></button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditStart(s)} className="p-1 rounded hover:bg-muted text-primary"><Pencil size={14} /></button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!studentSummary.length && <tr><td colSpan={isAdminOrWarden ? 5 : 4} className="text-center py-8 text-muted-foreground">No payment records found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
