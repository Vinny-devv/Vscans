/**
 * pages.js
 * All page render functions for V Scans SPA.
 * Each function renders HTML into #app and attaches event listeners.
 */

import { currentUser, isAdmin, showToast } from "./auth.js";
import {
  getAllManga, getManga, getChapters, getChapter,
  addManga, updateManga, deleteManga,
  addChapter, deleteChapter,
  subscribeComments, postComment, deleteComment,
  getMangaByGenre, searchManga
} from "./db.js";
import { uploadManyToImgBB } from "./imgbb.js";
import { navigate } from "./router.js";

// ── Utility ───────────────────────────────────────────────────────────────────
const app = () => document.getElementById("app");

function setLoading(msg = "Loading…") {
  app().innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div class="spinner"></div>
      <p class="text-gray-400 text-sm">${msg}</p>
    </div>`;
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Known genres for the category page
export const ALL_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Isekai", "Manhwa", "Manhua", "Martial Arts",
  "Mystery", "Romance", "Sci-Fi", "Seinen", "Shonen",
  "Slice of Life", "Sports", "Supernatural", "Thriller", "Webtoon"
];

// ═══════════════════════════════════════════════════════════════════════════════
//  HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export async function renderHome() {
  setLoading("Fetching manga library…");

  try {
    const mangaList = await getAllManga();

    if (mangaList.length === 0) {
      app().innerHTML = `
        <div class="text-center py-24">
          <div class="text-6xl mb-4">📚</div>
          <h2 class="text-2xl font-bold text-gray-300 mb-2">No manga yet</h2>
          <p class="text-gray-500">The admin hasn't added any manga yet. Check back soon!</p>
        </div>`;
      return;
    }

    app().innerHTML = `
      <section class="page-section">
        <!-- Hero Banner -->
        <div class="hero-banner mb-12">
          <div class="hero-content">
            <div class="hero-badge">✨ New Updates</div>
            <h1 class="hero-title">Read the Best<br><span class="gradient-text">Manga & Manhwa</span></h1>
            <p class="hero-sub">Thousands of chapters, updated daily. Dive into your next obsession.</p>
          </div>
          <div class="hero-orbs">
            <div class="orb orb-1"></div>
            <div class="orb orb-2"></div>
            <div class="orb orb-3"></div>
          </div>
        </div>

        <!-- Latest Updates Grid -->
        <div class="section-header">
          <h2 class="section-title"><span class="accent-bar"></span>Latest Updates</h2>
          <a href="#/categories" class="view-all-btn">View All Genres →</a>
        </div>

        <div class="manga-grid" id="mangaGrid">
          ${mangaList.map(renderMangaCard).join("")}
        </div>
      </section>`;

    // Attach click handlers
    document.querySelectorAll(".manga-card").forEach((card) => {
      card.addEventListener("click", () => {
        navigate("/manga/" + card.dataset.id);
      });
    });

  } catch (err) {
    console.error("Home page error:", err);
    app().innerHTML = `<div class="error-state">⚠ Failed to load manga: ${err.message}</div>`;
  }
}

function renderMangaCard(manga) {
  const genres = (manga.genres || []).slice(0, 2).join(" · ");
  return `
    <div class="manga-card" data-id="${manga.id}">
      <div class="manga-card-inner">
        <div class="manga-cover-wrap">
          <img src="${manga.coverUrl || 'https://via.placeholder.com/300x420/1a1a2e/7c3aed?text=No+Cover'}"
               alt="${manga.title}"
               class="manga-cover"
               loading="lazy"
               onerror="this.src='https://via.placeholder.com/300x420/1a1a2e/7c3aed?text=No+Cover'">
          <div class="manga-overlay">
            <span class="read-btn">Read Now</span>
          </div>
        </div>
        <div class="manga-info">
          <h3 class="manga-title">${manga.title}</h3>
          ${genres ? `<p class="manga-genres">${genres}</p>` : ""}
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MANGA DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export async function renderMangaDetail({ id }) {
  setLoading("Loading manga details…");
  try {
    const [manga, chapters] = await Promise.all([
      getManga(id),
      getChapters(id)
    ]);

    if (!manga) {
      app().innerHTML = `<div class="error-state">Manga not found.</div>`;
      return;
    }

    app().innerHTML = `
      <section class="page-section detail-page">
        <button class="back-btn" id="backBtn">← Back</button>

        <div class="detail-hero">
          <div class="detail-cover-wrap">
            <img src="${manga.coverUrl || ''}" alt="${manga.title}" class="detail-cover"
                 onerror="this.src='https://via.placeholder.com/300x420/1a1a2e/7c3aed?text=No+Cover'">
            <div class="detail-cover-glow"></div>
          </div>
          <div class="detail-info">
            <h1 class="detail-title">${manga.title}</h1>
            <div class="detail-genres">
              ${(manga.genres || []).map((g) => `<span class="genre-tag">${g}</span>`).join("")}
            </div>
            <p class="detail-desc">${manga.description || "No description available."}</p>
            ${chapters.length > 0
              ? `<button class="cta-btn" id="readFirstBtn">Start Reading →</button>`
              : `<p class="text-gray-500 text-sm mt-4">No chapters available yet.</p>`}
          </div>
        </div>

        <!-- Admin controls -->
        ${isAdmin() ? `
          <div class="admin-controls" id="adminControls">
            <div class="admin-bar-title">⚙ Admin Controls</div>
            <div class="admin-bar-btns">
              <button class="adm-btn adm-edit" id="editMangaBtn">✏ Edit Manga</button>
              <button class="adm-btn adm-add-ch" id="addChapterBtn">+ Add Chapter</button>
              <button class="adm-btn adm-del" id="deleteMangaBtn">🗑 Delete Manga</button>
            </div>
          </div>` : ""}

        <!-- Chapter List -->
        <div class="chapter-section">
          <h2 class="section-title"><span class="accent-bar"></span>Chapters
            <span class="chapter-count">${chapters.length}</span>
          </h2>

          ${chapters.length === 0
            ? `<p class="text-gray-500 py-8 text-center">No chapters yet.</p>`
            : `<div class="chapter-list">
                ${chapters.map((ch) => renderChapterRow(manga.id, ch)).join("")}
              </div>`}
        </div>
      </section>

      <!-- Edit Manga Modal -->
      <div id="editMangaModal" class="modal hidden">
        <div class="modal-box">
          <h2 class="modal-title">Edit Manga</h2>
          <form id="editMangaForm" class="modal-form">
            <label class="form-label">Title</label>
            <input id="editTitle" class="form-input" value="${manga.title}" required>
            <label class="form-label">Cover Image URL</label>
            <input id="editCover" class="form-input" value="${manga.coverUrl || ''}" placeholder="https://…">
            <label class="form-label">Genres (comma-separated)</label>
            <input id="editGenres" class="form-input" value="${(manga.genres || []).join(', ')}">
            <label class="form-label">Description</label>
            <textarea id="editDesc" class="form-textarea" rows="4">${manga.description || ''}</textarea>
            <div class="modal-actions">
              <button type="button" class="modal-cancel" id="cancelEditManga">Cancel</button>
              <button type="submit" class="modal-save">Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Chapter Modal -->
      <div id="addChapterModal" class="modal hidden">
        <div class="modal-box">
          <h2 class="modal-title">Add New Chapter</h2>
          <form id="addChapterForm" class="modal-form">
            <label class="form-label">Chapter Number</label>
            <input id="chapterNum" class="form-input" type="number" min="0" step="0.1" placeholder="e.g. 1 or 12.5" required>
            <label class="form-label">Chapter Title (optional)</label>
            <input id="chapterTitle" class="form-input" placeholder="e.g. The Beginning">
            <label class="form-label">Chapter Images</label>
            <div class="file-drop-zone" id="fileDropZone">
              <span class="file-drop-icon">🖼</span>
              <span class="file-drop-text">Click or drag & drop images here</span>
              <input type="file" id="chapterImages" multiple accept="image/*" class="file-input-hidden">
            </div>
            <div id="imagePreviewGrid" class="image-preview-grid hidden"></div>
            <div id="uploadProgress" class="upload-progress hidden"></div>
            <div class="modal-actions">
              <button type="button" class="modal-cancel" id="cancelAddChapter">Cancel</button>
              <button type="submit" class="modal-save" id="submitChapter">Upload & Save</button>
            </div>
          </form>
        </div>
      </div>
      <!-- Modal Backdrop -->
      <div id="modalBackdrop" class="modal-backdrop hidden"></div>
    `;

    // ── Event listeners ────────────────────────────────────────────────
    document.getElementById("backBtn").addEventListener("click", () => navigate("/"));

    if (chapters.length > 0) {
      document.getElementById("readFirstBtn")?.addEventListener("click", () => {
        const last = chapters[chapters.length - 1];
        navigate(`/read/${manga.id}/${last.id}`);
      });
    }

    // Chapter row clicks
    document.querySelectorAll(".chapter-row").forEach((row) => {
      row.addEventListener("click", () => {
        navigate(`/read/${manga.id}/${row.dataset.chapterId}`);
      });
    });

    // Admin: chapter delete buttons
    document.querySelectorAll(".delete-ch-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Delete this chapter? This cannot be undone.")) return;
        try {
          await deleteChapter(manga.id, btn.dataset.chapterId);
          showToast("Chapter deleted.", "success");
          renderMangaDetail({ id });
        } catch (err) {
          showToast("Error deleting chapter: " + err.message, "error");
        }
      });
    });

    if (isAdmin()) {
      setupDetailAdminListeners(manga, id);
    }

  } catch (err) {
    console.error("Manga detail error:", err);
    app().innerHTML = `<div class="error-state">⚠ Failed to load manga: ${err.message}</div>`;
  }
}

