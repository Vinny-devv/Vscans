// app.js — Main Application Logic
import {
  auth, db, provider,
  signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, where
} from './firebase.js';

// بياناتك الحقيقية ومفتاح الرفع الخاص بك
const ADMIN_EMAIL = 'anwarbah96@gmail.com';
const IMGBB_KEY = 'bf32151ce65f47f2707753b98cfa9b67';

const CATEGORIES = [
  { label: 'أكشن', icon: 'fas fa-fist-raised' },
  { label: 'رومانسي', icon: 'fas fa-heart' },
  { label: 'إثارة', icon: 'fas fa-bolt' },
  { label: 'خيال علمي', icon: 'fas fa-rocket' },
  { label: 'رعب', icon: 'fas fa-skull' },
  { label: 'كوميدي', icon: 'fas fa-laugh' },
  { label: 'مغامرات', icon: 'fas fa-map-marked-alt' },
  { label: 'قتال', icon: 'fas fa-dragon' },
  { label: 'دراما', icon: 'fas fa-theater-masks' },
  { label: 'خارق للطبيعة', icon: 'fas fa-magic' },
  { label: 'رياضة', icon: 'fas fa-running' },
  { label: 'إيسيكاي', icon: 'fas fa-portal-exit' }
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

// ── تشغيل القائمة الجانبية والتنقل بين الصفحات ────────────────
function initSidebar() {
  const sidebar = $('sidebar');
  const mobileBtn = $('mobileMenuBtn');
  const toggleBtn = $('sidebarToggle');

  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  }
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      document.querySelector('.main-content')?.classList.toggle('expanded');
    });
  }

  // التنقل بين الصفحات والأقسام عند الضغط على أزرار السايدبار
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const page = item.dataset.page;
      // إخفاء كل الأقسام الرئيسية
      hide($('home-page'));
      hide($('categories-page'));

      if (page === 'home') {
        show($('home-page'));
        hide($('filtered-section'));
      } else if (page === 'categories') {
        show($('categories-page'));
        renderCategories();
      }
      
      // إغلاق السايدبار في الهواتف بعد الضغط
      sidebar?.classList.remove('mobile-open');
    });
  });
}

