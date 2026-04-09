import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getAttendance, getAttendancePercentage, type AttendanceRecord } from "@/lib/dataService";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadData = async () => {
      const data = user?.email ? await getAttendance(user.email) : await getAttendance();
      setRecords(data);
      if (user?.id && user?.role === "student") {
        const percent = await getAttendancePercentage(user.id);
        setPercentage(percent);
      }
    };
    loadData();
  }, [user]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, "Present" | "Absent" | "Late"> = {};
    records.forEach(r => { map[r.date] = r.status; });
    return map;
  }, [records]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const isStudent = user?.role === "student";

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const handleDateClick = (day: number) => {
    if (isStudent) return;
    const date = formatDate(currentYear, currentMonth, day);
    navigate(`/attendance/mark?date=${date}`);
  };

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

            let bgClass = "hover:bg-muted";
            if (isStudent && status === "Present") bgClass = "bg-success/20 text-success hover:bg-success/30";
            else if (isStudent && status === "Late") bgClass = "bg-success/20 text-success hover:bg-success/30";
            else if (isStudent && status === "Absent") bgClass = "bg-destructive/20 text-destructive hover:bg-destructive/30";

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`aspect-square flex items-center justify-center rounded-md text-sm font-medium transition-colors ${bgClass} ${!isStudent ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : "cursor-default"}`}
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

        {!isStudent && (
          <p className="text-xs text-muted-foreground mt-4">Click on a date to mark attendance</p>
        )}
      </div>
    </DashboardLayout>
  );
}
