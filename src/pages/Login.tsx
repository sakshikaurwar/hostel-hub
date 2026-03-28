import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, signupUser, type UserRole } from "@/lib/dataService";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("Student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }

    const user = loginUser(email, password);
    if (user) navigate("/dashboard");
    else setError("Invalid email or password");
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("Please fill in all fields"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }

    const user = signupUser({ email, password, name, role });
    if (user) {
      navigate("/dashboard");
    } else {
      setError("An account with this email already exists");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold">MyHostel</h1>
          <p className="text-muted-foreground mt-1">
            {isSignUp ? "Create your account" : "Sign in to manage your hostel"}
          </p>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6">
          {/* Tab switcher */}
          <div className="flex rounded-md bg-muted p-1 mb-5">
            <button
              onClick={() => { setIsSignUp(false); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isSignUp ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isSignUp ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">{error}</div>}
          {success && <div className="p-3 rounded-md bg-success/10 text-success text-sm mb-4">{success}</div>}

          {isSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">Create Account</button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">Sign In</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