function renderChapterRow(mangaId, ch) {
  return `
    <div class="chapter-row" data-chapter-id="${ch.id}">
      <span class="ch-num">Ch. ${ch.chapterNumber}</span>
      <span class="ch-title">${ch.title || ""}</span>
      <span class="ch-date">${formatDate(ch.createdAt)}</span>
      ${isAdmin() ? `
        <button class="delete-ch-btn icon-btn" data-chapter-id="${ch.id}" title="Delete Chapter">🗑</button>` : ""}
    </div>`;
}

function setupDetailAdminListeners(manga, mangaId) {
  const editBtn      = document.getElementById("editMangaBtn");
  const addChBtn     = document.getElementById("addChapterBtn");
  const deleteBtn    = document.getElementById("deleteMangaBtn");
  const editModal    = document.getElementById("editMangaModal");
  const addChModal   = document.getElementById("addChapterModal");
  const backdrop     = document.getElementById("modalBackdrop");

  const openModal  = (el) => { el.classList.remove("hidden"); backdrop.classList.remove("hidden"); };
  const closeModals = () => {
    editModal.classList.add("hidden");
    addChModal.classList.add("hidden");
    backdrop.classList.add("hidden");
  };

  backdrop.addEventListener("click", closeModals);
  document.getElementById("cancelEditManga").addEventListener("click", closeModals);
  document.getElementById("cancelAddChapter").addEventListener("click", closeModals);

  editBtn.addEventListener("click", () => openModal(editModal));
  addChBtn.addEventListener("click", () => openModal(addChModal));

  // ── Edit Manga Form ────────────────────────────────────────────────
  document.getElementById("editMangaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title  = document.getElementById("editTitle").value.trim();
    const cover  = document.getElementById("editCover").value.trim();
    const genres = document.getElementById("editGenres").value.split(",").map((g) => g.trim()).filter(Boolean);
    const desc   = document.getElementById("editDesc").value.trim();

    if (!title) return showToast("Title is required.", "error");
    try {
      await updateManga(mangaId, { title, coverUrl: cover, genres, description: desc });
      showToast("Manga updated!", "success");
      closeModals();
      renderMangaDetail({ id: mangaId });
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  });

  // ── Delete Manga ──────────────────────────────────────────────────
  deleteBtn.addEventListener("click", async () => {
    if (!confirm(`Delete "${manga.title}"? This will also delete all chapters. This cannot be undone.`)) return;
    try {
      await deleteManga(mangaId);
      showToast("Manga deleted.", "success");
      navigate("/");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  });

  // ── Add Chapter – File Drop Zone ──────────────────────────────────
  const dropZone    = document.getElementById("fileDropZone");
  const fileInput   = document.getElementById("chapterImages");
  const previewGrid = document.getElementById("imagePreviewGrid");

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    fileInput.files = e.dataTransfer.files;
    showFilePreviews(fileInput.files);
  });
  fileInput.addEventListener("change", () => showFilePreviews(fileInput.files));

  function showFilePreviews(files) {
    if (!files.length) return;
    previewGrid.classList.remove("hidden");
    previewGrid.innerHTML = Array.from(files).map((f) => {
      const url = URL.createObjectURL(f);
      return `<img src="${url}" class="preview-thumb" alt="${f.name}">`;
    }).join("");
  }

  // ── Add Chapter Form Submit ───────────────────────────────────────
  document.getElementById("addChapterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const numVal  = parseFloat(document.getElementById("chapterNum").value);
    const title   = document.getElementById("chapterTitle").value.trim();
    const files   = fileInput.files;
    const progEl  = document.getElementById("uploadProgress");
    const submitBtn = document.getElementById("submitChapter");

    if (isNaN(numVal)) return showToast("Please enter a valid chapter number.", "error");
    if (!files.length) return showToast("Please select at least one image.", "error");

    progEl.classList.remove("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading…";

    try {
      const imageUrls = await uploadManyToImgBB(Array.from(files), progEl);
      await addChapter(mangaId, {
        chapterNumber: numVal,
        title,
        imageUrls
      });
      showToast(`Chapter ${numVal} added!`, "success");
      closeModals();
      renderMangaDetail({ id: mangaId });
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Upload & Save";
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  READER PAGE
// ═══════════════════════════════════════════════════════════════════════════════

let _commentUnsub = null;

export async function renderReader({ mangaId, chapterId }) {
  // Clean up previous comment listener
  if (_commentUnsub) { _commentUnsub(); _commentUnsub = null; }

  setLoading("Loading chapter…");
  try {
    const [manga, chapter, chapters] = await Promise.all([
      getManga(mangaId),
      getChapter(mangaId, chapterId),
      getChapters(mangaId)
    ]);

    if (!chapter) {
      app().innerHTML = `<div class="error-state">Chapter not found.</div>`;
      return;
    }

    // Figure out prev/next chapters
    const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    const idx  = sortedChapters.findIndex((c) => c.id === chapterId);
    const prev = sortedChapters[idx - 1] || null;
    const next = sortedChapters[idx + 1] || null;

    app().innerHTML = `
      <div class="reader-page">
        <!-- Reader Navbar -->
        <div class="reader-topbar">
          <button class="reader-back" id="readerBackBtn">← ${manga?.title || "Back"}</button>
          <span class="reader-chapter-label">Ch. ${chapter.chapterNumber}${chapter.title ? " – " + chapter.title : ""}</span>
          <div class="reader-nav-btns">
            ${prev ? `<button class="reader-nav-btn" id="prevChBtn">‹ Prev</button>` : ""}
            ${next ? `<button class="reader-nav-btn" id="nextChBtn">Next ›</button>` : ""}
          </div>
        </div>

        <!-- Image Gallery -->
        <div class="reader-gallery" id="readerGallery">
          ${(chapter.imageUrls || []).length === 0
            ? `<p class="text-center text-gray-500 py-20">No images in this chapter.</p>`
            : (chapter.imageUrls || []).map((url, i) => `
                <div class="reader-img-wrap">
                  <img src="${url}"
                       alt="Page ${i + 1}"
                       class="reader-img"
                       loading="lazy"
                       onerror="this.style.opacity='0.3'; this.nextElementSibling.style.display='flex'">
                  <div class="img-error-msg" style="display:none">⚠ Image failed to load</div>
                </div>`).join("")}
        </div>

        <!-- Chapter Navigation (bottom) -->
        <div class="reader-bottom-nav">
          ${prev ? `<button class="reader-nav-btn-lg" id="prevChBtnBot">‹ Chapter ${prev.chapterNumber}</button>` : "<span></span>"}
          <button class="reader-nav-btn-lg secondary" id="backToMangaBot">Back to Manga</button>
          ${next ? `<button class="reader-nav-btn-lg" id="nextChBtnBot">Chapter ${next.chapterNumber} ›</button>` : "<span></span>"}
        </div>

        <!-- Comments Section -->
        <div class="comments-section">
          <h2 class="section-title"><span class="accent-bar"></span>Comments</h2>

          <!-- Post Comment -->
          ${currentUser
            ? `<div class="comment-form-wrap">
                <img src="${currentUser.photoURL || ''}" class="comment-avatar" alt="You"
                     onerror="this.src='https://ui-avatars.com/api/?name=U'">
                <div class="comment-input-area">
                  <textarea id="commentInput" class="comment-textarea" rows="2"
                            placeholder="Write a comment…" maxlength="1000"></textarea>
                  <button id="postCommentBtn" class="post-comment-btn">Post Comment</button>
                </div>
              </div>`
            : `<p class="login-to-comment">
                <span>🔐</span> Please <button class="inline-link" id="signInToCommentBtn">sign in</button> to leave a comment.
               </p>`}

          <!-- Comment List -->
          <div id="commentList" class="comment-list">
            <div class="flex items-center gap-2 text-gray-500 text-sm py-4">
              <div class="spinner-sm"></div> Loading comments…
            </div>
          </div>
        </div>
      </div>`;

    // ── Navigation listeners ────────────────────────────────────────
    document.getElementById("readerBackBtn").addEventListener("click", () => navigate("/manga/" + mangaId));
    document.getElementById("backToMangaBot")?.addEventListener("click", () => navigate("/manga/" + mangaId));

    const goNext = () => { if (next) navigate(`/read/${mangaId}/${next.id}`); };
    const goPrev = () => { if (prev) navigate(`/read/${mangaId}/${prev.id}`); };

    document.getElementById("nextChBtn")?.addEventListener("click", goNext);
    document.getElementById("prevChBtn")?.addEventListener("click", goPrev);
    document.getElementById("nextChBtnBot")?.addEventListener("click", goNext);
    document.getElementById("prevChBtnBot")?.addEventListener("click", goPrev);

    document.getElementById("signInToCommentBtn")?.addEventListener("click", () => {
      document.getElementById("loginBtn")?.click();
    });

    // ── Comments ──────────────────────────────────────────────────
    if (currentUser) {
      document.getElementById("postCommentBtn").addEventListener("click", async () => {
        const input = document.getElementById("commentInput");
        const text  = input.value.trim();
        if (!text) return showToast("Comment cannot be empty.", "error");

        try {
          await postComment(mangaId, chapterId, {
            text,
            authorName:  currentUser.displayName || "Anonymous",
            authorPhoto: currentUser.photoURL || "",
            authorUid:   currentUser.uid
          });
          input.value = "";
        } catch (err) {
          showToast("Failed to post: " + err.message, "error");
        }
      });
    }

    // Real-time comment subscription
    _commentUnsub = subscribeComments(mangaId, chapterId, (comments) => {
      const list = document.getElementById("commentList");
      if (!list) return;

      if (comments.length === 0) {
        list.innerHTML = `<p class="text-gray-500 text-sm py-4 text-center">No comments yet. Be the first!</p>`;
        return;
      }

      list.innerHTML = comments.map((c) => `
        <div class="comment-item">
          <img src="${c.authorPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.authorName || 'U')}"
               class="comment-avatar"
               alt="${c.authorName}"
               onerror="this.src='https://ui-avatars.com/api/?name=U'">
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-author">${c.authorName || "Anonymous"}</span>
              <span class="comment-time">${formatDate(c.createdAt)}</span>
              ${isAdmin() ? `<button class="delete-comment-btn" data-comment-id="${c.id}">🗑</button>` : ""}
            </div>
            <p class="comment-text">${escapeHtml(c.text)}</p>
          </div>
        </div>`).join("");

      // Admin delete comment handlers
      document.querySelectorAll(".delete-comment-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this comment?")) return;
          try {
            await deleteComment(mangaId, chapterId, btn.dataset.commentId);
            showToast("Comment deleted.", "success");
          } catch (err) {
            showToast("Error: " + err.message, "error");
          }
        });
      });
    });

    // Scroll to top when page loads
    window.scrollTo({ top: 0, behavior: "instant" });

  } catch (err) {
    console.error("Reader error:", err);
    app().innerHTML = `<div class="error-state">⚠ Failed to load chapter: ${err.message}</div>`;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CATEGORIES PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export async function renderCategories(params, query) {
  const selectedGenre = query?.genre || null;

  if (selectedGenre) {
    setLoading(`Loading ${selectedGenre} manga…`);
    try {
      const mangaList = await getMangaByGenre(selectedGenre);
      app().innerHTML = `
        <section class="page-section">
          <button class="back-btn" id="backBtn">← All Genres</button>
          <div class="section-header">
            <h2 class="section-title"><span class="accent-bar"></span>${selectedGenre}</h2>
            <span class="text-gray-400 text-sm">${mangaList.length} titles</span>
          </div>
          ${mangaList.length === 0
            ? `<p class="text-center text-gray-500 py-16">No manga in this genre yet.</p>`
            : `<div class="manga-grid">${mangaList.map(renderMangaCard).join("")}</div>`}
        </section>`;

      document.getElementById("backBtn").addEventListener("click", () => navigate("/categories"));
      document.querySelectorAll(".manga-card").forEach((card) => {
        card.addEventListener("click", () => navigate("/manga/" + card.dataset.id));
      });
    } catch (err) {
      app().innerHTML = `<div class="error-state">⚠ ${err.message}</div>`;
    }
    return;
  }

  // ── Genre grid view ───────────────────────────────────────────────
  app().innerHTML = `
    <section class="page-section">
      <h2 class="section-title"><span class="accent-bar"></span>Browse by Genre</h2>
      <div class="genre-grid">
        ${ALL_GENRES.map((g) => `
          <button class="genre-card" data-genre="${g}">
            <span class="genre-icon">${genreIcon(g)}</span>
            <span class="genre-name">${g}</span>
          </button>`).join("")}
      </div>
    </section>`;

  document.querySelectorAll(".genre-card").forEach((btn) => {
    btn.addEventListener("click", () => navigate("/categories?genre=" + encodeURIComponent(btn.dataset.genre)));
  });
}

function genreIcon(genre) {
  const icons = {
    Action: "⚔", Adventure: "🗺", Comedy: "😄", Drama: "🎭",
    Fantasy: "🧙", Horror: "👻", Isekai: "🌀", Manhwa: "🇰🇷",
    Manhua: "🇨🇳", "Martial Arts": "🥋", Mystery: "🔍", Romance: "💕",
    "Sci-Fi": "🚀", Seinen: "🎯", Shonen: "⚡", "Slice of Life": "🌸",
    Sports: "⚽", Supernatural: "✨", Thriller: "🔪", Webtoon: "📱"
  };
  return icons[genre] || "📖";
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH RESULTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export async function renderSearch(params, query) {
  const q = query?.q || "";
  if (!q) { navigate("/"); return; }

  setLoading(`Searching for "${q}"…`);
  try {
    const results = await searchManga(q);
    app().innerHTML = `
      <section class="page-section">
        <h2 class="section-title"><span class="accent-bar"></span>Search: "${q}"
          <span class="chapter-count">${results.length} result${results.length !== 1 ? "s" : ""}</span>
        </h2>
        ${results.length === 0
          ? `<div class="text-center py-20">
               <div class="text-5xl mb-4">🔍</div>
               <p class="text-gray-400">No results found for "${q}"</p>
             </div>`
          : `<div class="manga-grid">${results.map(renderMangaCard).join("")}</div>`}
      </section>`;

    document.querySelectorAll(".manga-card").forEach((card) => {
      card.addEventListener("click", () => navigate("/manga/" + card.dataset.id));
    });
  } catch (err) {
    app().innerHTML = `<div class="error-state">⚠ Search failed: ${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export async function renderAdmin() {
  if (!isAdmin()) {
    navigate("/");
    showToast("Access denied.", "error");
    return;
  }

  setLoading("Loading admin panel…");
  try {
    const mangaList = await getAllManga();

    app().innerHTML = `
      <section class="page-section">
        <div class="admin-header">
          <h1 class="section-title"><span class="accent-bar"></span>Admin Dashboard</h1>
          <button class="cta-btn" id="openAddMangaBtn">+ Add New Manga</button>
        </div>

        <div class="stats-row">
          <div class="stat-card"><span class="stat-num">${mangaList.length}</span><span class="stat-label">Total Manga</span></div>
          <div class="stat-card"><span class="stat-num">∞</span><span class="stat-label">Chapters</span></div>
          <div class="stat-card"><span class="stat-num">🔒</span><span class="stat-label">Admin Only</span></div>
        </div>

        <h2 class="section-title mt-8"><span class="accent-bar"></span>Manage Manga</h2>

        <div class="admin-manga-list">
          ${mangaList.length === 0
            ? `<p class="text-gray-500 py-8 text-center">No manga yet. Click "+ Add New Manga" to get started.</p>`
            : mangaList.map((m) => `
              <div class="admin-manga-row" data-id="${m.id}">
                <img src="${m.coverUrl || ''}" class="admin-cover-thumb"
                     onerror="this.src='https://via.placeholder.com/60x80/1a1a2e/7c3aed?text=?'">
                <div class="admin-row-info">
                  <span class="admin-row-title">${m.title}</span>
                  <span class="admin-row-genres">${(m.genres || []).join(", ") || "No genres"}</span>
                </div>
                <div class="admin-row-btns">
                  <button class="adm-btn adm-view" data-id="${m.id}">View</button>
                  <button class="adm-btn adm-del admin-del-manga" data-id="${m.id}">Delete</button>
                </div>
              </div>`).join("")}
        </div>
      </section>

      <!-- Add Manga Modal -->
      <div id="addMangaModal" class="modal hidden">
        <div class="modal-box">
          <h2 class="modal-title">Add New Manga</h2>
          <form id="addMangaForm" class="modal-form">
            <label class="form-label">Title *</label>
            <input id="addMangaTitle" class="form-input" placeholder="Manga title" required>
            <label class="form-label">Cover Image URL *</label>
            <input id="addMangaCover" class="form-input" placeholder="https://…" required>
            <label class="form-label">Genres (comma-separated)</label>
            <input id="addMangaGenres" class="form-input" placeholder="Action, Fantasy, Shonen">
            <label class="form-label">Description / Synopsis</label>
            <textarea id="addMangaDesc" class="form-textarea" rows="4" placeholder="Write a short synopsis…"></textarea>
            <div class="modal-actions">
              <button type="button" class="modal-cancel" id="cancelAddManga">Cancel</button>
              <button type="submit" class="modal-save">Add Manga</button>
            </div>
          </form>
        </div>
      </div>
      <div id="adminModalBackdrop" class="modal-backdrop hidden"></div>
    `;

    const addMangaModal = document.getElementById("addMangaModal");
    const adminBackdrop = document.getElementById("adminModalBackdrop");
    const closeAdmin    = () => { addMangaModal.classList.add("hidden"); adminBackdrop.classList.add("hidden"); };

    document.getElementById("openAddMangaBtn").addEventListener("click", () => {
      addMangaModal.classList.remove("hidden");
      adminBackdrop.classList.remove("hidden");
    });
    document.getElementById("cancelAddManga").addEventListener("click", closeAdmin);
    adminBackdrop.addEventListener("click", closeAdmin);

    // Add manga form
    document.getElementById("addMangaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title  = document.getElementById("addMangaTitle").value.trim();
      const cover  = document.getElementById("addMangaCover").value.trim();
      const genres = document.getElementById("addMangaGenres").value.split(",").map((g) => g.trim()).filter(Boolean);
      const desc   = document.getElementById("addMangaDesc").value.trim();

      if (!title) return showToast("Title is required.", "error");
      if (!cover) return showToast("Cover URL is required.", "error");

      try {
        const ref = await addManga({ title, coverUrl: cover, genres, description: desc });
        showToast("Manga added!", "success");
        closeAdmin();
        navigate("/manga/" + ref.id);
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    });

    // View manga buttons
    document.querySelectorAll(".adm-btn.adm-view").forEach((btn) => {
      btn.addEventListener("click", () => navigate("/manga/" + btn.dataset.id));
    });

    // Delete manga buttons
    document.querySelectorAll(".admin-del-manga").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this manga? All chapters will also be removed.")) return;
        try {
          await deleteManga(btn.dataset.id);
          showToast("Manga deleted.", "success");
          renderAdmin();
        } catch (err) {
          showToast("Error: " + err.message, "error");
        }
      });
    });

  } catch (err) {
    app().innerHTML = `<div class="error-state">⚠ Failed to load admin panel: ${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  404 PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function renderNotFound() {
  app().innerHTML = `
    <div class="text-center py-24">
      <div class="text-8xl mb-6">404</div>
      <h2 class="text-2xl font-bold text-gray-300 mb-2">Page Not Found</h2>
      <p class="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <button class="cta-btn" onclick="window.location.hash='#/'">Go Home</button>
    </div>`;
}
