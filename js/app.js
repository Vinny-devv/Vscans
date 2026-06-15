// app.js — العقل المدبر ومحرك الموقع الاحترافي لقراءة المانجا والمانهوا
import {
  auth, db, provider,
  signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, where
} from './firebase.js';

import { signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── الإعدادات الرئيسية ──
const ADMIN_EMAIL = 'anwarbah96@gmail.com'; // ضع إيميل الجيميل الخاص بك هنا
const IMGBB_KEY = 'bf32151ce65f47f2707753b98cfa9b67'; // ضع مفتاح رفع الصور ImgBB هنا

const CATEGORIES = [
  { label: 'أكشن', icon: 'fas fa-fist-raised' },
  { label: 'رومانسي', icon: 'fas fa-heart' },
  { label: 'إثارة', icon: 'fas fa-bolt' },
  { label: 'رعب', icon: 'fas fa-skull' },
  { label: 'كوميدي', icon: 'fas fa-laugh' },
  { label: 'مغامرات', icon: 'fas fa-map-marked-alt' },
  { label: 'دراما', icon: 'fas fa-theater-masks' },
  { label: 'خيال علمي', icon: 'fas fa-rocket' }
];

let currentUser = null;
let isAdmin = false;
let allMangas = [];
let currentMangaId = null;
let selectedCategories = [];
let editSelectedCategories = [];

const $ = id => document.getElementById(id);
const show = el => { if(el) el.style.display = ''; };
const hide = el => { if(el) el.style.display = 'none'; };

function openModal(id) { if($(id)) $(id).classList.add('open'); }
function closeModal(id) { if($(id)) $(id).classList.remove('open'); }

function showToast(msg, type = '') {
  const t = $('toast'); if(!t) return;
  t.textContent = msg; t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ar-SA');
}

// ── نظام التبويبات والملاحة السلسة ──
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      if($(target)) $(target).classList.add('active');
      if(target === 'categories-section') renderCategories();
    });
  });
}

// ── المصادقة الفائقة للآيفون والويب ──
async function initAuth() {
  const loginBtn = $('loginBtn');
  const logoutBtn = $('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      try {
        await signInWithRedirect(auth, provider);
      } catch (e) {
        showToast('خطأ بالاتصال: ' + e.message, 'error');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      showToast('تم تسجيل الخروج بنجاح');
    });
  }

  try {
    const result = await getRedirectResult(auth);
    if (result?.user) showToast('مرحباً بك مجدداً! ✓', 'success');
  } catch (error) {
    console.error(error);
  }

  onAuthStateChanged(auth, user => {
    currentUser = user;
    isAdmin = user && user.email === ADMIN_EMAIL;

    if (user) {
      hide($('auth-section')); show($('user-section'));
      if($('user-avatar')) $('user-avatar').src = user.photoURL || '';
      if($('user-name')) $('user-name').textContent = user.displayName || user.email;
    } else {
      show($('auth-section')); hide($('user-section'));
    }

    if (isAdmin) show($('admin-controls')); else hide($('admin-controls'));
    renderMangaGrid(allMangas);
  });
}

// ── رفع الصور إلى الـ Cloud (ImgBB) ──
async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('رفع الفشل');
}

async function uploadMultipleToImgBB(files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadToImgBB(files[i]);
    urls.push(url);
    if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 100));
  }
  return urls;
}

