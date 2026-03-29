import { renderLayout, attachLayoutListeners } from "../layout.js";

export function renderNotFound() {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-background">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-primary mb-4">404</h1>
        <p class="text-xl text-muted-foreground mb-6">Page not found</p>
        <a href="#/" class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Go Home</a>
      </div>
    </div>
  `;
}
