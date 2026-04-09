import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStudents, getRooms, allocateRoom, deallocateRoom, type Student, type Room } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RoomAllocation() {
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);

  const refresh = async () => {
    const studentsData = await getStudents();
    const roomsData = await getRooms();
    setStudents(studentsData);
    setRooms(roomsData);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAllocate = async () => {
    if (!selectedStudent || !selectedRoom) return;
    await allocateRoom(selectedStudent, selectedRoom);
    setSelectedStudent(null);
    setSelectedRoom(null);
    await refresh();
  };

  const handleDeallocate = async (userId: number) => {
    if (confirm("Are you sure you want to deallocate this room?")) {
      await deallocateRoom(userId);
      await refresh();
    }
  };

  const availableStudents = students.filter(s => !s.room_number);
  const allocatedStudents = students.filter(s => s.room_number);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Room Allocation</h1>
          <p className="text-muted-foreground">Assign and manage room allocations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allocate Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Student</label>
                <Select value={selectedStudent?.toString() || ""} onValueChange={(value) => setSelectedStudent(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose student" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map(student => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Select Room</label>
                <Select value={selectedRoom?.toString() || ""} onValueChange={(value) => setSelectedRoom(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.filter(r => r.occupied < r.capacity).map(room => (
                      <SelectItem key={room.room_id} value={room.room_id.toString()}>
                        Room {room.room_no} ({room.occupied}/{room.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAllocate} disabled={!selectedStudent || !selectedRoom}>
                  Allocate Room
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocated Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocatedStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.room_number}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleDeallocate(student.id)}>
                          Deallocate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!allocatedStudents.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No allocated rooms
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