// ── جلب المانجا وعرض الكروت ──
async function fetchMangas() {
  try {
    const q = query(collection(db, 'mangas'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allMangas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMangaGrid(allMangas);
  } catch(e) {
    console.error(e);
    if($('manga-grid')) $('manga-grid').innerHTML = '<div style="padding:20px; text-align:center; color:var(--accent);">يرجى التأكد من ربط الفايربيز وضبط قواعد Firestore قواعد Rules ⚠️</div>';
  }
}

function renderMangaGrid(mangas, targetId = 'manga-grid') {
  const grid = $(targetId); if (!grid) return;
  if (mangas.length === 0) { grid.innerHTML = '<div class="loading-spinner">لا توجد أعمال فنية منشورة حالياً 📚</div>'; return; }

  grid.innerHTML = mangas.map(m => {
    const badgeClass = m.status === 'مكتملة' ? 'badge-completed' : m.status === 'متوقفة' ? 'badge-paused' : 'badge-ongoing';
    const tags = (m.categories || []).slice(0, 2).map(c => `<span class="tag">${c}</span>`).join('');
    const adminBtns = isAdmin ? `
      <div class="admin-card-btns">
        <button class="btn-add-chapter" data-id="${m.id}"><i class="fas fa-plus"></i></button>
        <button class="btn-edit-card" data-id="${m.id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete-card" data-id="${m.id}"><i class="fas fa-trash"></i></button>
      </div>
    ` : '';
    return `
      <div class="manga-card" data-id="${m.id}">
        <img class="manga-cover" src="${m.cover || ''}" alt="${m.title}" loading="lazy"/>
        <span class="manga-card-badge ${badgeClass}">${m.status || 'مستمرة'}</span>
        <div class="manga-card-overlay">
          <div class="manga-card-title">${m.title}</div>
          <div class="manga-card-tags">${tags}</div>
        </div>
        ${adminBtns}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.manga-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.admin-card-btns')) return;
      openMangaDetail(card.dataset.id);
    });
  });

  if (isAdmin) {
    grid.querySelectorAll('.btn-add-chapter').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openAddChapterModal(b.dataset.id); }));
    grid.querySelectorAll('.btn-edit-card').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openEditModal(b.dataset.id); }));
    grid.querySelectorAll('.btn-delete-card').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); deleteManga(b.dataset.id); }));
  }
}

// ── فتح نافذة التفاصيل وعرض الفصول ──
async function openMangaDetail(mangaId) {
  currentMangaId = mangaId;
  const manga = allMangas.find(m => m.id === mangaId); if (!manga) return;

  const chapSnap = await getDocs(query(collection(db, 'mangas', mangaId, 'chapters'), orderBy('number', 'desc')));
  const chapters = chapSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const tags = (manga.categories || []).map(c => `<span class="tag">${c}</span>`).join('');
  const chaptersHTML = chapters.length === 0 ? '<p>لا توجد فصول متوفرة لهذا العمل بعد.</p>' :
    chapters.map(ch => `
      <div class="chapter-item" data-id="${ch.id}">
        <span>الفصل ${ch.number} ${ch.title ? ' - ' + ch.title : ''}</span>
        <div style="display:flex; gap:10px; align-items:center;">
          <span style="font-size:0.8rem; color:var(--text-secondary);">${formatDate(ch.createdAt)}</span>
          ${isAdmin ? `<button class="btn-del-ch" data-ch="${ch.id}"><i class="fas fa-trash" style="color:var(--accent);"></i></button>` : ''}
        </div>
      </div>
    `).join('');

  $('manga-detail-content').innerHTML = `
    <div class="manga-detail-header">
      <div class="manga-detail-cover"><img src="${manga.cover || ''}"></div>
      <div class="manga-detail-info">
        <h2>${manga.title}</h2>
        <div class="manga-detail-meta">${tags}<span class="tag" style="background:rgba(0,180,216,0.2); color:#00b4d8;">${manga.status}</span></div>
        <p>${manga.description || 'لا يوجد وصف للقصة بعد.'}</p>
      </div>
    </div>
    <div class="chapters-section">
      <h3>الفصول المتوفرة (${chapters.length})</h3>
      <div class="chapters-list">${chaptersHTML}</div>
    </div>
    <div class="comments-section">
      <h3>قسم النقاش والتعليقات</h3>
      ${currentUser ? `
        <div class="comment-input-area">
          <input type="text" id="comment-input" placeholder="اكتب تعليقك هنا بكل احترام..."/>
          <button class="btn-comment" id="send-comment">نشر</button>
        </div>` : '<p style="color:var(--text-secondary);">سجل دخولك عبر جوجل للمشاركة في النقاش والتعليقات.</p>'}
      <div id="comments-list"></div>
    </div>
  `;

  openModal('mangaDetailModal');
  loadComments(mangaId);

  $('manga-detail-content').querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.btn-del-ch')) return;
      const chapter = chapters.find(c => c.id === item.dataset.id);
      if(chapter) openChapterReader(manga.title, chapter);
    });
  });

  if(isAdmin) {
    $('manga-detail-content').querySelectorAll('.btn-del-ch').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deleteChapter(mangaId, btn.dataset.ch); });
    });
  }

  const sendBtn = $('send-comment');
  if(sendBtn) {
    sendBtn.addEventListener('click', () => {
      const inp = $('comment-input'); if(!inp || !inp.value.trim()) return;
      submitComment(mangaId, inp.value.trim()); inp.value = '';
    });
  }
}

// ── القارئ المنهواوي المسترسل ──
function openChapterReader(mangaTitle, chapter) {
  if($('reader-title')) $('reader-title').textContent = `${mangaTitle} — الفصل ${chapter.number}`;
  const imagesHTML = (chapter.images || []).map(url => `<img src="${url}" loading="lazy" alt="صفحة">`).join('');
  $('chapter-reader-content').innerHTML = imagesHTML || '<p style="padding:40px; text-align:center;">جاري مراجعة صفحات الفصل.</p>';
  openModal('chapterReaderModal');
}

// ── التعليقات ──
async function loadComments(mangaId) {
  const list = $('comments-list'); if(!list) return;
  const snap = await getDocs(query(collection(db, 'mangas', mangaId, 'comments'), orderBy('createdAt', 'desc')));
  const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (comments.length === 0) { list.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">لا توجد تعليقات هنا بعد. كن أول المعلقين!</p>'; return; }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <img class="comment-avatar" src="${c.photoURL || ''}">
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between;">
          <strong style="font-size:0.9rem; color:var(--accent);">${c.userName}</strong>
          <span style="font-size:0.75rem; color:var(--text-secondary);">${formatDate(c.createdAt)}</span>
        </div>
        <p style="font-size:0.9rem; margin-top:4px;">${c.text}</p>
      </div>
    </div>
  `).join('');
}

async function submitComment(mangaId, text) {
  await addDoc(collection(db, 'mangas', mangaId, 'comments'), {
    text, userName: currentUser.displayName || currentUser.email,
    photoURL: currentUser.photoURL || '', uid: currentUser.uid, createdAt: serverTimestamp()
  });
  loadComments(mangaId);
}

// ── إضافة وتحديث البيانات (الآدمن) ──
function initPublishModal() {
  if($('openPublishModal')) {
    $('openPublishModal').addEventListener('click', () => {
      selectedCategories = []; renderCategoriesSelector('categories-selector', selectedCategories);
      openModal('publishModal');
    });
  }
  if($('closePublishModal')) $('closePublishModal').addEventListener('click', () => closeModal('publishModal'));

  const coverFile = $('manga-cover-file');
  if(coverFile) {
    coverFile.addEventListener('change', e => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if($('cover-preview')) $('cover-preview').src = ev.target.result;
        show($('cover-preview-container'));
      };
      reader.readAsDataURL(file);
    });
  }

  if($('submitManga')) {
    $('submitManga').addEventListener('click', async () => {
      const title = $('manga-title')?.value.trim();
      const desc = $('manga-desc')?.value.trim();
      const status = $('manga-status')?.value;
      if(!title) { showToast('يرجى كتابة عنوان العمل', 'error'); return; }

      let cover = $('manga-cover-url')?.value.trim();
      const file = $('manga-cover-file')?.files[0];
      if (file) { showToast('جاري رفع غلاف العمل...'); cover = await uploadToImgBB(file); }

      await addDoc(collection(db, 'mangas'), { title, cover, description: desc, categories: selectedCategories, status, createdAt: serverTimestamp() });
      showToast('تم نشر العمل الفني بنجاح! ✓', 'success');
      closeModal('publishModal'); fetchMangas();
    });
  }
}

function renderCategoriesSelector(containerId, selected) {
  const container = $(containerId); if(!container) return;
  container.innerHTML = CATEGORIES.map(c => `<span class="tag cat-chip ${selected.includes(c.label) ? 'selected' : ''}" style="cursor:pointer; padding:6px 14px;" data-label="${c.label}">${c.label}</span>`).join('');
  container.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const lbl = chip.dataset.label;
      if(selected.includes(lbl)) { selected.splice(selected.indexOf(lbl), 1); chip.style.background = ''; }
      else { selected.push(lbl); chip.style.background = 'var(--accent)'; chip.style.color = 'white'; }
    });
  });
}

