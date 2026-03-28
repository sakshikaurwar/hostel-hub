import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser } from "@/lib/dataService";

export default function Profile() {
  const user = getCurrentUser();

  const studentFields = [
    { label: "Name", value: user?.name },
    { label: "Age", value: user?.age || "N/A" },
    { label: "Address", value: user?.address || "N/A" },
    { label: "Year", value: user?.year || "N/A" },
    { label: "Department", value: user?.department || "N/A" },
    { label: "Branch", value: user?.branch || "N/A" },
    { label: "Gender", value: user?.gender || "N/A" },
  ];

  const staffAdminFields = [
    { label: "Name", value: user?.name },
    { label: "Age", value: user?.age || "N/A" },
    { label: "Role", value: user?.role },
    { label: "Phone Number", value: user?.phone || "N/A" },
  ];

  const fields = user?.role === "Student" ? studentFields : staffAdminFields;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account information</p>
      </div>

      <div className="bg-card rounded-lg border p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-2xl font-bold">{user?.name?.[0]}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <span className="status-badge status-in-progress">{user?.role}</span>
          </div>
        </div>

        <div className="space-y-4">
          {fields.map(item => (
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
