import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, getJson } from "@/lib/dataService";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminDashboard() {
  const user = getCurrentUser();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    getJson<{ message: string; dashboard: string; admin: boolean }>("/admin/dashboard")
      .then(response => {
        setMessage(response.dashboard);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Unable to load admin dashboard");
      });
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="rounded-lg border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">Only admin users can access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-muted-foreground">{message || "Loading admin data..."}</p>
          {error && <p className="mt-2 text-destructive">{error}</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
