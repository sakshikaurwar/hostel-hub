import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStaff, getSalaries, createSalary, updateSalaryStatus, type Staff, type Salary } from "@/lib/dataService";
import { Plus, Edit, CheckCircle, XCircle, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Salaries() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredSalaries, setFilteredSalaries] = useState<Salary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    staffId: "",
    monthYear: "",
    amount: "",
  });

  const refresh = async () => {
    const salariesData = await getSalaries();
    const staffData = await getStaff();
    setSalaries(salariesData);
    setStaff(staffData);
    setFilteredSalaries(salariesData);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const filtered = salaries.filter(s =>
      s.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.monthYear.includes(searchTerm)
    );
    setFilteredSalaries(filtered);
  }, [searchTerm, salaries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId || !form.monthYear || !form.amount) return;

    const selectedStaff = staff.find(s => s.id.toString() === form.staffId);
    if (!selectedStaff) return;

    const salaryData = {
      staffId: parseInt(form.staffId),
      roleType: selectedStaff.role_type,
      staffName: selectedStaff.name,
      monthYear: form.monthYear,
      amount: parseFloat(form.amount),
    };

    await createSalary(salaryData);
    setForm({ staffId: "", monthYear: "", amount: "" });
    setShowForm(false);
    await refresh();
  };

  const handleStatusUpdate = async (id: string, status: Salary["status"]) => {
    await updateSalaryStatus(id, status);
    await refresh();
  };

  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Salary Management</h1>
            <p className="text-muted-foreground">Manage staff salaries</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => { setForm({ staffId: "", monthYear: getCurrentMonthYear(), amount: "" }); }}>
                <Plus size={16} className="mr-2" />
                Add Salary
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Salary</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="staffId">Staff Member</Label>
                  <Select value={form.staffId} onValueChange={(value) => setForm({ ...form, staffId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map(staffMember => (
                        <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                          {staffMember.name} ({staffMember.role_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monthYear">Month/Year</Label>
                  <Input
                    id="monthYear"
                    type="month"
                    value={form.monthYear}
                    onChange={e => setForm({ ...form, monthYear: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit">Create Salary</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <Search size={16} />
          <Input
            placeholder="Search salaries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Month/Year</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaries.map(salary => (
                <TableRow key={salary.id}>
                  <TableCell className="font-medium">{salary.staffName}</TableCell>
                  <TableCell>{salary.roleType}</TableCell>
                  <TableCell>{salary.monthYear}</TableCell>
                  <TableCell>${salary.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      salary.status === 'Paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {salary.status}
                    </span>
                  </TableCell>
                  <TableCell>{salary.paidDate || "-"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {salary.status === 'Unpaid' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(salary.id, 'Paid')}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Mark Paid
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(salary.id, 'Unpaid')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle size={14} className="mr-1" />
                          Mark Unpaid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredSalaries.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No salaries found
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