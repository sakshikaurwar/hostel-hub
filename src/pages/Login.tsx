import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "@/lib/dataService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }

    const user = loginUser(email, password);
    if (user) navigate("/dashboard");
    else setError("Login failed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-bold">HostelHub</h1>
          <p className="text-muted-foreground mt-1">Sign in to manage your hostel</p>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@hostel.com" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">Sign In</button>
          </form>

          <div className="mt-5 pt-5 border-t">
            <p className="text-xs text-muted-foreground text-center mb-2">Demo accounts (any password):</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <button onClick={() => { setEmail("student@hostel.com"); setPassword("demo"); }} className="p-2 rounded-md bg-muted hover:bg-accent transition-colors">
                <span className="block font-medium">Student</span>
                <span className="text-muted-foreground">student@</span>
              </button>
              <button onClick={() => { setEmail("staff@hostel.com"); setPassword("demo"); }} className="p-2 rounded-md bg-muted hover:bg-accent transition-colors">
                <span className="block font-medium">Staff</span>
                <span className="text-muted-foreground">staff@</span>
              </button>
              <button onClick={() => { setEmail("admin@hostel.com"); setPassword("demo"); }} className="p-2 rounded-md bg-muted hover:bg-accent transition-colors">
                <span className="block font-medium">Admin</span>
                <span className="text-muted-foreground">admin@</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