// ── تشغيل المصادقة بالجيمايل المتوافق مع الهواتف 📱 ────────────────
async function initAuth() {
  const loginBtn = $('loginBtn');
  const logoutBtn = $('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      try {
        // تحويل إلى Redirect لتجنب الحظر على متصفحات الهاتف والآيفون
        await signInWithRedirect(auth, provider);
      } catch (e) {
        showToast('خطأ في الاتصال: ' + e.message, 'error');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      showToast('تم تسجيل الخروج');
    });
  }

  // التقاط النتيجة ومعالجة الجيمايل بعد إعادة التوجيه
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      showToast('مرحباً بك مجدداً!', 'success');
    }
  } catch (error) {
    console.error("خطأ تسجيل الدخول:", error);
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

// ── رفع الصور إلى ImgBB ──────────────────────────────────────
async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('فشل الرفع');
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

// ── جلب وعرض بيانات المانغا ──────────────────────────────────
async function fetchMangas() {
  try {
    const q = query(collection(db, 'mangas'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allMangas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMangaGrid(allMangas);
  } catch(e) {
    console.error(e);
    if($('manga-grid')) $('manga-grid').innerHTML = '<div style="padding:20px; text-align:center; color:var(--accent);">يرجى ضبط قواعد Firestore Rules لتكون عامة Public ⚠️</div>';
  }
}

function renderMangaGrid(mangas, targetId = 'manga-grid') {
  const grid = $(targetId); if (!grid) return;
  if (mangas.length === 0) { grid.innerHTML = '<div class="loading-spinner">لا توجد أعمال منشورة حالياً 📚</div>'; return; }

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

// ── تفاصيل المانغا والفصول والتعليقات ─────────────────────────
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
        <p>${manga.description || 'لا يوجد وصف متاح حالياً.'}</p>
      </div>
    </div>
    <div class="chapters-section">
      <h3>الفصول المتوفرة (${chapters.length})</h3>
      <div class="chapters-list">${chaptersHTML}</div>
    </div>
    <div class="comments-section">
      <h3>قسم التعليقات</h3>
      ${currentUser ? `
        <div class="comment-input-area">
          <input type="text" id="comment-input" placeholder="اكتب تعليقك هنا..."/>
          <button class="btn-comment" id="send-comment">نشر</button>
        </div>` : '<p style="color:var(--text-secondary);">سجل دخولك عبر جوجل للمشاركة في التعليقات.</p>'}
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

// ── القارئ الفني لفصول المانغا ───────────────────────────────
function openChapterReader(mangaTitle, chapter) {
  if($('reader-title')) $('reader-title').textContent = `${mangaTitle} — الفصل ${chapter.number}`;
  const imagesHTML = (chapter.images || []).map(url => `<img src="${url}" loading="lazy" alt="صفحة">`).join('');
  $('chapter-reader-content').innerHTML = imagesHTML || '<p style="padding:40px; text-align:center;">لا توجد صفحات في هذا الفصل.</p>';
  openModal('chapterReaderModal');
}

// ── إدارة نظام التعليقات ────────────────────────────────────
async function loadComments(mangaId) {
  const list = $('comments-list'); if(!list) return;
  const snap = await getDocs(query(collection(db, 'mangas', mangaId, 'comments'), orderBy('createdAt', 'desc')));
  const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (comments.length === 0) { list.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">لا توجد تعليقات بعد. كن أول المعلقين!</p>'; return; }
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

// ── لوحة التحكم ونشر المانغا ─────────────────────────────────
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
      showToast('تم نشر العمل بنجاح!', 'success');
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
      showToast('تم تحديث البيانات بنجاح'); closeModal('editMangaModal'); fetchMangas();
    });
  }
}

async function deleteManga(mangaId) {
  if(confirm('هل تريد حذف هذا العمل نهائياً؟')) {
    await deleteDoc(doc(db, 'mangas', mangaId)); showToast('تم الحذف'); fetchMangas();
  }
}

// ── إدارة رفع الفصول وصور الفصول ──────────────────────────────
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
          if(txt) txt.textContent = `جاري رفع صور الفصل... ${pct}%`;
        });
        await addDoc(collection(db, 'mangas', currentMangaId, 'chapters'), { number: num, title, images: urls, createdAt: serverTimestamp() });
        hide($('upload-progress')); showToast('تم نشر الفصل بنجاح!', 'success'); closeModal('addChapterModal');
      } catch(e) {
        hide($('upload-progress')); showToast('فشل الرفع', 'error');
      }
    });
  }
}

async function deleteChapter(mangaId, chapterId) {
  if(confirm('هل تريد حذف هذا الفصل؟')) {
    await deleteDoc(doc(db, 'mangas', mangaId, 'chapters', chapterId)); showToast('تم حذف الفصل'); openMangaDetail(mangaId);
  }
}

// ── عرض وفرز قسم التصنيفات عند الضغط عليه ──────────────────────
function renderCategories() {
  const grid = $('categories-grid'); if(!grid) return;
  grid.innerHTML = CATEGORIES.map(c => `
    <div class="category-card" data-label="${c.label}">
      <i class="${c.icon}"></i>
      <strong>${c.label}</strong>
      <span>${allMangas.filter(m => (m.categories || []).includes(c.label)).length} عمل</span>
    </div>
  `).join('');

  grid.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const label = card.dataset.label;
      const filtered = allMangas.filter(m => (m.categories || []).includes(label));
      
      const titleEl = $('filtered-title');
      const lineEl = $('filtered-line');
      const fGrid = $('filtered-manga-grid');
      
      if(titleEl) titleEl.textContent = `نتائج تصنيف: ${label}`;
      show(titleEl); show(lineEl); show(fGrid);
      renderMangaGrid(filtered, 'filtered-manga-grid');
    });
  });
}

function initModalClose() {
  if($('closeMangaDetail')) $('closeMangaDetail').addEventListener('click', () => closeModal('mangaDetailModal'));
  if($('closeChapterReader')) $('closeChapterReader').addEventListener('click', () => closeModal('chapterReaderModal'));
}

// ── التشغيل الفوري لجميع الميزات ──────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  initModalClose();
  await initAuth();
  initPublishModal();
  initEditModal();
  initChapterModal();
  await fetchMangas();
});
