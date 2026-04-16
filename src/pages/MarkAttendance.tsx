import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getAttendanceByDate, markBulkAttendance, type AttendanceRecord } from "@/lib/dataService";
import { ArrowLeft, Check } from "lucide-react";

type AttendanceState = "Present" | "Absent" | "NotMarked";

export default function MarkAttendance() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { date: routeDate } = useParams();
  const [searchParams] = useSearchParams();
  const selectedDate = routeDate || searchParams.get("date") || "";

  // "NotMarked" = third state = black (not yet saved)
  const [attendanceStatus, setAttendanceStatus] = useState<Record<number, AttendanceState>>({});
  const [markingSuccess, setMarkingSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupedRecords, setGroupedRecords] = useState<Record<string, AttendanceRecord[]>>({});

  useEffect(() => {
    const loadData = async () => {
      if (selectedDate) {
        console.log("[MarkAttendance] Loading data for", selectedDate);
        const data = await getAttendanceByDate(selectedDate);
        setGroupedRecords(data);

        const statusMap: Record<number, AttendanceState> = {};
        Object.values(data).flat().forEach((r: AttendanceRecord) => {
          if (r.status !== "NotMarked") {
            statusMap[r.studentId] = (r.status === "Present" || r.status === "Late") ? "Present" : "Absent";
          }
        });
        setAttendanceStatus(statusMap);
      }
    };
    loadData();
  }, [selectedDate]);

  const handleToggle = (studentId: number, value: AttendanceState) => {
    setAttendanceStatus(prev => {
      // If clicking the same state again, revert to NotMarked
      if (prev[studentId] === value) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: value };
    });
  };

  const handleMarkAttendance = async () => {
    if (!selectedDate || !user) return;
    setSaving(true);

    const allStudents = Object.values(groupedRecords).flat();

    // Only submit students that were explicitly marked (not "NotMarked")
    const attendanceRecords = allStudents
      .filter(s => attendanceStatus[s.studentId] === "Present" || attendanceStatus[s.studentId] === "Absent")
      .map(s => ({
        studentId: s.studentId,
        studentEmail: s.studentEmail,
        studentName: s.studentName,
        roomNumber: s.roomNumber,
        date: selectedDate,
        status: attendanceStatus[s.studentId] as AttendanceRecord["status"],
        markedBy: user.email,
      }));

    try {
      await markBulkAttendance(attendanceRecords);
      setMarkingSuccess(true);
      setTimeout(() => setMarkingSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const getButtonClass = (studentId: number, state: AttendanceState) => {
    const current = attendanceStatus[studentId];
    if (state === "Present") {
      return current === "Present"
        ? "bg-green-600 text-white shadow-sm ring-2 ring-green-400"
        : "bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-800";
    }
    if (state === "Absent") {
      return current === "Absent"
        ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400"
        : "bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-800";
    }
    return "";
  };

  const getRowBg = (studentId: number) => {
    const s = attendanceStatus[studentId];
    if (s === "Present") return "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900";
    if (s === "Absent") return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900";
    return "border-transparent hover:bg-muted"; // Not marked = neutral
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

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-xs font-medium">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Present</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Absent</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Not Marked</span>
      </div>

      <div className="bg-card rounded-lg border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Students by Room</h3>
          <button
            onClick={handleMarkAttendance}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            <Check size={16} /> {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>

        {markingSuccess && (
          <div className="p-3 rounded-md bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 text-sm mb-4 font-medium">
            ✓ Attendance saved successfully!
          </div>
        )}

        <div className="space-y-4">
          {Object.keys(groupedRecords).length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center">No students with active room assignments found for this date.</p>
          )}
          {Object.keys(groupedRecords).sort().map(roomNo => (
            <div key={roomNo} className="border rounded-md overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-sm">Room {roomNo}</h4>
              </div>
              <div className="divide-y">
                {groupedRecords[roomNo].map(student => (
                  <div
                    key={student.studentId}
                    className={`flex items-center justify-between py-2.5 px-4 border transition-colors ${getRowBg(student.studentId)}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{student.studentName}</span>
                      <span className="text-xs text-muted-foreground">{student.studentEmail} • {student.department || "No Dept"}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {!attendanceStatus[student.studentId] && (
                        <span className="text-xs text-gray-400 font-medium mr-1">Not Marked</span>
                      )}
                      <button
                        onClick={() => handleToggle(student.studentId, "Present")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${getButtonClass(student.studentId, "Present")}`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleToggle(student.studentId, "Absent")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${getButtonClass(student.studentId, "Absent")}`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
