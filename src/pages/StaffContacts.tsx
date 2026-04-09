import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStaffContacts, type StaffContact } from "@/lib/dataService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffContacts() {
  const [staffContacts, setStaffContacts] = useState<StaffContact[]>([]);

  const refresh = async () => {
    const data = await getStaffContacts();
    setStaffContacts(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Staff Contacts</h1>
          <p className="text-muted-foreground">View the contact details of all hostel staff.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Staff Contact List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffContacts.map((staff) => (
                    <TableRow key={`${staff.name}-${staff.phone}`}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>{staff.role}</TableCell>
                      <TableCell>{staff.phone || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {!staffContacts.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No staff contacts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
