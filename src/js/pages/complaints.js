import { getCurrentUser, getComplaints, addComplaint, updateComplaintStatus } from "../dataService.js";
import { navigate } from "../router.js";
import { renderLayout, attachLayoutListeners } from "../layout.js";
import { icons } from "../icons.js";

export function renderComplaints() {
  const root = document.getElementById("root");
  const user = getCurrentUser();
  if (!user) { navigate("/"); return; }

  const isStaffOrAdmin = user.role === "Warden" || user.role === "Admin";
  let showForm = false;
  let viewDescription = null;

  function render() {
    const complaints = user.role === "Student" ? getComplaints(user.email) : getComplaints();

    const formHtml = showForm && user.role === "Student" ? `
      <div class="bg-card rounded-lg border p-5 mb-6">
        <h3 class="font-semibold mb-4">Submit a Complaint</h3>
        <form id="complaint-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Title</label>
            <input id="cf-title" class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Brief title for your complaint" required />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea id="cf-desc" rows="3" class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Describe your complaint in detail" required></textarea>
          </div>
          <button type="submit" class="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Submit</button>
        </form>
      </div>
    ` : "";

    const modalHtml = viewDescription !== null ? `
      <div id="desc-modal" class="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4">
        <div class="bg-card rounded-lg border shadow-lg p-6 max-w-md w-full" id="desc-modal-inner">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold">Complaint Description</h3>
            <button id="close-modal" class="p-1 hover:bg-muted rounded">${icons.xSmall}</button>
          </div>
          <p class="text-sm text-muted-foreground">${viewDescription}</p>
        </div>
      </div>
    ` : "";

    const statusBadge = (status) => {
      const cls = status === "Pending" ? "status-pending" : status === "In Progress" ? "status-in-progress" : "status-resolved";
      return `<span class="status-badge ${cls}">${status}</span>`;
    };

    const content = `
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">Complaints</h1>
          <p class="text-muted-foreground">Manage and track complaints</p>
        </div>
        ${user.role === "Student" ? `
          <button id="toggle-form" class="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            ${showForm ? icons.xSmall : icons.plus}
            ${showForm ? "Cancel" : "New Complaint"}
          </button>
        ` : ""}
      </div>
      ${formHtml}
      ${modalHtml}
      <div class="bg-card rounded-lg border overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              ${isStaffOrAdmin ? "<th>Student Name</th><th>Room No.</th>" : ""}
              <th>Title</th>
              ${!isStaffOrAdmin ? "<th>Category</th><th>Priority</th>" : ""}
              <th>Status</th>
              <th>Date</th>
              ${isStaffOrAdmin ? "<th>Action</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${complaints.length ? complaints.map(c => `
              <tr>
                ${isStaffOrAdmin ? `<td class="font-medium">${c.createdByName || c.createdBy}</td><td>${c.roomNumber || "N/A"}</td>` : ""}
                <td>
                  ${isStaffOrAdmin ? `<button class="view-desc text-primary hover:underline font-medium flex items-center gap-1" data-desc="${c.description.replace(/"/g, '&quot;')}">${c.title} ${icons.eye}</button>` : `<span class="font-medium">${c.title}</span>`}
                </td>
                ${!isStaffOrAdmin ? `
                  <td>${c.category}</td>
                  <td><span class="status-badge ${c.priority === "High" ? "status-pending" : c.priority === "Medium" ? "status-in-progress" : "status-resolved"}">${c.priority}</span></td>
                ` : ""}
                <td>${statusBadge(c.status)}</td>
                <td class="text-muted-foreground">${c.createdAt}</td>
                ${isStaffOrAdmin ? `
                  <td>
                    <select class="status-select px-2 py-1 rounded border bg-background text-xs" data-id="${c.id}">
                      <option ${c.status === "Pending" ? "selected" : ""}>Pending</option>
                      <option ${c.status === "In Progress" ? "selected" : ""}>In Progress</option>
                      <option ${c.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                  </td>
                ` : ""}
              </tr>
            `).join("") : `<tr><td colspan="8" class="text-center py-8 text-muted-foreground">No complaints found</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    root.innerHTML = renderLayout(content);
    attachLayoutListeners();
    attachPageListeners();
  }

  function attachPageListeners() {
    document.getElementById("toggle-form")?.addEventListener("click", () => { showForm = !showForm; render(); });

    document.getElementById("complaint-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("cf-title").value.trim();
      const desc = document.getElementById("cf-desc").value.trim();
      if (!title || !desc) return;
      addComplaint({ title, description: desc, category: "General", priority: "Medium", createdBy: user.email, createdByName: user.name, roomNumber: user.room || "N/A" });
      showForm = false;
      render();
    });

    document.querySelectorAll(".view-desc").forEach(btn => {
      btn.addEventListener("click", () => { viewDescription = btn.getAttribute("data-desc"); render(); });
    });

    document.getElementById("desc-modal")?.addEventListener("click", (e) => {
      if (!document.getElementById("desc-modal-inner").contains(e.target)) { viewDescription = null; render(); }
    });
    document.getElementById("close-modal")?.addEventListener("click", () => { viewDescription = null; render(); });

    document.querySelectorAll(".status-select").forEach(sel => {
      sel.addEventListener("change", (e) => { updateComplaintStatus(e.target.getAttribute("data-id"), e.target.value); render(); });
    });
  }

  render();
}
