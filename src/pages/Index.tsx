import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/dataService";

export default function Index() {
  const user = getCurrentUser();
  
  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Otherwise redirect to login
  return <Navigate to="/" replace />;
}
