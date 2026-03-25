/* ============================================================
   Sea Breeze Sewing BDA — Admin Panel JS
   ============================================================ */

let activeTab = 'designs';

// ── Boot: check session ───────────────────────────────────
(async () => {
  try {
    const res  = await fetch('/admin/status');
    const json = await res.json();
    if (json.isAdmin) showAdminShell();
  } catch {}
})();

// ── Login ─────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn  = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  btn.disabled    = true;
  btn.textContent = 'Signing in...';
  errEl.style.display = 'none';

  try {
    const res  = await fetch('/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: document.getElementById('loginPassword').value })
    });
    const json = await res.json();
    if (json.success) {
      showAdminShell();
    } else {
      errEl.textContent    = json.error || 'Incorrect password.';
      errEl.style.display  = 'block';
      btn.disabled         = false;
      btn.textContent      = 'Sign In';
    }
  } catch {
    errEl.textContent   = 'Connection error. Is the server running?';
    errEl.style.display = 'block';
    btn.disabled        = false;
    btn.textContent     = 'Sign In';
  }
});

async function adminLogout() {
  await fetch('/admin/logout', { method: 'POST' });
  document.getElementById('adminShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
}

function showAdminShell() {
  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('adminShell').style.display   = 'block';
  loadDesigns();
  loadContacts();
}

// ── Tabs ──────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.admin-tab').forEach((t, i) => {
    t.classList.toggle('active',
      (i === 0 && tab === 'designs') ||
      (i === 1 && tab === 'inquiries') ||
      (i === 2 && tab === 'about')
    );
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  if (tab === 'about') { loadAboutSettings(); loadWorkshopSettings(); }
}

// ── Multi-image preview ───────────────────────────────────
function previewImages(input) {
  if (!input.files || input.files.length === 0) return;
  const strip = document.getElementById('imagePreviewStrip');
  const thumbs = document.getElementById('previewThumbs');
  thumbs.innerHTML = '';
  document.getElementById('dropContent').style.display = 'none';
  strip.style.display = 'block';
  Array.from(input.files).forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;display:inline-block;';
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:90px;height:90px;object-fit:cover;border-radius:8px;border:2px solid var(--border);';
      if (i === 0) {
        img.title = 'Primary photo';
        img.style.borderColor = 'var(--turquoise)';
        const badge = document.createElement('div');
        badge.textContent = 'Main';
        badge.style.cssText = 'position:absolute;bottom:4px;left:4px;background:var(--turquoise);color:white;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:4px;';
        wrapper.appendChild(badge);
      }
      wrapper.appendChild(img);
      thumbs.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function clearImages() {
  document.getElementById('imageInput').value = '';
  document.getElementById('dropContent').style.display = '';
  document.getElementById('imagePreviewStrip').style.display = 'none';
  document.getElementById('previewThumbs').innerHTML = '';
}

// Drag & drop (multiple files)
const dropZone = document.getElementById('dropZone');
if (dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        const dt = new DataTransfer();
        imageFiles.forEach(f => dt.items.add(f));
        document.getElementById('imageInput').files = dt.files;
        previewImages(document.getElementById('imageInput'));
      }
    }
  });
}

// ── Upload form ───────────────────────────────────────────
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = document.getElementById('uploadBtn');
  const files = document.getElementById('imageInput').files;

  if (!files || files.length === 0) {
    showToast('Please select at least one photo first.', 'error');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Uploading...';

  // Animate progress bar
  const prog    = document.getElementById('uploadProgress');
  const bar     = document.getElementById('uploadProgressBar');
  prog.style.display = 'block';
  let pct = 0;
  const timer = setInterval(() => {
    pct = Math.min(pct + 8, 85);
    bar.style.width = pct + '%';
  }, 120);

  const formData = new FormData(e.target);

  try {
    const res  = await fetch('/admin/designs', { method: 'POST', body: formData });
    const json = await res.json();

    clearInterval(timer);
    bar.style.width = '100%';

    if (json.success) {
      const count = json.design.images ? json.design.images.length : 1;
      showToast(`Design uploaded with ${count} photo${count !== 1 ? 's' : ''}!`, 'success');
      e.target.reset();
      clearImages();
      setTimeout(() => { prog.style.display = 'none'; bar.style.width = '0%'; }, 800);
      loadDesigns();
    } else {
      showToast(json.error || 'Upload failed. Please try again.', 'error');
    }
  } catch {
    clearInterval(timer);
    showToast('Upload error. Please try again.', 'error');
  }

  btn.disabled    = false;
  btn.textContent = 'Upload Design';
});

