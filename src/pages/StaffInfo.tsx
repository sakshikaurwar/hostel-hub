import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStaff, createStaff, updateStaff, deleteStaff, type Staff } from "@/lib/dataService";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StaffInfo() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role_type: "Cleaner" as Staff['role_type'],
    phone: "",
  });

  const refresh = async () => {
    const data = await getStaff();
    console.log("[StaffInfo] Fetched", data.length, "staff from API");
    setStaff(data);
    setFilteredStaff(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const filtered = staff.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStaff(filtered);
  }, [searchTerm, staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role_type) return;

    const staffData = {
      ...form,
    };

    try {
      if (editingStaff) {
        await updateStaff(editingStaff.id, staffData);
      } else {
        await createStaff(staffData);
      }

      setForm({ name: "", email: "", role_type: "Cleaner", phone: "" });
      setShowForm(false);
      setEditingStaff(null);
      await refresh();
    } catch (err: any) {
      alert(err.message || "Failed to save staff");
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setForm({
      name: staffMember.name,
      email: "", // Email not returned in getStaff, so leave empty for edit
      role_type: staffMember.role_type,
      phone: staffMember.phone || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      await deleteStaff(id);
      await refresh();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Info</h1>
            <p className="text-muted-foreground">Manage staff records</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingStaff(null); setForm({ name: "", email: "", role_type: "Cleaner", phone: "" }); }}>
                <Plus size={16} className="mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStaff ? "Edit Staff" : "Add Staff"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="role_type">Role</Label>
                  <Select value={form.role_type} onValueChange={(value: Staff['role_type']) => setForm({ ...form, role_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Warden">Warden</SelectItem>
                      <SelectItem value="Cleaner">Cleaner</SelectItem>
                      <SelectItem value="Electrician">Electrician</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <Button type="submit">{editingStaff ? "Update" : "Create"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <Search size={16} />
          <Input
            placeholder="Search staff..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map(staffMember => (
                <TableRow key={staffMember.id}>
                  <TableCell className="font-medium">{staffMember.name}</TableCell>
                  <TableCell>{staffMember.role_type}</TableCell>
                  <TableCell>{staffMember.phone || "-"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(staffMember)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(staffMember.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredStaff.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No staff found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}