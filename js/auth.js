/**
 * auth.js
 * Handles all Firebase Authentication logic:
 *  - Google Sign-In popup
 *  - Sign-Out
 *  - Persistent session via onAuthStateChanged
 *  - Admin detection
 *  - UI updates based on auth state
 */

import { auth, googleProvider, ADMIN_EMAIL } from "./firebase-config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Exported reactive auth state ─────────────────────────────────────────────
export let currentUser = null;

/**
 * Returns true if the signed-in user is the site admin.
 */
export const isAdmin = () =>
  currentUser && currentUser.email === ADMIN_EMAIL;

/**
 * Trigger Google OAuth popup and sign in.
 */
export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error("Sign-in error:", err);
    showToast("Sign-in failed: " + err.message, "error");
  }
}

/**
 * Sign the current user out of Firebase Auth.
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    showToast("You have been signed out.", "info");
  } catch (err) {
    console.error("Sign-out error:", err);
    showToast("Sign-out failed.", "error");
  }
}

/**
 * Subscribe to auth state changes.
 * Fires immediately with the current user (persisted across refreshes).
 *
 * @param {Function} callback  - (user) => void
 * @returns {Function}  Unsubscribe function
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

/**
 * Update the navbar to reflect the current auth state.
 * Called by main app.js whenever auth state changes.
 *
 * @param {Object|null} user
 */
export function updateAuthUI(user) {
  const loginBtn    = document.getElementById("loginBtn");
  const userMenu    = document.getElementById("userMenu");
  const userAvatar  = document.getElementById("userAvatar");
  const userName    = document.getElementById("userName");
  const adminBtn    = document.getElementById("adminBtn");

  if (!loginBtn || !userMenu) return;

  if (user) {
    // Hide sign-in button, show user menu
    loginBtn.classList.add("hidden");
    userMenu.classList.remove("hidden");

    if (userAvatar) userAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || "U");
    if (userName)   userName.textContent = user.displayName || user.email;

    // Show admin button only for the admin email
    if (adminBtn) {
      if (user.email === ADMIN_EMAIL) {
        adminBtn.classList.remove("hidden");
      } else {
        adminBtn.classList.add("hidden");
      }
    }
  } else {
    // Show sign-in button, hide user menu
    loginBtn.classList.remove("hidden");
    userMenu.classList.add("hidden");
    if (adminBtn) adminBtn.classList.add("hidden");
  }
}

// ── Toast notification utility ────────────────────────────────────────────────

/**
 * Show a brief toast notification.
 *
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const colors = {
    success: "bg-green-600",
    error:   "bg-red-600",
    info:    "bg-purple-600"
  };

  const toast = document.createElement("div");
  toast.className = `toast-item px-5 py-3 rounded-lg text-white text-sm font-medium shadow-lg
                     transform translate-x-full opacity-0 transition-all duration-300
                     ${colors[type] || colors.info}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove("translate-x-full", "opacity-0");
  });

  // Remove after 3.5 s
  setTimeout(() => {
    toast.classList.add("translate-x-full", "opacity-0");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3500);
}
