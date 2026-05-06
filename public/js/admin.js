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
const TAB_NAMES = ['designs', 'inquiries', 'about', 'content', 'stats'];
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.admin-tab').forEach((t, i) => {
    t.classList.toggle('active', TAB_NAMES[i] === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  if (tab === 'about')   { loadAboutSettings(); loadHeroPhotoPicker(); }
  if (tab === 'content') { loadContent(); }
  if (tab === 'stats')   { loadStats(); }
}

// ── Statistics ────────────────────────────────────────────
let _statsLoaded = false;

async function loadStats() {
  if (_statsLoaded) return; // already loaded — don't re-fetch on every tab switch
  _statsLoaded = false;     // will set true after success
  try {
    const res  = await fetch('/admin/stats');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    // Summary cards
    document.getElementById('statTotalVisits').textContent = data.totalVisits.toLocaleString();
    document.getElementById('statTodayVisits').textContent = data.todayVisits.toLocaleString();
    document.getElementById('statInquiries').textContent   = data.totalInquiries.toLocaleString();
    document.getElementById('statDesigns').textContent     = data.totalDesigns.toLocaleString();

    // Bar chart — last 30 days
    renderVisitChart(data.last30);

    // Countries
    renderCountries(data.countries);

    // Pages
    renderPages(data.pages);

    _statsLoaded = true;
  } catch (e) {
    console.error('Stats load error', e);
    document.getElementById('statsChart').innerHTML    = '<p style="color:#dc2626;text-align:center;padding:20px;">Could not load statistics.</p>';
    document.getElementById('statsCountries').innerHTML = '';
    document.getElementById('statsPages').innerHTML    = '';
  }
}

function renderVisitChart(last30) {
  const max = Math.max(...last30.map(d => d.visits), 1);
  const bars = last30.map(d => {
    const heightPct = Math.round((d.visits / max) * 100);
    const shortDate = d.date.slice(5); // MM-DD
    return `
      <div class="chart-bar-wrap">
        <div class="chart-tooltip">${d.date}: ${d.visits} view${d.visits !== 1 ? 's' : ''}</div>
        <div class="chart-bar" style="height:${heightPct}%;"></div>
        <span class="chart-label">${shortDate}</span>
      </div>`;
  }).join('');
  document.getElementById('statsChart').innerHTML = `<div class="chart-bars">${bars}</div>`;
}

function renderCountries(countries) {
  if (!countries || !countries.length) {
    document.getElementById('statsCountries').innerHTML = '<p style="color:var(--text-mid);text-align:center;padding:20px;">No visitor data yet.</p>';
    return;
  }
  const max = countries[0][1] || 1;
  const rows = countries.map(([name, count]) => {
    const pct = Math.round((count / max) * 100);
    return `
      <div class="country-row">
        <span class="country-name" title="${name}">${name}</span>
        <div class="country-bar-wrap">
          <div class="country-bar" style="width:${pct}%;"></div>
        </div>
        <span class="country-count">${count}</span>
      </div>`;
  }).join('');
  document.getElementById('statsCountries').innerHTML = rows;
}

function renderPages(pages) {
  if (!pages || !pages.length) {
    document.getElementById('statsPages').innerHTML = '<p style="color:var(--text-mid);text-align:center;padding:20px;">No page data yet.</p>';
    return;
  }
  const labels = { '/': 'Home', '/about.html': 'About', '/contact.html': 'Contact' };
  const rows = pages.map(([path, count]) => {
    const label = labels[path] || path;
    return `
      <div class="page-row">
        <span class="page-row-path">${label} <span style="font-weight:400;color:var(--text-mid);font-size:0.8rem;">${path}</span></span>
        <span class="page-row-count">${count.toLocaleString()}</span>
      </div>`;
  }).join('');
  document.getElementById('statsPages').innerHTML = rows;
}

// ── Content Management (Page Text Editor) ─────────────────

