import { getCurrentUser, getAttendance, getAttendancePercentage } from "../dataService.js";
import { navigate } from "../router.js";
import { renderLayout, attachLayoutListeners } from "../layout.js";
import { icons } from "../icons.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function formatDate(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }

export function renderAttendance() {
  const root = document.getElementById("root");
  const user = getCurrentUser();
  if (!user) { navigate("/"); return; }

  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  const isStudent = user.role === "Student";

  function render() {
    const records = isStudent ? getAttendance(user.email) : getAttendance();
    const percentage = isStudent ? getAttendancePercentage(user.email) : 0;

    const attendanceMap = {};
    records.forEach(r => { attendanceMap[r.date] = r.status; });

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const presentCount = records.filter(r => r.status === "Present" || r.status === "Late").length;

    const content = `
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Attendance</h1>
        <p class="text-muted-foreground">Track and manage hostel attendance</p>
      </div>
      ${isStudent ? `
        <div class="stat-card mb-6 max-w-sm">
          <p class="text-sm text-muted-foreground mb-2">Your Attendance</p>
          <div class="flex items-end gap-2">
            <span class="text-4xl font-bold">${percentage}%</span>
            <span class="text-sm text-muted-foreground mb-1">(${presentCount}/${records.length} days)</span>
          </div>
          <div class="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div class="h-full rounded-full bg-primary transition-all" style="width: ${percentage}%"></div>
          </div>
        </div>
      ` : ""}
      <div class="bg-card rounded-lg border p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <button id="prev-month" class="p-2 rounded-md hover:bg-muted">${icons.chevronLeft}</button>
          <h3 class="font-semibold text-lg">${MONTHS[currentMonth]} ${currentYear}</h3>
          <button id="next-month" class="p-2 rounded-md hover:bg-muted">${icons.chevronRight}</button>
        </div>
        <div class="grid grid-cols-7 gap-1">
          ${DAYS.map(d => `<div class="text-center text-xs font-medium text-muted-foreground py-2">${d}</div>`).join("")}
          ${Array.from({ length: firstDay }).map((_, i) => `<div></div>`).join("")}
          ${Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = formatDate(currentYear, currentMonth, day);
            const status = attendanceMap[date];
            let bgClass = "hover:bg-muted";
            if (isStudent && (status === "Present" || status === "Late")) bgClass = "bg-success/20 text-success hover:bg-success/30";
            else if (isStudent && status === "Absent") bgClass = "bg-destructive/20 text-destructive hover:bg-destructive/30";
            const cursorClass = !isStudent ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : "cursor-default";
            return `<button class="aspect-square flex items-center justify-center rounded-md text-sm font-medium transition-colors ${bgClass} ${cursorClass}" data-day="${day}">${day}</button>`;
          }).join("")}
        </div>
        ${isStudent ? `
          <div class="flex gap-4 mt-4 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-success/30"></span> Present</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-destructive/30"></span> Absent</span>
          </div>
        ` : `<p class="text-xs text-muted-foreground mt-4">Click on a date to mark attendance</p>`}
      </div>
    `;

    root.innerHTML = renderLayout(content);
    attachLayoutListeners();

    document.getElementById("prev-month")?.addEventListener("click", () => {
      if (currentMonth === 0) { currentMonth = 11; currentYear--; } else currentMonth--;
      render();
    });
    document.getElementById("next-month")?.addEventListener("click", () => {
      if (currentMonth === 11) { currentMonth = 0; currentYear++; } else currentMonth++;
      render();
    });

    if (!isStudent) {
      document.querySelectorAll("[data-day]").forEach(btn => {
        btn.addEventListener("click", () => {
          const day = parseInt(btn.getAttribute("data-day"));
          const date = formatDate(currentYear, currentMonth, day);
          navigate(`/attendance/mark?date=${date}`);
        });
      });
    }
  }

  render();
}
