/**
 * router.js
 * Lightweight hash-based SPA router.
 * Maps URL hashes to page render functions.
 *
 * Routes:
 *  #/          → Home page
 *  #/manga/:id → Manga detail page
 *  #/read/:mangaId/:chapterId → Chapter reader
 *  #/categories → Categories page
 *  #/admin     → Admin dashboard
 *  #/search?q= → Search results
 */

// Registry: route pattern → handler function
const routes = {};
let _notFoundHandler = () => {};

/**
 * Register a route.
 * @param {string}   pattern  - e.g. "/manga/:id"
 * @param {Function} handler  - (params, query) => void
 */
export function route(pattern, handler) {
  routes[pattern] = handler;
}

/**
 * Register a 404 fallback.
 * @param {Function} handler
 */
export function notFound(handler) {
  _notFoundHandler = handler;
}

/**
 * Navigate to a new hash route.
 * @param {string} path - e.g. "/manga/abc123"
 */
export function navigate(path) {
  window.location.hash = "#" + path;
}

/**
 * Parse the current hash and invoke the matching route handler.
 */
export function resolve() {
  const hash  = window.location.hash.slice(1) || "/";
  const [pathWithParams, queryStr] = hash.split("?");
  const pathParts = pathWithParams.split("/").filter(Boolean);

  // Build query object
  const query = {};
  if (queryStr) {
    queryStr.split("&").forEach((pair) => {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
  }

  // Try each registered pattern
  for (const [pattern, handler] of Object.entries(routes)) {
    const patternParts = pattern.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      handler(params, query);
      return;
    }
  }

  _notFoundHandler({}, query);
}

/**
 * Start the router — listen for hash changes and resolve on load.
 */
export function startRouter() {
  window.addEventListener("hashchange", resolve);
  resolve(); // Handle initial load
}
