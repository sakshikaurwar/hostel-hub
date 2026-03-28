import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getAttendance, getAttendancePercentage, markBulkAttendance, getRoomNumbers, getStudentsByRoom, type AttendanceRecord } from "@/lib/dataService";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function Attendance() {
  const user = getCurrentUser();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [checkedStudents, setCheckedStudents] = useState<Record<string, boolean>>({});
  const [markingSuccess, setMarkingSuccess] = useState(false);

  const refresh = () => {
    const data = user?.role === "Student" ? getAttendance(user.email) : getAttendance();
    setRecords(data);
    if (user?.role === "Student") setPercentage(getAttendancePercentage(user.email));
  };

  useEffect(refresh, []);

  // Calendar data for students
  const attendanceMap = useMemo(() => {
    const map: Record<string, "Present" | "Absent" | "Late"> = {};
    records.forEach(r => { map[r.date] = r.status; });
    return map;
  }, [records]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // Staff/Admin: room-based attendance
  const roomNumbers = getRoomNumbers();
  const studentsForDate = useMemo(() => {
    if (!selectedDate) return [];
    // Get all rooms and their students
    const result: { roomNumber: string; students: { email: string; name: string }[] }[] = [];
    roomNumbers.forEach(room => {
      const students = getStudentsByRoom(room);
      result.push({ roomNumber: room, students: students.map(s => ({ email: s.email, name: s.name })) });
    });
    return result;
  }, [selectedDate, roomNumbers]);

  const handleDateSelect = (day: number) => {
    const date = formatDate(currentYear, currentMonth, day);
    setSelectedDate(date);
    setCheckedStudents({});
    setMarkingSuccess(false);

    // Pre-check students who already have attendance for this date
    const existing = records.filter(r => r.date === date);
    const checked: Record<string, boolean> = {};
    existing.forEach(r => {
      if (r.status === "Present" || r.status === "Late") checked[r.studentEmail] = true;
    });
    setCheckedStudents(checked);
  };

  const handleMarkAttendance = () => {
    if (!selectedDate || !user) return;
    const allStudentEmails: { email: string; name: string; roomNumber: string }[] = [];
    studentsForDate.forEach(room => {
      room.students.forEach(s => {
        allStudentEmails.push({ email: s.email, name: s.name, roomNumber: room.roomNumber });
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
    refresh();
  };

  const isStudent = user?.role === "Student";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Track and manage hostel attendance</p>
      </div>

      {isStudent && (
        <div className="stat-card mb-6 max-w-sm">
          <p className="text-sm text-muted-foreground mb-2">Your Attendance</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{percentage}%</span>
            <span className="text-sm text-muted-foreground mb-1">({records.filter(r => r.status === "Present" || r.status === "Late").length}/{records.length} days)</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-card rounded-lg border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-md hover:bg-muted"><ChevronLeft size={18} /></button>
          <h3 className="font-semibold text-lg">{MONTHS[currentMonth]} {currentYear}</h3>
          <button onClick={nextMonth} className="p-2 rounded-md hover:bg-muted"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = formatDate(currentYear, currentMonth, day);
            const status = attendanceMap[date];
            const isSelected = selectedDate === date;

            let bgClass = "hover:bg-muted";
            if (isStudent && status === "Present") bgClass = "bg-success/20 text-success hover:bg-success/30";
            else if (isStudent && status === "Late") bgClass = "bg-success/20 text-success hover:bg-success/30";
            else if (isStudent && status === "Absent") bgClass = "bg-destructive/20 text-destructive hover:bg-destructive/30";

            if (!isStudent && isSelected) bgClass = "bg-primary text-primary-foreground";

            return (
              <button
                key={day}
                onClick={() => !isStudent && handleDateSelect(day)}
                className={`aspect-square flex items-center justify-center rounded-md text-sm font-medium transition-colors ${bgClass} ${!isStudent ? "cursor-pointer" : "cursor-default"}`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {isStudent && (
          <div className="flex gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-success/30" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-destructive/30" /> Absent</span>
          </div>
        )}
      </div>

      {/* Staff/Admin: Mark attendance for selected date */}
      {!isStudent && selectedDate && (
        <div className="bg-card rounded-lg border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Mark Attendance — {selectedDate}</h3>
            <button onClick={handleMarkAttendance} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Check size={16} /> Save Attendance
            </button>
          </div>

          {markingSuccess && (
            <div className="p-3 rounded-md bg-success/10 text-success text-sm mb-4">Attendance saved successfully!</div>
          )}

          <div className="space-y-4">
            {studentsForDate.map(room => (
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
      )}
    </DashboardLayout>
  );
}
