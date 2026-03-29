import { loginUser, signupUser } from "../dataService.js";
import { navigate } from "../router.js";

export function renderLogin() {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-background p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span class="text-primary-foreground font-bold text-2xl">M</span>
          </div>
          <h1 class="text-2xl font-bold">MyHostel</h1>
          <p class="text-muted-foreground mt-1" id="login-subtitle">Sign in to manage your hostel</p>
        </div>
        <div class="bg-card rounded-lg border shadow-sm p-6">
          <div class="flex rounded-md bg-muted p-1 mb-5">
            <button id="tab-signin" class="flex-1 py-2 text-sm font-medium rounded-md transition-colors bg-card shadow-sm text-foreground">Sign In</button>
            <button id="tab-signup" class="flex-1 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground">Sign Up</button>
          </div>
          <div id="login-error" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4 hidden"></div>
          <div id="login-form-container"></div>
        </div>
      </div>
    </div>
  `;

  let isSignUp = false;

  function renderForm() {
    const container = document.getElementById("login-form-container");
    const subtitle = document.getElementById("login-subtitle");
    subtitle.textContent = isSignUp ? "Create your account" : "Sign in to manage your hostel";

    // Update tabs
    const tabSignIn = document.getElementById("tab-signin");
    const tabSignUp = document.getElementById("tab-signup");
    tabSignIn.className = `flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isSignUp ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`;
    tabSignUp.className = `flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isSignUp ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`;

    const inputClass = "w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

    if (isSignUp) {
      container.innerHTML = `
        <form id="auth-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">Full Name</label>
            <input type="text" id="f-name" placeholder="Your full name" class="${inputClass}" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1.5">Age</label>
              <input type="number" id="f-age" placeholder="Age" class="${inputClass}" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">Phone Number</label>
              <input type="tel" id="f-phone" placeholder="+91 9876543210" class="${inputClass}" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" id="f-email" placeholder="you@example.com" class="${inputClass}" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Password</label>
            <input type="password" id="f-password" placeholder="Create a password" class="${inputClass}" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Role</label>
            <select id="f-role" class="${inputClass}">
              <option value="Student">Student</option>
              <option value="Warden">Warden</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <button type="submit" class="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">Create Account</button>
        </form>
      `;
    } else {
      container.innerHTML = `
        <form id="auth-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" id="f-email" placeholder="you@example.com" class="${inputClass}" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Password</label>
            <input type="password" id="f-password" placeholder="Enter password" class="${inputClass}" />
          </div>
          <button type="submit" class="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">Sign In</button>
        </form>
      `;
    }

    document.getElementById("auth-form").addEventListener("submit", handleSubmit);
  }

  function showError(msg) {
    const el = document.getElementById("login-error");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function hideError() {
    document.getElementById("login-error").classList.add("hidden");
  }

  function handleSubmit(e) {
    e.preventDefault();
    hideError();

    const email = document.getElementById("f-email").value.trim();
    const password = document.getElementById("f-password").value.trim();

    if (!email || !password) { showError("Please fill in all fields"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError("Please enter a valid email"); return; }
    if (password.length < 4) { showError("Password must be at least 4 characters"); return; }

    if (isSignUp) {
      const name = document.getElementById("f-name").value.trim();
      if (!name) { showError("Please fill in all fields"); return; }
      const age = document.getElementById("f-age").value;
      const phone = document.getElementById("f-phone").value;
      const role = document.getElementById("f-role").value;
      const user = signupUser({ email, password, name, role, age: age ? parseInt(age) : undefined, phone: phone || undefined });
      if (user) navigate("/dashboard");
      else showError("An account with this email already exists");
    } else {
      const user = loginUser(email, password);
      if (user) navigate("/dashboard");
      else showError("Invalid email or password");
    }
  }

  document.getElementById("tab-signin").addEventListener("click", () => { isSignUp = false; hideError(); renderForm(); });
  document.getElementById("tab-signup").addEventListener("click", () => { isSignUp = true; hideError(); renderForm(); });

  renderForm();
}