// ── Load designs list ─────────────────────────────────────
async function loadDesigns() {
  const list = document.getElementById('adminDesignsList');
  try {
    const res     = await fetch('/admin/designs');
    const designs = await res.json();

    const count = document.getElementById('designsCount');
    if (designs.length > 0) {
      count.textContent    = designs.length;
      count.style.display  = 'inline-block';
    } else {
      count.style.display = 'none';
    }

    if (designs.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🧵</div>
          <h3>No designs yet</h3>
          <p>Upload your first design using the form above!</p>
        </div>`;
      return;
    }

    list.innerHTML = designs.map(d => {
      const photoCount = (d.images && d.images.length > 1) ? d.images.length : 1;
      return `
      <div class="admin-design-item" id="di-${d.id}" style="flex-wrap:wrap;">
        <img class="admin-design-thumb" src="${d.image}" alt="${escHtml(d.title)}"
          onerror="this.style.opacity='0.3'">
        <div class="admin-design-info">
          <div class="admin-design-title">${escHtml(d.title)}</div>
          <div class="admin-design-meta">
            <span class="tag">${escHtml(d.category)}</span>
            ${d.featured ? '<span class="tag featured">★ Featured</span>' : ''}
            ${d.price
              ? `<span class="tag" style="background:rgba(201,149,106,0.15);color:#8a5a2a;">💰 ${escHtml(d.price)}</span>`
              : '<span class="tag" style="opacity:0.5;">No price</span>'}
            ${photoCount > 1 ? `<span class="tag">🖼 ${photoCount} photos</span>` : ''}
            <span>Added ${formatDate(d.createdAt)}</span>
          </div>
          <!-- Inline price editor -->
          <div class="price-edit-row" id="price-row-${d.id}">
            <input type="text" id="price-input-${d.id}"
              value="${escHtml(d.price || '')}"
              placeholder="e.g. $45 USD"
              onkeydown="if(event.key==='Enter'){savePrice('${d.id}');}if(event.key==='Escape'){closePriceEdit('${d.id}');}">
            <button class="btn-save-price" onclick="savePrice('${d.id}')">Save</button>
            <button class="btn-cancel-price" onclick="closePriceEdit('${d.id}')">Cancel</button>
          </div>
        </div>
        <div class="admin-design-actions">
          <button class="btn-icon btn-icon-toggle"
            title="Edit price"
            onclick="openPriceEdit('${d.id}')"
            style="background:rgba(201,149,106,0.12);color:#8a5a2a;font-size:0.75rem;width:auto;border-radius:8px;padding:0 10px;font-weight:700;font-family:'Lato',sans-serif;">
            💲 Price
          </button>
          <button class="btn-icon btn-icon-toggle"
            title="Reorganise photos"
            onclick="openPhotoMoveModal('${d.id}')"
            style="background:var(--sand);color:var(--turquoise-dark);font-size:0.8rem;width:auto;border-radius:8px;padding:0 10px;font-weight:700;font-family:'Lato',sans-serif;">
            📂 Photos
          </button>
          <button class="btn-icon btn-icon-toggle"
            title="${d.featured ? 'Unfeature' : 'Feature on homepage'}"
            onclick="toggleFeatured('${d.id}', ${!d.featured})">
            ${d.featured ? '★' : '☆'}
          </button>
          <button class="btn-icon btn-icon-delete"
            title="Delete design"
            onclick="deleteDesign('${d.id}', '${escAttr(d.title)}')">
            🗑
          </button>
        </div>
      </div>`;
    }).join('');
  } catch {
    list.innerHTML = '<p style="color:var(--text-mid);padding:20px">Failed to load designs.</p>';
  }
}

async function toggleFeatured(id, featured) {
  try {
    await fetch(`/admin/designs/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ featured })
    });
    showToast(featured ? 'Design featured on homepage!' : 'Design removed from homepage.', 'success');
    loadDesigns();
  } catch {
    showToast('Could not update design.', 'error');
  }
}