async function openEditModal(mangaId) {
  const manga = allMangas.find(m => m.id === mangaId); if (!manga) return;
  editSelectedCategories = [...(manga.categories || [])];
  if($('edit-manga-id')) $('edit-manga-id').value = mangaId;
  if($('edit-manga-title')) $('edit-manga-title').value = manga.title || '';
  if($('edit-manga-cover')) $('edit-manga-cover').value = manga.cover || '';
  if($('edit-manga-desc')) $('edit-manga-desc').value = manga.description || '';
  if($('edit-manga-status')) $('edit-manga-status').value = manga.status || 'مستمرة';
  renderCategoriesSelector('edit-categories-selector', editSelectedCategories);
  openModal('editMangaModal');
}

function initEditModal() {
  if($('closeEditMangaModal')) $('closeEditMangaModal').addEventListener('click', () => closeModal('editMangaModal'));
  if($('submitEditManga')) {
    $('submitEditManga').addEventListener('click', async () => {
      const id = $('edit-manga-id').value;
      await updateDoc(doc(db, 'mangas', id), {
        title: $('edit-manga-title').value, cover: $('edit-manga-cover').value,
        description: $('edit-manga-desc').value, status: $('edit-manga-status').value, categories: editSelectedCategories
      });
      showToast('تم تحديث البيانات'); closeModal('editMangaModal'); fetchMangas();
    });
  }
}

