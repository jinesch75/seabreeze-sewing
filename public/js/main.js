/* ============================================================
   Sea Breeze Sewing BDA — Main Frontend JS
   Shared across all public pages
   ============================================================ */

// ── Navigation scroll effect ──────────────────────────────
const nav = document.getElementById('mainNav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// ── Hamburger menu ────────────────────────────────────────
function toggleMenu() {
  const navLinks  = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');
  if (!navLinks) return;
  const open = navLinks.classList.toggle('open');
  // Animate hamburger → X via CSS class
  hamburger?.classList.toggle('open', open);
  // iOS-safe scroll lock: must set both html and body
  const lock = open ? 'hidden' : '';
  document.body.style.overflow = lock;
  document.documentElement.style.overflow = lock;
}

function _closeMenu() {
  document.getElementById('navLinks')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('open');
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

// Close menu on link click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#navLinks a').forEach(l => {
    l.addEventListener('click', _closeMenu);
  });
});

// ── Toast notification ────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const icon = type === 'success' ? '✓' : '✕';
  toast.innerHTML = `<span>${icon}</span> ${message}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// ── Per-design image cache (used by lightbox) ─────────────
const _designImages = {};

// ── Design card renderer (shared across pages) ───────────
function renderCard(design) {
  const images  = (design.images && design.images.length > 0) ? design.images : [design.image];
  const hasMany = images.length > 1;
  const cardId  = 'card-' + design.id;

  // Cache images for the lightbox
  _designImages[design.id] = images;

  // Build image gallery section
  const badgesHtml = `
    ${design.isNew  ? '<div class="design-card-badge">NEW</div>' : ''}
    ${design.isSold ? '<div class="design-card-badge design-card-badge-sold">SOLD</div>' : ''}
  `;
  const galleryHtml = hasMany
    ? `<div class="card-gallery${design.isSold ? ' is-sold' : ''}" id="${cardId}">
        ${images.map((src, i) => `
          <img src="${src}" alt="${escHtml(design.title)} — photo ${i + 1}" loading="lazy"
            class="gallery-slide${i === 0 ? ' active' : ''}"
            onclick="openLightbox('${escAttr(design.id)}', ${i})"
            onerror="this.style.display='none'">`).join('')}
        <button class="gallery-arrow gallery-prev" onclick="slideGallery('${cardId}',-1)" aria-label="Previous photo">&#8249;</button>
        <button class="gallery-arrow gallery-next" onclick="slideGallery('${cardId}', 1)" aria-label="Next photo">&#8250;</button>
        <div class="gallery-dots">
          ${images.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}" onclick="goToSlide('${cardId}',${i})"></span>`).join('')}
        </div>
        ${badgesHtml}
      </div>`
    : `<div class="design-card-img${design.isSold ? ' is-sold' : ''}">
        <img src="${images[0]}" alt="${escHtml(design.title)}" loading="lazy"
          onclick="openLightbox('${escAttr(design.id)}', 0)"
          onerror="this.style.display='none'">
        ${badgesHtml}
      </div>`;

  const buttonHtml = design.isSold
    ? `<button class="btn btn-sold" disabled>Sold</button>`
    : `<button class="btn btn-coral" onclick="openInterestModal('${escAttr(design.title)}')">I'm Interested</button>`;

  return `
    <div class="design-card${design.isSold ? ' is-sold' : ''}" data-id="${design.id}">
      ${galleryHtml}
      <div class="design-card-body">
        <h3>${escHtml(design.title)}</h3>
        ${design.price ? `<div class="design-card-price">${escHtml(design.price)}</div>` : ''}
        <p>${escHtml(design.description || '')}</p>
        ${buttonHtml}
      </div>
    </div>`;
}

// ── Gallery slideshow helpers ──────────────────────────────
function slideGallery(cardId, direction) {
  const gallery = document.getElementById(cardId);
  if (!gallery) return;
  const slides = gallery.querySelectorAll('.gallery-slide');
  const dots   = gallery.querySelectorAll('.gallery-dot');
  let current  = Array.from(slides).findIndex(s => s.classList.contains('active'));
  slides[current].classList.remove('active');
  dots[current]?.classList.remove('active');
  current = (current + direction + slides.length) % slides.length;
  slides[current].classList.add('active');
  dots[current]?.classList.add('active');
}

