// Simple hash-based router

let currentCleanup = null;

const routes = {};

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = "#" + path;
}

export function getCurrentPath() {
  const hash = window.location.hash.slice(1) || "/";
  return hash;
}

export function getQueryParams() {
  const hash = window.location.hash.slice(1) || "/";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return {};
  const params = {};
  new URLSearchParams(hash.slice(qIndex + 1)).forEach((v, k) => { params[k] = v; });
  return params;
}

export function getRoutePath() {
  const hash = window.location.hash.slice(1) || "/";
  const qIndex = hash.indexOf("?");
  return qIndex === -1 ? hash : hash.slice(0, qIndex);
}

export function startRouter() {
  const handleRoute = () => {
    const path = getRoutePath();
    
    // Cleanup previous page
    if (currentCleanup && typeof currentCleanup === "function") {
      currentCleanup();
      currentCleanup = null;
    }

    const handler = routes[path] || routes["*"];
    if (handler) {
      const cleanup = handler();
      if (typeof cleanup === "function") {
        currentCleanup = cleanup;
      }
    }
  };

  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}