async function loadContent() {
  try {
    const res = await fetch('/api/content');
    const c   = await res.json();
    // Map field IDs to their values in the content object
    const fields = {
      // Shared
      'cnt-shared-ownerName':       c.shared?.ownerName,
      'cnt-shared-email':           c.shared?.email,
      'cnt-shared-phone':           c.shared?.phone,
      'cnt-shared-phoneHref':       c.shared?.phoneHref,
      'cnt-shared-location':        c.shared?.location,
      'cnt-shared-responseTime':    c.shared?.responseTime,
      'cnt-shared-footerBrandDesc': c.shared?.footerBrandDesc,
      'cnt-shared-copyright':       c.shared?.copyright,
      // Homepage
      'cnt-homepage-heroBadge':         c.homepage?.heroBadge,
      'cnt-homepage-heroHeading':       c.homepage?.heroHeading,
      'cnt-homepage-heroHeadingEm':     c.homepage?.heroHeadingEm,
      'cnt-homepage-heroDesc':          c.homepage?.heroDesc,
      'cnt-homepage-catalogueLabel':    c.homepage?.catalogueLabel,
      'cnt-homepage-catalogueHeading':  c.homepage?.catalogueHeading,
      'cnt-homepage-catalogueSubtitle': c.homepage?.catalogueSubtitle,
      // About
      'cnt-about-headerLabel':    c.about?.headerLabel,
      'cnt-about-headerHeading':  c.about?.headerHeading,
      'cnt-about-headerSubtitle': c.about?.headerSubtitle,
      'cnt-about-storyLabel':     c.about?.storyLabel,
      'cnt-about-storyHeading':   c.about?.storyHeading,
      'cnt-about-storyHeadingBr': c.about?.storyHeadingBr,
      'cnt-about-storyPara1':     c.about?.storyPara1,
      'cnt-about-storyPara2':     c.about?.storyPara2,
      'cnt-about-storyPara3':     c.about?.storyPara3,
      'cnt-about-valuesLabel':    c.about?.valuesLabel,
      'cnt-about-valuesHeading':  c.about?.valuesHeading,
      'cnt-about-value1Icon':     c.about?.value1Icon,
      'cnt-about-value1Title':    c.about?.value1Title,
      'cnt-about-value1Desc':     c.about?.value1Desc,
      'cnt-about-value2Icon':     c.about?.value2Icon,
      'cnt-about-value2Title':    c.about?.value2Title,
      'cnt-about-value2Desc':     c.about?.value2Desc,
      'cnt-about-value3Icon':     c.about?.value3Icon,
      'cnt-about-value3Title':    c.about?.value3Title,
      'cnt-about-value3Desc':     c.about?.value3Desc,
      'cnt-about-materialsLabel':   c.about?.materialsLabel,
      'cnt-about-materialsHeading': c.about?.materialsHeading,
      'cnt-about-materialsIntro':   c.about?.materialsIntro,
      'cnt-about-mat1Title': c.about?.mat1Title,
      'cnt-about-mat1Desc':  c.about?.mat1Desc,
      'cnt-about-mat2Title': c.about?.mat2Title,
      'cnt-about-mat2Desc':  c.about?.mat2Desc,
      'cnt-about-mat3Title': c.about?.mat3Title,
      'cnt-about-mat3Desc':  c.about?.mat3Desc,
      'cnt-about-mat4Title': c.about?.mat4Title,
      'cnt-about-mat4Desc':  c.about?.mat4Desc,
      'cnt-about-mat5Title': c.about?.mat5Title,
      'cnt-about-mat5Desc':  c.about?.mat5Desc,
      'cnt-about-mat6Title': c.about?.mat6Title,
      'cnt-about-mat6Desc':  c.about?.mat6Desc,
      // Contact
      'cnt-contact-headerLabel':     c.contact?.headerLabel,
      'cnt-contact-headerHeading':   c.contact?.headerHeading,
      'cnt-contact-headerSubtitle':  c.contact?.headerSubtitle,
      'cnt-contact-infoHeading':     c.contact?.infoHeading,
      'cnt-contact-infoPara':        c.contact?.infoPara,
      'cnt-contact-howItWorksTitle': c.contact?.howItWorksTitle,
      'cnt-contact-howItWorksDesc':  c.contact?.howItWorksDesc,
    };
    for (const [id, val] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el && val != null) el.value = val;
    }
  } catch (err) {
    showToast('Could not load page content. Is the server running?', 'error');
  }
}

function g(id) { return document.getElementById(id)?.value || ''; }

