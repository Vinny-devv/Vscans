/**
 * db.js
 * All Firestore CRUD operations for:
 *  - Manga collection
 *  - Chapters sub-collection
 *  - Comments sub-collection
 */

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Collection references ─────────────────────────────────────────────────────
const mangaCol = () => collection(db, "manga");
const chaptersCol = (mangaId) => collection(db, "manga", mangaId, "chapters");
const commentsCol = (mangaId, chapterId) =>
  collection(db, "manga", mangaId, "chapters", chapterId, "comments");

// ═══════════════════════════════════════════════════════════════════════════════
//  MANGA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all manga, ordered by creation date descending.
 * @returns {Promise<Array>}
 */
export async function getAllManga() {
  const q = query(mangaCol(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch manga filtered by genre.
 * @param {string} genre
 * @returns {Promise<Array>}
 */
export async function getMangaByGenre(genre) {
  const q = query(
    mangaCol(),
    where("genres", "array-contains", genre),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single manga document.
 * @param {string} mangaId
 * @returns {Promise<Object|null>}
 */
export async function getManga(mangaId) {
  const snap = await getDoc(doc(db, "manga", mangaId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Add a new manga document.
 * @param {Object} data - { title, coverUrl, genres[], description }
 * @returns {Promise<DocumentReference>}
 */
export async function addManga(data) {
  return addDoc(mangaCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Update an existing manga document.
 * @param {string} mangaId
 * @param {Object} data
 */
export async function updateManga(mangaId, data) {
  return updateDoc(doc(db, "manga", mangaId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a manga and all its sub-collections would need Cloud Functions
 * for a full cascade; here we delete the manga doc itself.
 * @param {string} mangaId
 */
export async function deleteManga(mangaId) {
  // Delete all chapters first
  const chaps = await getDocs(chaptersCol(mangaId));
  const deletePromises = chaps.docs.map((c) => deleteDoc(c.ref));
  await Promise.all(deletePromises);
  return deleteDoc(doc(db, "manga", mangaId));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHAPTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all chapters for a given manga, ordered by chapter number.
 * @param {string} mangaId
 * @returns {Promise<Array>}
 */
export async function getChapters(mangaId) {
  const q = query(chaptersCol(mangaId), orderBy("chapterNumber", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single chapter.
 * @param {string} mangaId
 * @param {string} chapterId
 * @returns {Promise<Object|null>}
 */
export async function getChapter(mangaId, chapterId) {
  const snap = await getDoc(doc(db, "manga", mangaId, "chapters", chapterId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Add a new chapter to a manga.
 * @param {string} mangaId
 * @param {Object} data - { chapterNumber, title, imageUrls[] }
 * @returns {Promise<DocumentReference>}
 */
export async function addChapter(mangaId, data) {
  // Also update the parent manga's updatedAt
  await updateDoc(doc(db, "manga", mangaId), { updatedAt: serverTimestamp() });
  return addDoc(chaptersCol(mangaId), {
    ...data,
    createdAt: serverTimestamp()
  });
}

/**
 * Delete a chapter document.
 * @param {string} mangaId
 * @param {string} chapterId
 */
export async function deleteChapter(mangaId, chapterId) {
  return deleteDoc(doc(db, "manga", mangaId, "chapters", chapterId));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to real-time comments for a chapter (newest last).
 * @param {string} mangaId
 * @param {string} chapterId
 * @param {Function} callback - (comments[]) => void
 * @returns {Function} Unsubscribe
 */
export function subscribeComments(mangaId, chapterId, callback) {
  const q = query(commentsCol(mangaId, chapterId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(comments);
  });
}

/**
 * Post a comment.
 * @param {string} mangaId
 * @param {string} chapterId
 * @param {Object} data - { text, authorName, authorPhoto, authorUid }
 */
export async function postComment(mangaId, chapterId, data) {
  if (!data.text || !data.text.trim()) throw new Error("Comment cannot be empty.");
  return addDoc(commentsCol(mangaId, chapterId), {
    ...data,
    text: data.text.trim(),
    createdAt: serverTimestamp()
  });
}

/**
 * Delete a comment (admin only enforced server-side via security rules).
 * @param {string} mangaId
 * @param {string} chapterId
 * @param {string} commentId
 */
export async function deleteComment(mangaId, chapterId, commentId) {
  return deleteDoc(
    doc(db, "manga", mangaId, "chapters", chapterId, "comments", commentId)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple client-side search by title prefix (Firestore lacks full-text search).
 * Fetches all manga and filters locally.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchManga(searchQuery) {
  const all = await getAllManga();
  const q = searchQuery.toLowerCase().trim();
  return all.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.genres && m.genres.some((g) => g.toLowerCase().includes(q)))
  );
}