async function deleteDesign(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/admin/designs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Design deleted.', 'success');
      loadDesigns();
    }
  } catch {
    showToast('Could not delete design.', 'error');
  }
}

// ── Load contacts ─────────────────────────────────────────
async function loadContacts() {
  const list = document.getElementById('adminContactsList');
  try {
    const res      = await fetch('/admin/contacts');
    const contacts = await res.json();

    const unread = contacts.filter(c => !c.read).length;
    const count  = document.getElementById('inquiriesCount');
    if (unread > 0) {
      count.textContent   = unread;
      count.style.display = 'inline-block';
    } else {
      count.style.display = 'none';
    }

    if (contacts.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✉️</div>
          <h3>No inquiries yet</h3>
          <p>When visitors send you a message, it will appear here.</p>
        </div>`;
      return;
    }

    list.innerHTML = contacts.map(c => `
      <div class="contact-inquiry ${c.read ? '' : 'unread'}" id="ci-${c.id}">
        <div class="inquiry-header">
          <div>
            <div class="inquiry-name">${escHtml(c.name)}</div>
            <div class="inquiry-meta">
              <a href="mailto:${escAttr(c.email)}" style="color:var(--turquoise)">${escHtml(c.email)}</a>
              ${c.phone ? ` · ${escHtml(c.phone)}` : ''}
              · ${formatDate(c.createdAt)}
            </div>
          </div>
          <div class="inquiry-badges">
            ${!c.read ? '<span class="badge-unread">New</span>' : ''}
            ${c.item  ? `<span class="badge-item">Re: ${escHtml(c.item)}</span>` : ''}
          </div>
        </div>
        <div class="inquiry-message">${escHtml(c.message)}</div>
        <div class="inquiry-actions">
          <a href="mailto:${escAttr(c.email)}?subject=Re: ${encodeURIComponent(c.item || 'Your inquiry')}"
             class="btn-sm-outline btn">Reply by Email</a>
          ${!c.read
            ? `<button class="btn-sm-outline" onclick="markRead('${c.id}')">Mark as Read</button>`
            : ''}
          <button class="btn-sm-outline btn-sm-delete" onclick="deleteContact('${c.id}')">Delete</button>
        </div>
      </div>`).join('');
  } catch {
    list.innerHTML = '<p style="color:var(--text-mid);padding:20px">Failed to load inquiries.</p>';
  }
}

async function markRead(id) {
  try {
    await fetch(`/admin/contacts/${id}/read`, { method: 'PATCH' });
    loadContacts();
  } catch {
    showToast('Could not update inquiry.', 'error');
  }
}

async function deleteContact(id) {
  if (!confirm('Delete this inquiry? This cannot be undone.')) return;
  try {
    await fetch(`/admin/contacts/${id}`, { method: 'DELETE' });
    showToast('Inquiry deleted.', 'success');
    loadContacts();
  } catch {
    showToast('Could not delete inquiry.', 'error');
  }
}

// ── About Page Photo ──────────────────────────────────────
async function loadAboutSettings() {
  try {
    const res  = await fetch('/admin/settings');
    const s    = await res.json();
    const img  = document.getElementById('aboutPhotoImg');
    const ph   = document.getElementById('aboutPhotoPlaceholder');
    const stat = document.getElementById('aboutPhotoStatus');
    const del  = document.getElementById('aboutPhotoDeleteBtn');
    if (s.aboutPhoto) {
      img.src = s.aboutPhoto;
      img.style.display = 'block';
      ph.style.display  = 'none';
      stat.textContent  = 'Profile photo uploaded ✓';
      del.style.display = 'inline-block';
    } else {
      img.style.display = 'none';
      ph.style.display  = 'flex';
      stat.textContent  = 'No photo uploaded yet';
      del.style.display = 'none';
    }
  } catch {}
}

function previewAboutPhoto(input) {
  if (!input.files || input.files.length === 0) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('aboutDropContent').style.display = 'none';
    const preview = document.getElementById('aboutPhotoNewPreview');
    preview.style.display = 'block';
    document.getElementById('aboutPhotoNewImg').src = e.target.result;
    document.getElementById('aboutPhotoClearBtn').style.display = 'inline';
  };
  reader.readAsDataURL(input.files[0]);
}

function clearAboutPhotoInput() {
  document.getElementById('aboutPhotoInput').value = '';
  document.getElementById('aboutDropContent').style.display = '';
  document.getElementById('aboutPhotoNewPreview').style.display = 'none';
  document.getElementById('aboutPhotoClearBtn').style.display = 'none';
}

document.getElementById('aboutPhotoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('aboutPhotoInput');
  if (!input.files || input.files.length === 0) {
    showToast('Please select a photo first.', 'error');
    return;
  }
  const btn = document.getElementById('aboutPhotoUploadBtn');
  btn.disabled = true; btn.textContent = 'Uploading…';
  const fd = new FormData();
  fd.append('photo', input.files[0]);
  try {
    const res  = await fetch('/admin/settings/about-photo', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) {
      showToast('Profile photo updated!', 'success');
      clearAboutPhotoInput();
      loadAboutSettings();
    } else {
      showToast(json.error || 'Upload failed.', 'error');
    }
  } catch {
    showToast('Upload error. Please try again.', 'error');
  }
  btn.disabled = false; btn.textContent = 'Upload Photo';
});

async function deleteAboutPhoto() {
  if (!confirm('Remove the profile photo?')) return;
  try {
    await fetch('/admin/settings/about-photo', { method: 'DELETE' });
    showToast('Photo removed.', 'success');
    loadAboutSettings();
  } catch {
    showToast('Could not remove photo.', 'error');
  }
}

// ── Workshop / Homepage Photo ──────────────────────────────
async function loadWorkshopSettings() {
  try {
    const res  = await fetch('/admin/settings');
    const s    = await res.json();
    const img  = document.getElementById('workshopPhotoAdminImg');
    const ph   = document.getElementById('workshopPhotoPlaceholder');
    const stat = document.getElementById('workshopPhotoStatus');
    const del  = document.getElementById('workshopPhotoDeleteBtn');
    if (s.workshopPhoto) {
      img.src = s.workshopPhoto;
      img.style.display = 'block';
      ph.style.display  = 'none';
      stat.textContent  = 'Workshop photo uploaded ✓';
      del.style.display = 'inline-block';
    } else {
      img.style.display = 'none';
      ph.style.display  = 'flex';
      stat.textContent  = 'No photo uploaded yet';
      del.style.display = 'none';
    }
  } catch {}
}

function previewWorkshopPhoto(input) {
  if (!input.files || input.files.length === 0) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('workshopDropContent').style.display = 'none';
    const preview = document.getElementById('workshopPhotoNewPreview');
    preview.style.display = 'block';
    document.getElementById('workshopPhotoNewImg').src = e.target.result;
    document.getElementById('workshopPhotoClearBtn').style.display = 'inline';
  };
  reader.readAsDataURL(input.files[0]);
}

function clearWorkshopPhotoInput() {
  document.getElementById('workshopPhotoInput').value = '';
  document.getElementById('workshopDropContent').style.display = '';
  document.getElementById('workshopPhotoNewPreview').style.display = 'none';
  document.getElementById('workshopPhotoClearBtn').style.display = 'none';
}

document.getElementById('workshopPhotoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('workshopPhotoInput');
  if (!input.files || input.files.length === 0) {
    showToast('Please select a photo first.', 'error');
    return;
  }
  const btn = document.getElementById('workshopPhotoUploadBtn');
  btn.disabled = true; btn.textContent = 'Uploading…';
  const fd = new FormData();
  fd.append('photo', input.files[0]);
  try {
    const res  = await fetch('/admin/settings/workshop-photo', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) {
      showToast('Homepage workshop photo updated!', 'success');
      clearWorkshopPhotoInput();
      loadWorkshopSettings();
    } else {
      showToast(json.error || 'Upload failed.', 'error');
    }
  } catch {
    showToast('Upload error. Please try again.', 'error');
  }
  btn.disabled = false; btn.textContent = 'Upload Photo';
});

async function deleteWorkshopPhoto() {
  if (!confirm('Remove the homepage workshop photo?')) return;
  try {
    await fetch('/admin/settings/workshop-photo', { method: 'DELETE' });
    showToast('Photo removed.', 'success');
    loadWorkshopSettings();
  } catch {
    showToast('Could not remove photo.', 'error');
  }
}

// ── Inline Price Editing ──────────────────────────────────
function openPriceEdit(id) {
  // Close any other open price editors first
  document.querySelectorAll('.price-edit-row.open').forEach(r => r.classList.remove('open'));
  const row = document.getElementById('price-row-' + id);
  if (row) {
    row.classList.add('open');
    const input = document.getElementById('price-input-' + id);
    if (input) { input.focus(); input.select(); }
  }
}

function closePriceEdit(id) {
  const row = document.getElementById('price-row-' + id);
  if (row) row.classList.remove('open');
}

async function savePrice(id) {
  const input = document.getElementById('price-input-' + id);
  if (!input) return;
  const newPrice = input.value.trim();
  try {
    const res = await fetch(`/admin/designs/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ price: newPrice })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Price updated!', 'success');
      closePriceEdit(id);
      loadDesigns();
    } else {
      showToast(json.error || 'Could not update price.', 'error');
    }
  } catch {
    showToast('Could not update price.', 'error');
  }
}

