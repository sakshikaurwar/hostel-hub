import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getAttendance, getAttendancePercentage, type AttendanceRecord } from "@/lib/dataService";
import { ChevronLeft, ChevronRight, Calendar, List } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filterDate, setFilterDate] = useState<string>("");

  const isStudent = user?.role === "student";

  useEffect(() => {
    const loadData = async () => {
      // Backend already filters by role — students get only their own, admin/warden get all
      const data = await getAttendance();
      console.log("[Attendance] Loaded", data.length, "records");
      setRecords(data);
      if (user?.id && user?.role === "student") {
        const percent = await getAttendancePercentage(user.id);
        setPercentage(percent);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  // Calendar date → status map (students only)
  const attendanceMap = useMemo(() => {
    const map: Record<string, "Present" | "Absent" | "Late"> = {};
    records.forEach(r => { map[r.date] = r.status; });
    return map;
  }, [records]);

  // Room-wise grouped records (admin/warden)
  const roomGroups = useMemo(() => {
    if (isStudent) return {};
    const filtered = filterDate ? records.filter(r => r.date === filterDate) : records;
    const groups: Record<string, AttendanceRecord[]> = {};
    filtered.forEach(r => {
      const room = r.roomNumber || "N/A";
      if (!groups[room]) groups[room] = [];
      groups[room].push(r);
    });
    return groups;
  }, [records, filterDate, isStudent]);

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

  const handleDateClick = (day: number) => {
    if (isStudent) return;
    const date = formatDate(currentYear, currentMonth, day);
    navigate(`/attendance/${date}`);
  };

  const statusBadge = (status: string) => {
    if (status === "Present" || status === "Late")
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400">Present</span>;
    if (status === "Absent")
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">Absent</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">—</span>;
  };

  const years = useMemo(() => {
    const startYear = new Date().getFullYear() - 5;
    return Array.from({ length: 11 }, (_, i) => startYear + i);
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track and manage hostel attendance</p>
        </div>
        {!isStudent && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded-md transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              title="Calendar view"
            >
              <Calendar size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              title="Room-list view"
            >
              <List size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Student: attendance % card */}
      {isStudent && (
        <div className="stat-card mb-6 max-w-sm">
          <p className="text-sm text-muted-foreground mb-2">Your Attendance</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{percentage}%</span>
            <span className="text-sm text-muted-foreground mb-1">
              ({records.filter(r => r.status === "Present" || r.status === "Late").length}/{records.length} days)
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      )}

      {/* CALENDAR VIEW (students always, admin/warden in calendar mode) */}
      {(isStudent || viewMode === "calendar") && (
        <div className="bg-card rounded-lg border p-5 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2 rounded-md hover:bg-muted"><ChevronLeft size={18} /></button>
              <div className="flex items-center gap-2 mx-2">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="bg-transparent font-semibold text-lg focus:outline-none cursor-pointer hover:text-primary"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="bg-transparent font-semibold text-lg focus:outline-none cursor-pointer hover:text-primary"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <button onClick={nextMonth} className="p-2 rounded-md hover:bg-muted"><ChevronRight size={18} /></button>
            </div>
            
            {!isStudent && (
               <div className="text-xs text-muted-foreground hidden sm:block">
                 Click a date to manage room-wise attendance
               </div>
            )}
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
              if (isStudent && (status === "Present" || status === "Late")) bgClass = "bg-green-500/20 text-green-700 hover:bg-green-500/30 dark:text-green-400 font-semibold";
              else if (isStudent && status === "Absent") bgClass = "bg-red-500/20 text-red-700 hover:bg-red-500/30 dark:text-red-400 font-semibold";

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  title={!isStudent ? `Mark attendance for ${date}` : status || "No record"}
                  className={`aspect-square flex items-center justify-center rounded-md text-sm transition-colors ${bgClass} ${!isStudent ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : "cursor-default"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500/40 inline-block" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500/40 inline-block" /> Absent</span>
            {!isStudent && <span className="text-muted-foreground">Click a date to mark attendance</span>}
          </div>
        </div>
      )}

      {/* ADMIN/WARDEN LIST VIEW: room-wise attendance table */}
      {!isStudent && viewMode === "list" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Filter by date:</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-3 py-1.5 rounded-md border bg-background text-sm"
            />
            {filterDate && (
              <button onClick={() => setFilterDate("")} className="text-xs text-muted-foreground underline hover:text-foreground">
                Clear
              </button>
            )}
          </div>

          {Object.keys(roomGroups).length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center">No attendance records found.</p>
          )}

          {Object.keys(roomGroups).sort().map(room => (
            <div key={room} className="bg-card rounded-lg border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-sm">Room {room}</h4>
              </div>
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Dept/Branch</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roomGroups[room].map(r => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.studentName}</td>
                      <td className="text-xs text-muted-foreground">{r.department} / {r.branch}</td>
                      <td className="text-muted-foreground">{r.date}</td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
