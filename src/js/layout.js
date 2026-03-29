import { getCurrentUser } from "./dataService.js";
import { navigate, getRoutePath } from "./router.js";
import { icons } from "./icons.js";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: "layoutDashboard" },
  { label: "Complaints", path: "/complaints", icon: "messageSquare" },
  { label: "Attendance", path: "/attendance", icon: "calendarCheck" },
  { label: "Payments", path: "/payments", icon: "creditCard" },
  { label: "Profile", path: "/profile", icon: "user" },
];

export function renderLayout(contentHtml) {
  const user = getCurrentUser();
  if (!user) { navigate("/"); return ""; }

  const currentPath = getRoutePath();

  return `
    <div class="flex h-screen overflow-hidden" id="app-layout">
      <div id="sidebar-overlay" class="fixed inset-0 bg-foreground/30 z-30 lg:hidden hidden"></div>
      <aside id="sidebar" class="fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform lg:translate-x-0 -translate-x-full" style="background: hsl(var(--sidebar-bg))">
        <div class="flex items-center gap-3 px-6 py-5 border-b" style="border-color: hsl(var(--sidebar-border))">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span class="text-primary-foreground font-bold text-sm">M</span>
          </div>
          <span class="text-lg font-semibold" style="color: hsl(var(--sidebar-primary-foreground))">MyHostel</span>
        </div>
        <nav class="flex-1 py-4 px-3 space-y-1">
          ${navItems.map(item => `
            <button data-nav="${item.path}" class="sidebar-link w-full ${currentPath === item.path ? 'active' : ''}">
              ${icons[item.icon]}
              ${item.label}
            </button>
          `).join("")}
        </nav>
        <div class="p-3 border-t" style="border-color: hsl(var(--sidebar-border))">
          <button id="logout-btn" class="sidebar-link w-full hover:text-destructive">
            ${icons.logOut}
            Logout
          </button>
        </div>
      </aside>
      <div class="flex-1 flex flex-col overflow-hidden">
        <header class="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button id="menu-toggle" class="lg:hidden p-2 rounded-md hover:bg-muted">
            ${icons.menu}
          </button>
          <div class="flex-1"></div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-sm font-medium">${user.name}</p>
              <p class="text-xs text-muted-foreground">${user.role}</p>
            </div>
            <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span class="text-primary-foreground text-sm font-medium">${user.name[0]}</span>
            </div>
          </div>
        </header>
        <main class="flex-1 overflow-y-auto p-4 lg:p-6" id="page-content">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;
}

export function attachLayoutListeners() {
  const user = getCurrentUser();
  if (!user) return;

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const menuToggle = document.getElementById("menu-toggle");
  const logoutBtn = document.getElementById("logout-btn");
  let sidebarOpen = false;

  const closeSidebar = () => {
    sidebarOpen = false;
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  };

  menuToggle?.addEventListener("click", () => {
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
      sidebar?.classList.remove("-translate-x-full");
      overlay?.classList.remove("hidden");
    } else {
      closeSidebar();
    }
  });

  overlay?.addEventListener("click", closeSidebar);

  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      navigate(btn.getAttribute("data-nav"));
      closeSidebar();
    });
  });

  logoutBtn?.addEventListener("click", () => {
    import("./dataService.js").then(mod => {
      mod.logoutUser();
      navigate("/");
    });
  });
}
