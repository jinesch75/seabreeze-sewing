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
  const links = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');
  if (!links) return;
  const open = links.classList.toggle('open');
  hamburger.style.opacity = open ? '0.6' : '1';
  document.body.style.overflow = open ? 'hidden' : '';
}
// Close menu on link click
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('#navLinks a');
  links.forEach(l => l.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.remove('open');
    document.body.style.overflow = '';
  }));
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

// ── Design card renderer (shared across pages) ───────────
function renderCard(design) {
  const images  = (design.images && design.images.length > 0) ? design.images : [design.image];
  const hasMany = images.length > 1;
  const cardId  = 'card-' + design.id;

  // Build image gallery section
  const galleryHtml = hasMany
    ? `<div class="card-gallery" id="${cardId}">
        ${images.map((src, i) => `
          <img src="${src}" alt="${escHtml(design.title)} — photo ${i + 1}" loading="lazy"
            class="gallery-slide${i === 0 ? ' active' : ''}"
            onerror="this.style.display='none'">`).join('')}
        <button class="gallery-arrow gallery-prev" onclick="slideGallery('${cardId}',-1)" aria-label="Previous photo">&#8249;</button>
        <button class="gallery-arrow gallery-next" onclick="slideGallery('${cardId}', 1)" aria-label="Next photo">&#8250;</button>
        <div class="gallery-dots">
          ${images.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}" onclick="goToSlide('${cardId}',${i})"></span>`).join('')}
        </div>
        ${design.featured ? '<div class="design-card-badge">New</div>' : ''}
      </div>`
    : `<div class="design-card-img">
        <img src="${images[0]}" alt="${escHtml(design.title)}" loading="lazy"
          onerror="this.style.display='none'">
        ${design.featured ? '<div class="design-card-badge">New</div>' : ''}
      </div>`;

  return `
    <div class="design-card" data-id="${design.id}">
      ${galleryHtml}
      <div class="design-card-body">
        <div class="design-card-category">${escHtml(design.category || 'Design')}</div>
        <h3>${escHtml(design.title)}</h3>
        ${design.price ? `<div class="design-card-price">${escHtml(design.price)}</div>` : ''}
        <p>${escHtml(design.description || '')}</p>
        <button class="btn btn-coral" onclick="openInterestModal('${escAttr(design.title)}')">
          I'm Interested
        </button>
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

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
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
