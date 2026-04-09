import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getAttendance, markBulkAttendance, getStudents, type AttendanceRecord } from "@/lib/dataService";
import { ArrowLeft, Check } from "lucide-react";

export default function MarkAttendance() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") || "";

  const [checkedStudents, setCheckedStudents] = useState<Record<string, boolean>>({});
  const [markingSuccess, setMarkingSuccess] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const studentsByRoom = useMemo(() => {
    const result: { roomNumber: string; students: { id: number; email: string; name: string }[] }[] = [];
    const roomMap: Record<string, { id: number; email: string; name: string }[]> = {};
    
    students.forEach(student => {
      const room = student.room_number || "Unassigned";
      if (!roomMap[room]) roomMap[room] = [];
      roomMap[room].push({ id: student.id, email: student.email, name: student.name });
    });
    
    Object.keys(roomMap).sort().forEach(room => {
      result.push({ roomNumber: room, students: roomMap[room] });
    });
    
    return result;
  }, [students]);

  useEffect(() => {
    const loadData = async () => {
      const studentsData = await getStudents();
      setStudents(studentsData);
      
      if (selectedDate) {
        const attendanceData = await getAttendance();
        setRecords(attendanceData);
        const existing = attendanceData.filter((r: AttendanceRecord) => r.date === selectedDate);
        const checked: Record<string, boolean> = {};
        existing.forEach((r: AttendanceRecord) => {
          if (r.status === "Present" || r.status === "Late") checked[r.studentEmail] = true;
        });
        setCheckedStudents(checked);
      }
    };
    loadData();
  }, [selectedDate]);

  const handleMarkAttendance = () => {
    if (!selectedDate || !user) return;
    const allStudentEmails: { id: number; email: string; name: string; roomNumber: string }[] = [];
    studentsByRoom.forEach(room => {
      room.students.forEach(s => {
        allStudentEmails.push({ id: s.id, email: s.email, name: s.name, roomNumber: room.roomNumber });
      });
    });

    const attendanceRecords = allStudentEmails.map(s => ({
      studentEmail: s.email,
      studentName: s.name,
      roomNumber: s.roomNumber,
      date: selectedDate,
      status: (checkedStudents[s.email] ? "Present" : "Absent") as AttendanceRecord["status"],
      markedBy: user.email,
    }));

    markBulkAttendance(attendanceRecords);
    setMarkingSuccess(true);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/attendance")} className="p-2 rounded-md hover:bg-muted">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
          <p className="text-muted-foreground">Date: {selectedDate}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Students by Room</h3>
          <button onClick={handleMarkAttendance} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Check size={16} /> Save Attendance
          </button>
        </div>

        {markingSuccess && (
          <div className="p-3 rounded-md bg-success/10 text-success text-sm mb-4">Attendance saved successfully!</div>
        )}

        <div className="space-y-4">
          {studentsByRoom.map(room => (
            <div key={room.roomNumber} className="border rounded-md p-4">
              <h4 className="font-medium text-sm mb-3 text-muted-foreground">Room {room.roomNumber}</h4>
              <div className="space-y-2">
                {room.students.map(student => (
                  <label key={student.email} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!checkedStudents[student.email]}
                      onChange={e => setCheckedStudents(prev => ({ ...prev, [student.email]: e.target.checked }))}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium">{student.name}</span>
                    <span className="text-xs text-muted-foreground">({student.email})</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