async function saveContent() {
  const btn       = document.getElementById('contentSaveBtn');
  const btnBottom = document.getElementById('contentSaveBtnBottom');
  const status    = document.getElementById('contentSaveStatus');
  [btn, btnBottom].forEach(b => { if (b) { b.disabled = true; b.textContent = 'Saving…'; } });
  status.textContent = '';

  const content = {
    shared: {
      ownerName:       g('cnt-shared-ownerName'),
      email:           g('cnt-shared-email'),
      phone:           g('cnt-shared-phone'),
      phoneHref:       g('cnt-shared-phoneHref'),
      location:        g('cnt-shared-location'),
      responseTime:    g('cnt-shared-responseTime'),
      footerBrandDesc: g('cnt-shared-footerBrandDesc'),
      copyright:       g('cnt-shared-copyright'),
    },
    homepage: {
      heroBadge:         g('cnt-homepage-heroBadge'),
      heroHeading:       g('cnt-homepage-heroHeading'),
      heroHeadingEm:     g('cnt-homepage-heroHeadingEm'),
      heroDesc:          g('cnt-homepage-heroDesc'),
      catalogueLabel:    g('cnt-homepage-catalogueLabel'),
      catalogueHeading:  g('cnt-homepage-catalogueHeading'),
      catalogueSubtitle: g('cnt-homepage-catalogueSubtitle'),
    },
    about: {
      headerLabel:      g('cnt-about-headerLabel'),
      headerHeading:    g('cnt-about-headerHeading'),
      headerSubtitle:   g('cnt-about-headerSubtitle'),
      storyLabel:       g('cnt-about-storyLabel'),
      storyHeading:     g('cnt-about-storyHeading'),
      storyHeadingBr:   g('cnt-about-storyHeadingBr'),
      storyPara1:       g('cnt-about-storyPara1'),
      storyPara2:       g('cnt-about-storyPara2'),
      storyPara3:       g('cnt-about-storyPara3'),
      valuesLabel:      g('cnt-about-valuesLabel'),
      valuesHeading:    g('cnt-about-valuesHeading'),
      value1Icon:       g('cnt-about-value1Icon'),
      value1Title:      g('cnt-about-value1Title'),
      value1Desc:       g('cnt-about-value1Desc'),
      value2Icon:       g('cnt-about-value2Icon'),
      value2Title:      g('cnt-about-value2Title'),
      value2Desc:       g('cnt-about-value2Desc'),
      value3Icon:       g('cnt-about-value3Icon'),
      value3Title:      g('cnt-about-value3Title'),
      value3Desc:       g('cnt-about-value3Desc'),
      materialsLabel:   g('cnt-about-materialsLabel'),
      materialsHeading: g('cnt-about-materialsHeading'),
      materialsIntro:   g('cnt-about-materialsIntro'),
      mat1Title: g('cnt-about-mat1Title'), mat1Desc: g('cnt-about-mat1Desc'),
      mat2Title: g('cnt-about-mat2Title'), mat2Desc: g('cnt-about-mat2Desc'),
      mat3Title: g('cnt-about-mat3Title'), mat3Desc: g('cnt-about-mat3Desc'),
      mat4Title: g('cnt-about-mat4Title'), mat4Desc: g('cnt-about-mat4Desc'),
      mat5Title: g('cnt-about-mat5Title'), mat5Desc: g('cnt-about-mat5Desc'),
      mat6Title: g('cnt-about-mat6Title'), mat6Desc: g('cnt-about-mat6Desc'),
    },
    contact: {
      headerLabel:     g('cnt-contact-headerLabel'),
      headerHeading:   g('cnt-contact-headerHeading'),
      headerSubtitle:  g('cnt-contact-headerSubtitle'),
      infoHeading:     g('cnt-contact-infoHeading'),
      infoPara:        g('cnt-contact-infoPara'),
      howItWorksTitle: g('cnt-contact-howItWorksTitle'),
      howItWorksDesc:  g('cnt-contact-howItWorksDesc'),
    }
  };

  try {
    const res  = await fetch('/admin/content', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(content)
    });
    const json = await res.json();
    if (json.success) {
      status.textContent = '✓ Saved! Changes are live on the website.';
      status.style.color = 'var(--turquoise-dark)';
      showToast('Page text saved successfully!', 'success');
    } else {
      status.textContent = 'Error: ' + (json.error || 'Unknown error');
      status.style.color = '#dc2626';
    }
  } catch {
    status.textContent = 'Connection error — please try again.';
    status.style.color = '#dc2626';
  } finally {
    [btn, btnBottom].forEach(b => { if (b) { b.disabled = false; b.textContent = 'Save All Changes'; } });
    setTimeout(() => { status.textContent = ''; }, 6000);
  }
}

