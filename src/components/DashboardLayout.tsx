import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logoutUser } from "@/lib/dataService";
import { LayoutDashboard, MessageSquare, CalendarCheck, CreditCard, User, LogOut, Menu, X } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Complaints", path: "/complaints", icon: MessageSquare },
  { label: "Attendance", path: "/attendance", icon: CalendarCheck },
  { label: "Payments", path: "/payments", icon: CreditCard },
  { label: "Profile", path: "/profile", icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) { navigate("/"); return null; }

  const handleLogout = () => { logoutUser(); navigate("/"); };

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "hsl(var(--sidebar-bg))" }}>
        <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          <span className="text-lg font-semibold" style={{ color: "hsl(var(--sidebar-primary-foreground))" }}>MyHostel</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`sidebar-link w-full ${location.pathname === item.path ? "active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <button onClick={handleLogout} className="sidebar-link w-full hover:text-destructive">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button className="lg:hidden p-2 rounded-md hover:bg-muted" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">{user.name[0]}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
