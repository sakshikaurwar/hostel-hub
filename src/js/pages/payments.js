import { getCurrentUser, getPayments, markPaymentPaid, updatePaymentFees } from "../dataService.js";
import { navigate } from "../router.js";
import { renderLayout, attachLayoutListeners } from "../layout.js";
import { icons } from "../icons.js";

export function renderPayments() {
  const root = document.getElementById("root");
  const user = getCurrentUser();
  if (!user) { navigate("/"); return; }

  const isStudent = user.role === "Student";
  const isAdmin = user.role === "Admin";
  let editingEmail = null;
  let editForm = { totalFees: 0, pendingFees: 0 };

  function render() {
    const payments = isStudent ? getPayments(user.email) : getPayments();
    const totalDue = payments.filter(p => p.status !== "Paid").reduce((s, p) => s + p.amount, 0);
    const totalPaid = payments.filter(p => p.status === "Paid").reduce((s, p) => s + p.amount, 0);

    let tableContent = "";

    if (isStudent) {
      tableContent = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="stat-card">
            <p class="text-sm text-muted-foreground mb-1">Total Paid</p>
            <p class="text-2xl font-bold text-success">₹${totalPaid.toLocaleString()}</p>
          </div>
          <div class="stat-card">
            <p class="text-sm text-muted-foreground mb-1">Amount Due</p>
            <p class="text-2xl font-bold text-destructive">₹${totalDue.toLocaleString()}</p>
          </div>
          <div class="stat-card">
            <p class="text-sm text-muted-foreground mb-1">Total Transactions</p>
            <p class="text-2xl font-bold">${payments.length}</p>
          </div>
        </div>
        <div class="bg-card rounded-lg border overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Paid Date</th><th>Action</th></tr></thead>
            <tbody>
              ${payments.length ? payments.map(p => `
                <tr>
                  <td class="font-medium">${p.description}</td>
                  <td>₹${p.amount.toLocaleString()}</td>
                  <td>${p.dueDate}</td>
                  <td><span class="status-badge ${p.status === "Paid" ? "status-paid" : "status-unpaid"}">${p.status}</span></td>
                  <td class="text-muted-foreground">${p.paidDate || "—"}</td>
                  <td>${p.status !== "Paid" ? `<button class="pay-btn px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90" data-id="${p.id}">Pay Now</button>` : ""}</td>
                </tr>
              `).join("") : `<tr><td colspan="6" class="text-center py-8 text-muted-foreground">No payments found</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Build student summary
      const map = {};
      payments.forEach(p => {
        if (!map[p.studentEmail]) {
          map[p.studentEmail] = { studentEmail: p.studentEmail, studentName: p.studentName || p.studentEmail, roomNumber: p.roomNumber || "N/A", totalFees: 0, pendingFees: 0 };
        }
        map[p.studentEmail].totalFees += p.totalFees || p.amount;
        if (p.status !== "Paid") map[p.studentEmail].pendingFees += p.amount;
      });
      const studentSummary = Object.values(map);

      tableContent = `
        <div class="bg-card rounded-lg border overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Student Name</th><th>Room Number</th><th>Total Fees</th><th>Pending Fees</th>${isAdmin ? "<th>Action</th>" : ""}</tr></thead>
            <tbody>
              ${studentSummary.length ? studentSummary.map(s => `
                <tr>
                  <td class="font-medium">${s.studentName}</td>
                  <td>${s.roomNumber}</td>
                  <td>
                    ${editingEmail === s.studentEmail
                      ? `<input type="number" class="edit-total w-24 px-2 py-1 rounded border bg-background text-sm" value="${editForm.totalFees}" data-email="${s.studentEmail}" />`
                      : `₹${s.totalFees.toLocaleString()}`}
                  </td>
                  <td>
                    ${editingEmail === s.studentEmail
                      ? `<input type="number" class="edit-pending w-24 px-2 py-1 rounded border bg-background text-sm" value="${editForm.pendingFees}" data-email="${s.studentEmail}" />`
                      : `<span class="${s.pendingFees > 0 ? "text-destructive font-medium" : "text-success font-medium"}">₹${s.pendingFees.toLocaleString()}</span>`}
                  </td>
                  ${isAdmin ? `
                    <td>
                      ${editingEmail === s.studentEmail ? `
                        <div class="flex gap-1">
                          <button class="save-edit p-1 rounded hover:bg-muted text-success">${icons.check}</button>
                          <button class="cancel-edit p-1 rounded hover:bg-muted text-destructive">${icons.xSmall}</button>
                        </div>
                      ` : `
                        <button class="start-edit p-1 rounded hover:bg-muted text-primary" data-email="${s.studentEmail}" data-total="${s.totalFees}" data-pending="${s.pendingFees}">${icons.pencil}</button>
                      `}
                    </td>
                  ` : ""}
                </tr>
              `).join("") : `<tr><td colspan="${isAdmin ? 5 : 4}" class="text-center py-8 text-muted-foreground">No payment records found</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    }

    const content = `
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Payments</h1>
        <p class="text-muted-foreground">View fee status and payment history</p>
      </div>
      ${tableContent}
    `;

    root.innerHTML = renderLayout(content);
    attachLayoutListeners();

    // Attach page listeners
    document.querySelectorAll(".pay-btn").forEach(btn => {
      btn.addEventListener("click", () => { markPaymentPaid(btn.getAttribute("data-id")); render(); });
    });

    document.querySelectorAll(".start-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        editingEmail = btn.getAttribute("data-email");
        editForm = { totalFees: parseInt(btn.getAttribute("data-total")), pendingFees: parseInt(btn.getAttribute("data-pending")) };
        render();
      });
    });

    document.querySelector(".save-edit")?.addEventListener("click", () => {
      const totalInput = document.querySelector(".edit-total");
      const pendingInput = document.querySelector(".edit-pending");
      if (totalInput && pendingInput) {
        editForm.totalFees = parseInt(totalInput.value) || 0;
        editForm.pendingFees = parseInt(pendingInput.value) || 0;
      }
      updatePaymentFees(editingEmail, editForm.totalFees, editForm.pendingFees);
      editingEmail = null;
      render();
    });

    document.querySelector(".cancel-edit")?.addEventListener("click", () => { editingEmail = null; render(); });
  }

  render();
}
