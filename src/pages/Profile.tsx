import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser } from "@/lib/dataService";

export default function Profile() {
  const user = getCurrentUser();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account information</p>
      </div>

      <div className="bg-card rounded-lg border p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-2xl font-bold">{user?.name[0]}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <span className="status-badge status-in-progress">{user?.role}</span>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: "Email", value: user?.email },
            { label: "Role", value: user?.role },
            { label: "Room", value: user?.room || "N/A" },
            { label: "Phone", value: user?.phone || "N/A" },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-3 border-b last:border-0">
              <span className="text-muted-foreground text-sm">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
