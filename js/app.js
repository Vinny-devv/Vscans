/**
 * app.js
 * V Scans – Main entry point.
 * Bootstraps auth, router, sidebar, search, and all UI interactions.
 */

import { signInWithGoogle, signOutUser, onAuthChange, updateAuthUI, showToast } from "./auth.js";
import { route, notFound, startRouter, navigate } from "./router.js";
import {
  renderHome,
  renderMangaDetail,
  renderReader,
  renderCategories,
  renderSearch,
  renderAdmin,
  renderNotFound
} from "./pages.js";

// ── Wait for DOM ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // ── Auth state listener (persistent sessions via Firebase) ────────
  onAuthChange((user) => {
    updateAuthUI(user);
  });

  // ── Router definitions ────────────────────────────────────────────
  route("/",                    renderHome);
  route("/manga/:id",           renderMangaDetail);
  route("/read/:mangaId/:chapterId", renderReader);
  route("/categories",          renderCategories);
  route("/search",              renderSearch);
  route("/admin",               renderAdmin);
  notFound(renderNotFound);

  startRouter();

  // ── Navbar: Sign-In button ────────────────────────────────────────
  document.getElementById("loginBtn")?.addEventListener("click", signInWithGoogle);

  // ── Navbar: Sign-Out ─────────────────────────────────────────────
  document.getElementById("signOutBtn")?.addEventListener("click", signOutUser);

  // ── Navbar: Admin dashboard button ───────────────────────────────
  document.getElementById("adminBtn")?.addEventListener("click", () => navigate("/admin"));

  // ── Navbar: Logo click → Home ─────────────────────────────────────
  document.getElementById("logoLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });

  // ── Sidebar toggle (hamburger) ────────────────────────────────────
  const sidebar     = document.getElementById("sidebar");
  const sideOverlay = document.getElementById("sidebarOverlay");
  const hamburger   = document.getElementById("hamburgerBtn");

  function openSidebar() {
    sidebar.classList.add("sidebar-open");
    sideOverlay.classList.remove("hidden");
    hamburger.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("sidebar-open");
    sideOverlay.classList.add("hidden");
    hamburger.setAttribute("aria-expanded", "false");
  }

  hamburger?.addEventListener("click", () => {
    sidebar.classList.contains("sidebar-open") ? closeSidebar() : openSidebar();
  });
  sideOverlay?.addEventListener("click", closeSidebar);

  // ── Sidebar navigation links ──────────────────────────────────────
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.nav;
      closeSidebar();

      if (target === "donate") {
        window.open("https://www.paypal.me/AnouarBah", "_blank", "noopener,noreferrer");
      } else {
        navigate("/" + (target === "home" ? "" : target));
      }
    });
  });

  // ── Search bar ────────────────────────────────────────────────────
  const searchInput  = document.getElementById("searchInput");
  const searchBtn    = document.getElementById("searchBtn");

  function doSearch() {
    const q = searchInput?.value.trim();
    if (q) {
      navigate("/search?q=" + encodeURIComponent(q));
      searchInput.value = "";
    }
  }

  searchBtn?.addEventListener("click", doSearch);
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  // ── User menu dropdown toggle ─────────────────────────────────────
  const userMenuToggle  = document.getElementById("userMenuToggle");
  const userDropdown    = document.getElementById("userDropdown");

  userMenuToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    userDropdown?.classList.add("hidden");
  });

  // ── Keyboard accessibility: close sidebar with Escape ─────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      userDropdown?.classList.add("hidden");
    }
  });

  // ── Scroll-to-top button ──────────────────────────────────────────
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      scrollTopBtn?.classList.remove("opacity-0", "pointer-events-none");
      scrollTopBtn?.classList.add("opacity-100");
    } else {
      scrollTopBtn?.classList.add("opacity-0", "pointer-events-none");
      scrollTopBtn?.classList.remove("opacity-100");
    }
  });
  scrollTopBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
});