// ── Price helpers ─────────────────────────────────────────
function parsePriceNum(priceStr) {
  // "$45 USD" → "45"
  if (!priceStr) return '';
  const m = String(priceStr).match(/[\d.]+/);
  return m ? m[0] : '';
}
function formatPriceStr(numVal) {
  // "45" → "$45 USD"
  if (numVal === '' || numVal === null || numVal === undefined) return '';
  const n = parseFloat(numVal);
  if (isNaN(n) || n < 0) return '';
  return '$' + (n % 1 === 0 ? Math.round(n) : n.toFixed(2)) + ' USD';
}

// ── Multi-image preview ───────────────────────────────────
function previewImages(input) {
  if (!input.files || input.files.length === 0) return;
  const strip = document.getElementById('imagePreviewStrip');
  const thumbs = document.getElementById('previewThumbs');
  thumbs.innerHTML = '';
  // Hide the drop hint and show the preview strip (both live inside the drop zone)
  document.getElementById('dropContent').style.display = 'none';
  strip.style.display = 'block';
  // Show the "Remove all" button that lives safely outside the drop zone
  const clearWrap = document.getElementById('clearImagesWrap');
  if (clearWrap) clearWrap.style.display = 'block';
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
  const clearWrap = document.getElementById('clearImagesWrap');
  if (clearWrap) clearWrap.style.display = 'none';
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

  // Format price from number input → "$N USD"
  const priceAmountEl = document.getElementById('uploadPriceAmount');
  const priceHiddenEl = document.getElementById('uploadPrice');
  if (priceAmountEl && priceHiddenEl) {
    priceHiddenEl.value = formatPriceStr(priceAmountEl.value);
  }

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
      // Restore default price amount after reset
      const pa = document.getElementById('uploadPriceAmount');
      if (pa) pa.value = '45';
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

    // Guard: if the server returned an error object (e.g. session expired) instead of an array,
    // show a helpful message rather than crashing with "map is not a function".
    if (!Array.isArray(designs)) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load designs</h3>
        <p>Your session may have expired. Please <a href="/admin.html" style="color:var(--turquoise)">sign in again</a>.</p>
      </div>`;
      return;
    }

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
      const priceNum   = parsePriceNum(d.price);
      return `
      <div class="admin-design-item" id="di-${d.id}" style="flex-wrap:wrap;">
        <img class="admin-design-thumb" src="${d.image}" alt="${escHtml(d.title)}"
          onerror="this.style.opacity='0.3'">
        <div class="admin-design-info">
          <div class="admin-design-title">${escHtml(d.title)}</div>
          <div class="admin-design-meta">
            ${d.isNew ? '<span class="tag" style="background:rgba(201,149,106,0.18);color:#8a3a00;font-weight:700;">🆕 NEW</span>' : ''}
            ${d.isSold ? '<span class="tag" style="background:rgba(180,40,40,0.15);color:#a02020;font-weight:700;">🔴 SOLD</span>' : ''}
            ${d.price
              ? `<span class="tag" style="background:rgba(201,149,106,0.15);color:#8a5a2a;">💰 ${escHtml(d.price)}</span>`
              : '<span class="tag" style="opacity:0.5;">No price</span>'}
            ${photoCount > 1 ? `<span class="tag">🖼 ${photoCount} photos</span>` : ''}
            <span>Added ${formatDate(d.createdAt)}</span>
          </div>
          <!-- Unified inline editor (title, price, description, isNew, photos) -->
          <div class="design-edit-row" id="edit-row-${d.id}">
            <div class="edit-fields">
              <div>
                <label>Title</label>
                <input type="text" id="edit-title-${d.id}" value="${escHtml(d.title)}" placeholder="Design title">
              </div>
              <div>
                <label>Price (USD)</label>
                <div class="price-input-wrap">
                  <span>$</span>
                  <input type="number" id="edit-price-${d.id}"
                    value="${escHtml(priceNum)}"
                    placeholder="45" min="0" step="1">
                  <span>USD</span>
                </div>
              </div>
              <div class="full">
                <label>Description</label>
                <textarea id="edit-desc-${d.id}" rows="2" placeholder="Describe the design…">${escHtml(d.description || '')}</textarea>
              </div>
              <div class="full">
                <label class="featured-toggle" for="edit-isnew-${d.id}"
                  style="padding:9px 14px;margin:0;max-width:360px;background:white;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;">
                  <input type="checkbox" id="edit-isnew-${d.id}" ${d.isNew ? 'checked' : ''}>
                  <div class="toggle-switch"></div>
                  <div>
                    <div class="toggle-label" style="font-size:0.82rem;">🆕 Mark as New</div>
                    <div class="toggle-hint" style="font-size:0.75rem;">Show "NEW" badge on this design</div>
                  </div>
                </label>
              </div>
              <div class="full">
                <label class="featured-toggle" for="edit-issold-${d.id}"
                  style="padding:9px 14px;margin:0;max-width:360px;background:white;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;">
                  <input type="checkbox" id="edit-issold-${d.id}" ${d.isSold ? 'checked' : ''}>
                  <div class="toggle-switch"></div>
                  <div>
                    <div class="toggle-label" style="font-size:0.82rem;">🔴 Mark as Sold</div>
                    <div class="toggle-hint" style="font-size:0.75rem;">Show "SOLD" badge — disables the "I'm Interested" button</div>
                  </div>
                </label>
              </div>
              <div class="full" style="margin-top:4px;">
                <label style="font-size:0.8rem;font-weight:700;color:var(--text-mid);display:block;margin-bottom:6px;">Photos</label>
                <button type="button" onclick="openPhotoMoveModal('${d.id}')"
                  style="padding:9px 18px;background:var(--sand);border:2px solid var(--turquoise);border-radius:var(--radius);font-family:'Lato',sans-serif;font-size:0.85rem;font-weight:700;color:var(--turquoise-dark);cursor:pointer;transition:var(--transition);display:inline-flex;align-items:center;gap:8px;">
                  📷 Click here to change or reorganise photos
                  <span style="background:var(--turquoise);color:white;border-radius:50px;padding:1px 9px;font-size:0.75rem;">${photoCount}</span>
                </button>
              </div>
            </div>
            <div class="design-edit-actions">
              <button class="btn-save-edit" onclick="saveEditDesign('${d.id}')">Save Changes</button>
              <button class="btn-cancel-edit" onclick="closeEditDesign('${d.id}')">Cancel</button>
            </div>
          </div>
        </div>
        <div class="admin-design-actions">
          <button class="btn-icon btn-icon-toggle"
            title="Edit design"
            onclick="openEditDesign('${d.id}')"
            style="background:rgba(74,171,181,0.1);color:var(--turquoise-dark);font-size:0.75rem;width:auto;border-radius:8px;padding:0 12px;font-weight:700;font-family:'Lato',sans-serif;">
            ✏️ Edit
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

async function toggleNew(id, isNew) {
  try {
    await fetch(`/admin/designs/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isNew })
    });
    showToast(isNew ? 'NEW badge added to design!' : 'NEW badge removed from design.', 'success');
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
  const newPrice = formatPriceStr(input.value.trim());
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

// ── Inline Design Edit (title, description) ──────────────
function openEditDesign(id) {
  // Close any other open edit rows
  document.querySelectorAll('.design-edit-row.open').forEach(r => r.classList.remove('open'));
  document.querySelectorAll('.price-edit-row.open').forEach(r => r.classList.remove('open'));
  const row = document.getElementById('edit-row-' + id);
  if (row) row.classList.add('open');
}

function closeEditDesign(id) {
  const row = document.getElementById('edit-row-' + id);
  if (row) row.classList.remove('open');
}

async function saveEditDesign(id) {
  const titleEl = document.getElementById('edit-title-' + id);
  const descEl  = document.getElementById('edit-desc-' + id);
  const priceEl = document.getElementById('edit-price-' + id);
  const isNewEl = document.getElementById('edit-isnew-' + id);
  const isSoldEl = document.getElementById('edit-issold-' + id);
  if (!titleEl) return;
  const title       = titleEl.value.trim();
  const description = descEl ? descEl.value.trim() : '';
  if (!title) { showToast('Title cannot be empty.', 'error'); return; }
  const body = { title, description };
  if (priceEl) body.price = formatPriceStr(priceEl.value.trim());
  if (isNewEl) body.isNew = isNewEl.checked;
  if (isSoldEl) body.isSold = isSoldEl.checked;
  try {
    const res = await fetch(`/admin/designs/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Design updated!', 'success');
      closeEditDesign(id);
      loadDesigns();
    } else {
      showToast(json.error || 'Could not update design.', 'error');
    }
  } catch {
    showToast('Could not update design.', 'error');
  }
}

// ── Photo Move Modal ──────────────────────────────────────
let allDesignsCache = [];
let currentPhotoModalDesignId = null;

async function openPhotoMoveModal(designId) {
  currentPhotoModalDesignId = designId;
  // Reset add-photo section
  const inp = document.getElementById('addPhotoInput');
  if (inp) inp.value = '';
  const lbl = document.getElementById('addPhotoLabel');
  if (lbl) lbl.textContent = 'No files selected';
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
        ⚠️ This design has only one photo. Moving or removing it will <strong>permanently delete this design</strong>.
       </div>`
    : '') +
  images.map((src, i) => {
    const opts = otherDesigns.map(d =>
      `<option value="${escHtml(d.id)}">${escHtml(d.title.substring(0,28))}${d.title.length > 28 ? '…' : ''}</option>`
    ).join('');
    return `
      <div class="photo-move-item" id="pmi-${designId}-${i}">
        ${i === 0 ? '<div class="primary-badge">⭐ Main Photo</div>' : ''}
        <img src="${escHtml(src)}" alt="Photo ${i+1}" onerror="this.style.opacity='0.3'">
        <div class="photo-move-item-actions">
          ${i > 0 ? `<button onclick="setMainPhoto('${escAttr(designId)}', ${i})"
            style="margin-bottom:6px;background:rgba(74,171,181,0.1);border-color:var(--turquoise);color:var(--turquoise-dark);">
            ⭐ Set as Main
          </button>` : ''}
          <select id="pmsel-${designId}-${i}">
            <option value="">— Move to design… —</option>
            ${opts}
          </select>
          <button onclick="movePhoto('${escAttr(designId)}', ${i})">${isLastPhoto ? 'Move & Delete Design' : 'Move Photo'}</button>
          <button onclick="removePhoto('${escAttr(designId)}', ${i}, ${isLastPhoto})"
            style="margin-top:6px;background:#fef2f2;border-color:#fca5a5;color:#dc2626;">
            🗑 Remove Photo
          </button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('photoMoveOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePhotoMoveModal() {
  document.getElementById('photoMoveOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentPhotoModalDesignId = null;
  loadDesigns();
}

function updateAddPhotoLabel(input) {
  const lbl = document.getElementById('addPhotoLabel');
  if (!lbl) return;
  if (input.files && input.files.length > 0) {
    lbl.textContent = input.files.length === 1
      ? input.files[0].name
      : `${input.files.length} photos selected`;
  } else {
    lbl.textContent = 'No files selected';
  }
}

async function addPhotosToDesign() {
  const designId = currentPhotoModalDesignId;
  if (!designId) return;
  const input = document.getElementById('addPhotoInput');
  if (!input || !input.files || input.files.length === 0) {
    showToast('Please choose at least one photo first.', 'error');
    return;
  }
  const btn = document.getElementById('addPhotoBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
  try {
    const fd = new FormData();
    for (const file of input.files) fd.append('images', file);
    const res  = await fetch(`/admin/designs/${designId}`, { method: 'PATCH', body: fd });
    const json = await res.json();
    if (json.success) {
      showToast(`${input.files.length === 1 ? 'Photo' : input.files.length + ' photos'} added!`, 'success');
      // Re-open modal with refreshed photos
      closePhotoMoveModal();
      setTimeout(() => openPhotoMoveModal(designId), 400);
    } else {
      showToast(json.error || 'Upload failed.', 'error');
    }
  } catch {
    showToast('Could not upload photos.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Upload'; }
  }
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

// ── Set Main Photo ────────────────────────────────────────
async function setMainPhoto(designId, imageIndex) {
  try {
    const res = await fetch(`/admin/designs/${designId}/set-main-image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIndex })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Main photo updated!', 'success');
      closePhotoMoveModal();
      setTimeout(() => openPhotoMoveModal(designId), 400);
    } else {
      showToast(json.error || 'Could not set main photo.', 'error');
    }
  } catch {
    showToast('Could not set main photo.', 'error');
  }
}

// ── Remove a single photo from a design ───────────────────
async function removePhoto(designId, imageIndex, isLastPhoto) {
  const msg = isLastPhoto
    ? 'This is the only photo for this design. Removing it will permanently delete the entire design. Continue?'
    : 'Remove this photo? This cannot be undone.';
  if (!confirm(msg)) return;

  if (isLastPhoto) {
    // Delete the whole design
    try {
      const res = await fetch(`/admin/designs/${designId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Photo and design deleted.', 'success');
        closePhotoMoveModal();
      } else {
        showToast('Could not delete design.', 'error');
      }
    } catch {
      showToast('Could not delete design.', 'error');
    }
  } else {
    // Delete just this image
    try {
      const res  = await fetch(`/admin/designs/${designId}/images/${imageIndex}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Photo removed.', 'success');
        closePhotoMoveModal();
        setTimeout(() => openPhotoMoveModal(designId), 400);
      } else {
        showToast(json.error || 'Could not remove photo.', 'error');
      }
    } catch {
      showToast('Could not remove photo.', 'error');
    }
  }
}

// ── Hero Photos Picker ────────────────────────────────────
let heroSelectedPhotos = [];
let heroCachedPhotos = [];

async function loadHeroPhotoPicker() {
  const picker = document.getElementById('heroPhotoPicker');
  if (!picker) return;

  // Load current hero photos + hero-specific uploads from settings
  let heroUploads = [];
  try {
    const sr = await fetch('/api/settings');
    const s  = await sr.json();
    heroSelectedPhotos = Array.isArray(s.heroPhotos) ? [...s.heroPhotos] : [];
    heroUploads        = Array.isArray(s.heroUploads) ? [...s.heroUploads] : [];
  } catch { heroSelectedPhotos = []; }

  // Update preview slots
  updateHeroPreview();

  // Load all design photos for picker
  try {
    const dr = await fetch('/admin/designs');
    const ds = await dr.json();
    if (!Array.isArray(ds)) {
      picker.innerHTML = '<div style="grid-column:1/-1;color:#dc2626;text-align:center;padding:20px;">Could not load photos — please sign out and back in.</div>';
      return;
    }
    const allPhotos = [];
    // Hero-specific uploads appear first
    heroUploads.forEach(url => { if (url && !allPhotos.includes(url)) allPhotos.push(url); });
    ds.forEach(d => {
      const imgs = d.images && d.images.length > 0 ? d.images : (d.image ? [d.image] : []);
      imgs.forEach(url => { if (url && !allPhotos.includes(url)) allPhotos.push(url); });
    });
    heroCachedPhotos = allPhotos;

    if (allPhotos.length === 0) {
      picker.innerHTML = '<div style="grid-column:1/-1;color:var(--text-light);text-align:center;padding:20px;">No photos yet — upload one above or add design photos first.</div>';
      return;
    }

    renderHeroPickerGrid();
  } catch {
    picker.innerHTML = '<div style="grid-column:1/-1;color:#dc2626;text-align:center;padding:20px;">Could not load photos.</div>';
  }
}

// Upload a brand-new photo straight to the hero banner
function updateHeroUploadLabel(input) {
  const lbl = document.getElementById('heroUploadLabel');
  if (lbl) lbl.textContent = input.files.length > 0 ? input.files[0].name : 'No file selected';
}

async function uploadNewHeroPhoto() {
  const input = document.getElementById('heroPhotoUploadInput');
  if (!input || !input.files.length) {
    showToast('Please choose a photo first.', 'error');
    return;
  }
  const btn = document.getElementById('heroUploadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
  try {
    const fd = new FormData();
    fd.append('photo', input.files[0]);
    const res  = await fetch('/admin/settings/hero-photos/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) {
      heroSelectedPhotos = Array.isArray(json.heroPhotos) ? json.heroPhotos : heroSelectedPhotos;
      if (!heroCachedPhotos.includes(json.url)) heroCachedPhotos.unshift(json.url);
      updateHeroPreview();
      renderHeroPickerGrid();
      input.value = '';
      const lbl = document.getElementById('heroUploadLabel');
      if (lbl) lbl.textContent = 'No file selected';
      const status = document.getElementById('heroSaveStatus');
      if (status) status.textContent = `${heroSelectedPhotos.length} photo${heroSelectedPhotos.length !== 1 ? 's' : ''} saved ✓`;
      showToast('Photo uploaded and added to hero!', 'success');
    } else {
      showToast(json.error || 'Upload failed.', 'error');
    }
  } catch {
    showToast('Could not upload photo.', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Upload Photo'; }
}

// Reset (clear) all hero photos
async function resetHeroPhotos() {
  if (!confirm('Remove all hero photos? The fan on the homepage will be hidden until you add photos again.')) return;
  try {
    const res  = await fetch('/admin/settings/hero-photos', { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      heroSelectedPhotos = [];
      updateHeroPreview();
      renderHeroPickerGrid();
      const status = document.getElementById('heroSaveStatus');
      if (status) status.textContent = '';
      showToast('Hero photos cleared.', 'success');
    } else {
      showToast('Could not reset hero photos.', 'error');
    }
  } catch {
    showToast('Could not reset hero photos.', 'error');
  }
}

function renderHeroPickerGrid() {
  const picker = document.getElementById('heroPhotoPicker');
  if (!picker) return;
  if (heroCachedPhotos.length === 0) return;
  picker.innerHTML = heroCachedPhotos.map(url => {
    const sel = heroSelectedPhotos.includes(url);
    const ord = heroSelectedPhotos.indexOf(url) + 1;
    return `
      <div class="hero-pick-item ${sel ? 'selected' : ''}" id="hpi-${btoa(url).replace(/=/g,'')}"
        onclick="toggleHeroPhoto('${escAttr(url)}')">
        <img src="${escHtml(url)}" alt="Design photo" loading="lazy" onerror="this.parentElement.style.display='none'">
        ${sel ? `<div class="pick-order">${ord}</div>` : ''}
      </div>`;
  }).join('');
}

function toggleHeroPhoto(url) {
  const idx = heroSelectedPhotos.indexOf(url);
  if (idx > -1) {
    heroSelectedPhotos.splice(idx, 1);
  } else {
    if (heroSelectedPhotos.length >= 5) {
      showToast('Maximum 5 hero photos. Deselect one first.', 'error');
      return;
    }
    heroSelectedPhotos.push(url);
  }
  updateHeroPreview();
  // Re-render grid using cached photos — no server round-trip
  renderHeroPickerGrid();
}

function updateHeroPreview() {
  const labels = ['Photo 1', 'Photo 2', 'Photo 3', 'Photo 4', 'Photo 5'];
  for (let i = 0; i < 5; i++) {
    const slot = document.getElementById('heroSlot' + i);
    if (!slot) continue;
    const url = heroSelectedPhotos[i];
    if (url) {
      slot.innerHTML = `<img src="${escHtml(url)}" alt="Hero photo ${i+1}"><div class="slot-label">${labels[i]}</div>`;
      slot.classList.remove('empty');
    } else {
      slot.innerHTML = `<span>${i+1}</span>`;
      slot.classList.add('empty');
    }
  }
}

async function saveHeroPhotos() {
  const btn    = document.getElementById('heroSaveBtn');
  const status = document.getElementById('heroSaveStatus');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  if (status) status.textContent = '';
  try {
    const res  = await fetch('/admin/settings/hero-photos', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ photos: heroSelectedPhotos })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Hero photos saved!', 'success');
      if (status) status.textContent = `${heroSelectedPhotos.length} photo${heroSelectedPhotos.length !== 1 ? 's' : ''} saved ✓`;
    } else {
      showToast(json.error || 'Could not save.', 'error');
    }
  } catch {
    showToast('Could not save hero photos.', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Save Hero Photos'; }
}
