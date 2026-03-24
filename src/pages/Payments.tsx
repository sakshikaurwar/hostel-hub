import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getPayments, markPaymentPaid, type Payment } from "@/lib/dataService";

export default function Payments() {
  const user = getCurrentUser();
  const [payments, setPayments] = useState<Payment[]>([]);

  const refresh = () => {
    setPayments(user?.role === "Student" ? getPayments(user.email) : getPayments());
  };

  useEffect(refresh, []);

  const totalDue = payments.filter(p => p.status !== "Paid").reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === "Paid").reduce((s, p) => s + p.amount, 0);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View fee status and payment history</p>
      </div>

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
    </DashboardLayout>
  );
}
