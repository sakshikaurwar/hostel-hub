import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchCurrentUser, updateUserProfile, type User } from "@/lib/dataService";
import { Pencil, X, Check, Home, Loader2 } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    phone: "",
    address: "",
    year: "",
    department: "",
    branch: "",
    gender: "",
  });

  // Always fetch fresh user data from backend on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fresh = await fetchCurrentUser();
      if (fresh) {
        setUser(fresh);
        setForm({
          name: fresh.name || "",
          age: fresh.age?.toString() || "",
          phone: fresh.phone || "",
          address: fresh.address || "",
          year: fresh.year || "",
          department: fresh.department || "",
          branch: fresh.branch || "",
          gender: fresh.gender || "",
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const isStudent = user?.role === "student";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.email, {
        name: form.name,
        age: form.age ? parseInt(form.age) : undefined,
        phone: form.phone,
        address: form.address,
        year: form.year,
        department: form.department,
        branch: form.branch,
        gender: form.gender,
      });
      if (updated) {
        setUser(updated);
        setForm({
          name: updated.name || "",
          age: updated.age?.toString() || "",
          phone: updated.phone || "",
          address: updated.address || "",
          year: updated.year || "",
          department: updated.department || "",
          branch: updated.branch || "",
          gender: updated.gender || "",
        });
      }
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setForm({
      name: user.name || "",
      age: user.age?.toString() || "",
      phone: user.phone || "",
      address: user.address || "",
      year: user.year || "",
      department: user.department || "",
      branch: user.branch || "",
      gender: user.gender || "",
    });
    setEditing(false);
  };

  const inputClass = "w-full px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  const studentFields = [
    { label: "Name", key: "name" },
    { label: "Age", key: "age" },
    { label: "Phone", key: "phone" },
    { label: "Address", key: "address" },
    { label: "Year", key: "year" },
    { label: "Department", key: "department" },
    { label: "Branch", key: "branch" },
    { label: "Gender", key: "gender" },
  ];

  const wardenAdminFields: { label: string; key: string; readonly?: boolean }[] = [
    { label: "Name", key: "name" },
    { label: "Age", key: "age" },
    { label: "Phone", key: "phone" },
    { label: "Role", key: "role", readonly: true },
  ];

  const fields = isStudent ? studentFields : wardenAdminFields;

  const getDisplayValue = (key: string) => {
    if (key === "role") return user?.role || "N/A";
    if (key === "age") return user?.age?.toString() || "N/A";
    return (user as any)?.[key] || "N/A";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin mr-2" size={20} />
          <span className="text-muted-foreground">Loading profile...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account information</p>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* Room allocation card — always from backend */}
        {(user?.room_number || user?.room) && (
          <div className="bg-card rounded-lg border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Home size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Allocated Room</p>
              <p className="text-lg font-bold text-green-700">Room {user.room_number || user.room}</p>
            </div>
          </div>
        )}

        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-2xl font-bold">{user?.name?.[0]}</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <span className="status-badge status-in-progress">{user?.role}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                </button>
                <button onClick={handleCancel} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted disabled:opacity-60">
                  <X size={14} /> Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {fields.map(item => (
              <div key={item.label} className="flex justify-between items-center py-3 border-b last:border-0">
                <span className="text-muted-foreground text-sm w-32 shrink-0">{item.label}</span>
                {editing && !item.readonly ? (
                  <input
                    value={(form as any)[item.key] || ""}
                    onChange={e => setForm(prev => ({ ...prev, [item.key]: e.target.value }))}
                    className={`${inputClass} max-w-[220px]`}
                  />
                ) : (
                  <span className="text-sm font-medium">{getDisplayValue(item.key)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