async function deleteManga(mangaId) {
  if(confirm('هل أنت متأكد من مسح هذا العمل نهائياً من الخادم؟')) {
    await deleteDoc(doc(db, 'mangas', mangaId)); showToast('تم الحذف'); fetchMangas();
  }
}

// ── إدارة الفصول للفريق ──
function openAddChapterModal(mangaId) {
  currentMangaId = mangaId; openModal('addChapterModal');
}

function initChapterModal() {
  if($('closeChapterModal')) $('closeChapterModal').addEventListener('click', () => closeModal('addChapterModal'));
  if($('submitChapter')) {
    $('submitChapter').addEventListener('click', async () => {
      const num = parseInt($('chapter-number').value);
      const title = $('chapter-title-input').value.trim();
      const files = Array.from($('chapter-images').files || []);
      if(!num || files.length === 0) { showToast('املأ البيانات وحدد الصور', 'error'); return; }

      show($('upload-progress'));
      const fill = $('progress-fill'); const txt = $('progress-text');

      try {
        const urls = await uploadMultipleToImgBB(files, pct => {
          if(fill) fill.style.width = pct + '%';
          if(txt) txt.textContent = `جاري رفع المنهوا السينمائية... ${pct}%`;
        });
        await addDoc(collection(db, 'mangas', currentMangaId, 'chapters'), { number: num, title, images: urls, createdAt: serverTimestamp() });
        hide($('upload-progress')); showToast('تم نشر الفصل! ✓', 'success'); closeModal('addChapterModal');
      } catch(e) {
        hide($('upload-progress')); showToast('فشل الرفع', 'error');
      }
    });
  }
}

async function deleteChapter(mangaId, chapterId) {
  if(confirm('مسح هذا الفصل؟')) {
    await deleteDoc(doc(db, 'mangas', mangaId, 'chapters', chapterId)); showToast('تم حذف الفصل'); openMangaDetail(mangaId);
  }
}

// ── فرز التصنيفات ──
function renderCategories() {
  const grid = $('categories-grid'); if(!grid) return;
  grid.innerHTML = CATEGORIES.map(c => `
    <div class="category-card" data-label="${c.label}" style="background:var(--bg-card); padding:25px; border-radius:12px; text-align:center; border:1px solid var(--border); cursor:pointer;">
      <i class="${c.icon}" style="font-size:2rem; color:var(--accent); margin-bottom:10px; display:block;"></i>
      <strong>${c.label}</strong>
    </div>
  `).join('');

  grid.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const lbl = card.dataset.label;
      const filtered = allMangas.filter(m => (m.categories || []).includes(lbl));
      if($('filtered-title')) $('filtered-title').textContent = `نتائج تصنيف: ${lbl}`;
      show($('filtered-section'));
      renderMangaGrid(filtered, 'filtered-manga-grid');
    });
  });
}

function initModalClose() {
  if($('closeMangaDetail')) $('closeMangaDetail').addEventListener('click', () => closeModal('mangaDetailModal'));
  if($('closeChapterReader')) $('closeChapterReader').addEventListener('click', () => closeModal('chapterReaderModal'));
}

// ── الإطلاق الكبير التلقائي الآمن ──
window.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initModalClose();
  await initAuth();
  initPublishModal();
  initEditModal();
  initChapterModal();
  await fetchMangas();
});
