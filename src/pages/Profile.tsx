import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, updateUserProfile } from "@/lib/dataService";
import { Pencil, X, Check } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(getCurrentUser());
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    age: user?.age?.toString() || "",
    phone: user?.phone || "",
    address: user?.address || "",
    year: user?.year || "",
    department: user?.department || "",
    branch: user?.branch || "",
    gender: user?.gender || "",
  });

  const isStudent = user?.role === "Student";

  const handleSave = () => {
    if (!user) return;
    const updated = updateUserProfile(user.email, {
      name: form.name,
      age: form.age ? parseInt(form.age) : undefined,
      phone: form.phone,
      address: form.address,
      year: form.year,
      department: form.department,
      branch: form.branch,
      gender: form.gender,
    });
    if (updated) setUser(updated);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || "",
      age: user?.age?.toString() || "",
      phone: user?.phone || "",
      address: user?.address || "",
      year: user?.year || "",
      department: user?.department || "",
      branch: user?.branch || "",
      gender: user?.gender || "",
    });
    setEditing(false);
  };

  const inputClass = "w-full px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  const studentFields = [
    { label: "Name", key: "name" },
    { label: "Age", key: "age" },
    { label: "Address", key: "address" },
    { label: "Year", key: "year" },
    { label: "Department", key: "department" },
    { label: "Branch", key: "branch" },
    { label: "Gender", key: "gender" },
  ];

  const staffAdminFields = [
    { label: "Name", key: "name" },
    { label: "Age", key: "age" },
    { label: "Role", key: "role", readonly: true },
    { label: "Phone Number", key: "phone" },
  ];

  const fields = isStudent ? studentFields : staffAdminFields;

  const getDisplayValue = (key: string) => {
    if (key === "role") return user?.role || "N/A";
    if (key === "age") return user?.age?.toString() || "N/A";
    return (user as any)?.[key] || "N/A";
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account information</p>
      </div>

      <div className="bg-card rounded-lg border p-6 max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-2xl font-bold">{user?.name?.[0]}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <span className="status-badge status-in-progress">{user?.role}</span>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
              <Pencil size={14} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                <Check size={14} /> Save
              </button>
              <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted">
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {fields.map(item => (
            <div key={item.label} className="flex justify-between items-center py-3 border-b last:border-0">
              <span className="text-muted-foreground text-sm">{item.label}</span>
              {editing && !item.readonly ? (
                <input
                  value={(form as any)[item.key] || ""}
                  onChange={e => setForm(prev => ({ ...prev, [item.key]: e.target.value }))}
                  className={`${inputClass} max-w-[200px]`}
                />
              ) : (
                <span className="text-sm font-medium">{getDisplayValue(item.key)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
