import { getCurrentUser, getDashboardStats, seedData } from "../dataService.js";
import { navigate } from "../router.js";
import { renderLayout, attachLayoutListeners } from "../layout.js";
import { icons } from "../icons.js";

export function renderDashboard() {
  const root = document.getElementById("root");
  seedData();
  const user = getCurrentUser();
  if (!user) { navigate("/"); return; }

  const stats = getDashboardStats(user);

  const cards = [
    { label: "Total Complaints", value: stats.totalComplaints, icon: "alertTriangle", iconClass: "text-warning", path: "/complaints" },
    { label: "Pending Issues", value: stats.pendingIssues, icon: "checkCircle", iconClass: "text-destructive", path: "/complaints" },
    { label: "Attendance %", value: user.role === "Student" ? `${stats.attendancePercent}%` : "N/A", icon: "calendarCheck", iconClass: "text-success", path: "/attendance" },
    { label: "Fee Status", value: stats.feeStatus, icon: "creditCard", iconClass: "text-primary", path: "/payments", extra: stats.unpaidAmount > 0 ? `₹${stats.unpaidAmount.toLocaleString()} due` : undefined },
  ];

  const content = `
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Welcome back, ${user.name}</h1>
      <p class="text-muted-foreground">Here's what's happening in your hostel today.</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${cards.map(card => `
        <div class="stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" data-card-path="${card.path}">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-muted-foreground">${card.label}</span>
            <span class="${card.iconClass}">${icons[card.icon]}</span>
          </div>
          <p class="text-3xl font-bold">${card.value}</p>
          ${card.extra ? `<p class="text-sm text-destructive mt-1">${card.extra}</p>` : ""}
        </div>
      `).join("")}
    </div>
  `;

  root.innerHTML = renderLayout(content);
  attachLayoutListeners();

  document.querySelectorAll("[data-card-path]").forEach(el => {
    el.addEventListener("click", () => navigate(el.getAttribute("data-card-path")));
  });
}