function goToSlide(cardId, index) {
  const gallery = document.getElementById(cardId);
  if (!gallery) return;
  const slides = gallery.querySelectorAll('.gallery-slide');
  const dots   = gallery.querySelectorAll('.gallery-dot');
  slides.forEach((s, i) => s.classList.toggle('active', i === index));
  dots.forEach((d, i) => d.classList.toggle('active', i === index));
}

// ── Lightbox ──────────────────────────────────────────────
let _lbImages = [];
let _lbIdx    = 0;

function openLightbox(designId, idx) {
  _lbImages = _designImages[designId] || [];
  _lbIdx    = idx || 0;
  _refreshLightbox();
  const overlay = document.getElementById('lightboxOverlay');
  if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function _refreshLightbox() {
  const img     = document.getElementById('lightboxImg');
  const prev    = document.getElementById('lightboxPrev');
  const next    = document.getElementById('lightboxNext');
  const counter = document.getElementById('lightboxCounter');
  if (img) img.src = _lbImages[_lbIdx] || '';
  const multi = _lbImages.length > 1;
  if (prev)    { prev.className    = multi ? 'show' : ''; prev.style.display    = multi ? 'flex' : 'none'; }
  if (next)    { next.className    = multi ? 'show' : ''; next.style.display    = multi ? 'flex' : 'none'; }
  if (counter) counter.textContent = multi ? `${_lbIdx + 1} / ${_lbImages.length}` : '';
}

function lightboxPrev() {
  if (!_lbImages.length) return;
  _lbIdx = (_lbIdx - 1 + _lbImages.length) % _lbImages.length;
  _refreshLightbox();
}

function lightboxNext() {
  if (!_lbImages.length) return;
  _lbIdx = (_lbIdx + 1) % _lbImages.length;
  _refreshLightbox();
}

function closeLightbox() {
  const overlay = document.getElementById('lightboxOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Interest modal ────────────────────────────────────────
function openInterestModal(itemTitle) {
  const modal   = document.getElementById('interestModal');
  const nameEl  = document.getElementById('modalItemName');
  const inputEl = document.getElementById('modalItemInput');
  if (!modal) return;

  if (nameEl)  nameEl.textContent = itemTitle;
  if (inputEl) inputEl.value      = itemTitle;

  // Reset form + success state
  const form    = document.getElementById('modalContactForm');
  const success = document.getElementById('modalSuccess');
  if (form)    { form.style.display    = ''; form.reset(); }
  if (success) { success.style.display = 'none'; }
  if (inputEl) inputEl.value = itemTitle; // re-set after reset

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('interestModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target?.classList?.contains('modal-overlay')) closeModal();
});

// Close modal / lightbox on Escape; navigate lightbox with arrow keys
document.addEventListener('keydown', (e) => {
  const lbOpen = document.getElementById('lightboxOverlay')?.classList.contains('open');
  if (e.key === 'Escape') { if (lbOpen) closeLightbox(); else closeModal(); }
  if (lbOpen) {
    if (e.key === 'ArrowLeft')  lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
  }
});

// ── Modal form submission ─────────────────────────────────
document.addEventListener('submit', async (e) => {
  if (e.target?.id !== 'modalContactForm') return;
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Sending...';

  const data = {
    name:    form.querySelector('[name="name"]').value,
    email:   form.querySelector('[name="email"]').value,
    phone:   form.querySelector('[name="phone"]')?.value || '',
    item:    document.getElementById('modalItemInput')?.value || 'Unknown item',
    message: form.querySelector('[name="message"]').value
  };

  try {
    const res  = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      form.style.display = 'none';
      const success = document.getElementById('modalSuccess');
      if (success) success.style.display = 'block';
    } else {
      showToast(json.error || 'Something went wrong. Please try again.', 'error');
      btn.disabled    = false;
      btn.textContent = 'Send My Interest';
    }
  } catch {
    showToast('Unable to send. Please try again.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Send My Interest';
  }
});

// ── Helpers ───────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return iso; }
}
