import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getWardenSalary, type Salary } from "@/lib/dataService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WardenStaff() {
  const [salaries, setSalaries] = useState<Salary[]>([]);

  const refresh = async () => {
    const data = await getWardenSalary();
    setSalaries(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Salary Status</h1>
          <p className="text-muted-foreground">View your salary payment status</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Salary Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">{salary.monthYear}</TableCell>
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
                    </TableRow>
                  ))}
                  {!salaries.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No salary records found
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