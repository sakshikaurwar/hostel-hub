import { registerRoute, startRouter } from "./router.js";
import { renderLogin } from "./pages/login.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderComplaints } from "./pages/complaints.js";
import { renderAttendance } from "./pages/attendance.js";
import { renderMarkAttendance } from "./pages/markAttendance.js";
import { renderPayments } from "./pages/payments.js";
import { renderProfile } from "./pages/profile.js";
import { renderNotFound } from "./pages/notFound.js";

export function initApp() {
  registerRoute("/", renderLogin);
  registerRoute("/dashboard", renderDashboard);
  registerRoute("/complaints", renderComplaints);
  registerRoute("/attendance", renderAttendance);
  registerRoute("/attendance/mark", renderMarkAttendance);
  registerRoute("/payments", renderPayments);
  registerRoute("/profile", renderProfile);
  registerRoute("*", renderNotFound);

  startRouter();
}
