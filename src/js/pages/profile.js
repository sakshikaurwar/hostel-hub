import { getCurrentUser, updateUserProfile } from "../dataService.js";
import { navigate } from "../router.js";
import { renderLayout, attachLayoutListeners } from "../layout.js";
import { icons } from "../icons.js";

export function renderProfile() {
  const root = document.getElementById("root");
  let user = getCurrentUser();
  if (!user) { navigate("/"); return; }

  let editing = false;
  let form = {
    name: user.name || "",
    age: user.age?.toString() || "",
    phone: user.phone || "",
    address: user.address || "",
    year: user.year || "",
    department: user.department || "",
    branch: user.branch || "",
    gender: user.gender || "",
  };

  const isStudent = user.role === "Student";

  const studentFields = [
    { label: "Name", key: "name" },
    { label: "Age", key: "age" },
    { label: "Address", key: "address" },
    { label: "Year", key: "year" },
    { label: "Department", key: "department" },
    { label: "Branch", key: "branch" },
    { label: "Gender", key: "gender" },
  ];

  const staffAdminFields = [
    { label: "Name", key: "name" },
    { label: "Age", key: "age" },
    { label: "Role", key: "role", readonly: true },
    { label: "Phone Number", key: "phone" },
  ];

  const fields = isStudent ? studentFields : staffAdminFields;

  function getDisplayValue(key) {
    if (key === "role") return user.role || "N/A";
    if (key === "age") return user.age?.toString() || "N/A";
    return user[key] || "N/A";
  }

  function render() {
    const inputClass = "w-full px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

    const content = `
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Profile</h1>
        <p class="text-muted-foreground">Your account information</p>
      </div>
      <div class="bg-card rounded-lg border p-6 max-w-lg">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span class="text-primary-foreground text-2xl font-bold">${user.name?.[0] || "?"}</span>
            </div>
            <div>
              <h2 class="text-xl font-semibold">${user.name}</h2>
              <span class="status-badge status-in-progress">${user.role}</span>
            </div>
          </div>
          ${!editing ? `
            <button id="edit-btn" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
              ${icons.pencil} Edit
            </button>
          ` : `
            <div class="flex gap-2">
              <button id="save-btn" class="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                ${icons.check} Save
              </button>
              <button id="cancel-btn" class="flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted">
                ${icons.xSmall} Cancel
              </button>
            </div>
          `}
        </div>
        <div class="space-y-4">
          ${fields.map(item => `
            <div class="flex justify-between items-center py-3 border-b last:border-0">
              <span class="text-muted-foreground text-sm">${item.label}</span>
              ${editing && !item.readonly
                ? `<input class="profile-input ${inputClass} max-w-[200px]" data-key="${item.key}" value="${form[item.key] || ""}" />`
                : `<span class="text-sm font-medium">${getDisplayValue(item.key)}</span>`
              }
            </div>
          `).join("")}
        </div>
      </div>
    `;

    root.innerHTML = renderLayout(content);
    attachLayoutListeners();

    document.getElementById("edit-btn")?.addEventListener("click", () => { editing = true; render(); });

    document.getElementById("save-btn")?.addEventListener("click", () => {
      // Read all inputs
      document.querySelectorAll(".profile-input").forEach(input => {
        form[input.getAttribute("data-key")] = input.value;
      });
      const updated = updateUserProfile(user.email, {
        name: form.name,
        age: form.age ? parseInt(form.age) : undefined,
        phone: form.phone,
        address: form.address,
        year: form.year,
        department: form.department,
        branch: form.branch,
        gender: form.gender,
      });
      if (updated) user = updated;
      editing = false;
      render();
    });

    document.getElementById("cancel-btn")?.addEventListener("click", () => {
      form = {
        name: user.name || "",
        age: user.age?.toString() || "",
        phone: user.phone || "",
        address: user.address || "",
        year: user.year || "",
        department: user.department || "",
        branch: user.branch || "",
        gender: user.gender || "",
      };
      editing = false;
      render();
    });
  }

  render();
}