// ── Photo Move Modal ──────────────────────────────────────
let allDesignsCache = [];

async function openPhotoMoveModal(designId) {
  // Refresh designs list
  try {
    const res = await fetch('/admin/designs');
    allDesignsCache = await res.json();
  } catch {
    showToast('Could not load designs.', 'error');
    return;
  }

  const design = allDesignsCache.find(d => d.id === designId);
  if (!design) return;

  const images = design.images && design.images.length > 0 ? design.images : [design.image];
  const otherDesigns = allDesignsCache.filter(d => d.id !== designId);

  document.getElementById('photoMoveTitle').textContent = '📂 ' + design.title;
  document.getElementById('photoMoveSubtitle').textContent =
    `${images.length} photo${images.length !== 1 ? 's' : ''} — use the dropdowns to move any photo to a different design.`;

  const isLastPhoto = images.length === 1;

  const grid = document.getElementById('photoMoveGrid');
  grid.innerHTML = (isLastPhoto
    ? `<div style="grid-column:1/-1;padding:14px 16px;background:#fef9ec;border:1px solid #f5c842;border-radius:var(--radius);font-size:0.88rem;color:#7a5f00;margin-bottom:4px;">
        ⚠️ This design has only one photo. Moving it will <strong>permanently delete this design</strong> and move the photo to the chosen design.
       </div>`
    : '') +
  images.map((src, i) => {
    const opts = otherDesigns.map(d =>
      `<option value="${escHtml(d.id)}">${escHtml(d.title.substring(0,28))}${d.title.length > 28 ? '…' : ''}</option>`
    ).join('');
    return `
      <div class="photo-move-item" id="pmi-${designId}-${i}">
        ${i === 0 ? '<div class="primary-badge">Main Photo</div>' : ''}
        <img src="${escHtml(src)}" alt="Photo ${i+1}" onerror="this.style.opacity='0.3'">
        <div class="photo-move-item-actions">
          <select id="pmsel-${designId}-${i}">
            <option value="">— Move to design… —</option>
            ${opts}
          </select>
          <button onclick="movePhoto('${escAttr(designId)}', ${i})">${isLastPhoto ? 'Move & Delete Design' : 'Move Photo'}</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('photoMoveOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePhotoMoveModal() {
  document.getElementById('photoMoveOverlay').classList.remove('open');
  document.body.style.overflow = '';
  loadDesigns();
}

async function movePhoto(sourceId, imageIndex) {
  const sel = document.getElementById(`pmsel-${sourceId}-${imageIndex}`);
  const targetId = sel?.value;
  if (!targetId) {
    showToast('Please select a target design first.', 'error');
    return;
  }
  try {
    const res = await fetch(`/admin/designs/${sourceId}/move-image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIndex, targetDesignId: targetId })
    });
    const json = await res.json();
    if (json.success) {
      const targetName = allDesignsCache.find(d => d.id === targetId)?.title || targetId;
      if (json.sourceDeleted) {
        showToast(`Photo moved to "${targetName}" — empty design was deleted.`, 'success');
        closePhotoMoveModal();
      } else {
        showToast(`Photo moved to "${targetName}"!`, 'success');
        // Re-open modal for same design with updated photos
        closePhotoMoveModal();
        setTimeout(() => openPhotoMoveModal(sourceId), 400);
      }
    } else {
      showToast(json.error || 'Move failed.', 'error');
    }
  } catch {
    showToast('Could not move photo.', 'error');
  }
}
