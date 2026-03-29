import { getCurrentUser, getAttendance, markBulkAttendance, getRoomNumbers, getStudentsByRoom } from "../dataService.js";
import { navigate, getQueryParams } from "../router.js";
import { renderLayout, attachLayoutListeners } from "../layout.js";
import { icons } from "../icons.js";

export function renderMarkAttendance() {
  const root = document.getElementById("root");
  const user = getCurrentUser();
  if (!user) { navigate("/"); return; }

  const params = getQueryParams();
  const selectedDate = params.date || "";
  const roomNumbers = getRoomNumbers();

  // Build students for date
  const studentsForDate = roomNumbers.map(room => ({
    roomNumber: room,
    students: getStudentsByRoom(room).map(s => ({ email: s.email, name: s.name }))
  }));

  // Load existing attendance for this date
  const existingRecords = getAttendance().filter(r => r.date === selectedDate);
  const checkedStudents = {};
  existingRecords.forEach(r => {
    if (r.status === "Present" || r.status === "Late") checkedStudents[r.email || r.studentEmail] = true;
  });

  let markingSuccess = false;

  function render() {
    const content = `
      <div class="flex items-center gap-3 mb-6">
        <button id="back-btn" class="p-2 rounded-md hover:bg-muted">${icons.arrowLeft}</button>
        <div>
          <h1 class="text-2xl font-bold">Mark Attendance</h1>
          <p class="text-muted-foreground">Date: ${selectedDate}</p>
        </div>
      </div>
      <div class="bg-card rounded-lg border p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">Students by Room</h3>
          <button id="save-attendance" class="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            ${icons.check} Save Attendance
          </button>
        </div>
        ${markingSuccess ? `<div class="p-3 rounded-md bg-success/10 text-success text-sm mb-4">Attendance saved successfully!</div>` : ""}
        <div class="space-y-4">
          ${studentsForDate.map(room => `
            <div class="border rounded-md p-4">
              <h4 class="font-medium text-sm mb-3 text-muted-foreground">Room ${room.roomNumber}</h4>
              <div class="space-y-2">
                ${room.students.map(student => `
                  <label class="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" class="att-check w-4 h-4 rounded border-border text-primary focus:ring-ring" data-email="${student.email}" ${checkedStudents[student.email] ? "checked" : ""} />
                    <span class="text-sm font-medium">${student.name}</span>
                    <span class="text-xs text-muted-foreground">(${student.email})</span>
                  </label>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    root.innerHTML = renderLayout(content);
    attachLayoutListeners();

    document.getElementById("back-btn")?.addEventListener("click", () => navigate("/attendance"));

    document.querySelectorAll(".att-check").forEach(cb => {
      cb.addEventListener("change", () => {
        checkedStudents[cb.getAttribute("data-email")] = cb.checked;
      });
    });

    document.getElementById("save-attendance")?.addEventListener("click", () => {
      if (!selectedDate || !user) return;
      const records = [];
      studentsForDate.forEach(room => {
        room.students.forEach(s => {
          records.push({
            studentEmail: s.email,
            studentName: s.name,
            roomNumber: room.roomNumber,
            date: selectedDate,
            status: checkedStudents[s.email] ? "Present" : "Absent",
            markedBy: user.email,
          });
        });
      });
      markBulkAttendance(records);
      markingSuccess = true;
      render();
    });
  }

  render();
}
