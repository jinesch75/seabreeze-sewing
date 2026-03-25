// ============================================================
//  Sea Breeze Sewing BDA — Server
//  Built with Express.js
// ============================================================
//
//  ADMIN PASSWORD: Change this to something secure!
//  Default: seabreeze2024
//
const ADMIN_PASSWORD = 'seabreeze2024';

const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Paths ──────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const DESIGNS_FILE  = path.join(DATA_DIR, 'designs.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'images', 'uploads');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Helpers ────────────────────────────────────────────────
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── Multer (image uploads) ─────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase())
            && allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only image files allowed'), ok);
  }
});

// ── Middleware ─────────────────────────────────────────────
// Trust Railway's reverse proxy so secure cookies work on HTTPS
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'sbs-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ── Auth helper ────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════

// GET all designs (sorted newest first)
app.get('/api/designs', (req, res) => {
  const designs = readJSON(DESIGNS_FILE);
  designs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(designs);
});

// GET public settings (about photo, etc.)
app.get('/api/settings', (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  if (!Array.isArray(settings)) {
    res.json(settings || {});
  } else {
    res.json({});
  }
});

// GET featured designs only
app.get('/api/designs/featured', (req, res) => {
  const designs = readJSON(DESIGNS_FILE);
  const featured = designs
    .filter(d => d.featured)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  res.json(featured);
});

// POST a contact / purchase inquiry
app.post('/api/contact', (req, res) => {
  const { name, email, phone, item, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  const contacts = readJSON(CONTACTS_FILE);
  const entry = {
    id: Date.now().toString(),
    name, email,
    phone: phone || '',
    item:  item  || 'General inquiry',
    message,
    createdAt: new Date().toISOString(),
    read: false
  };
  contacts.unshift(entry);
  writeJSON(CONTACTS_FILE, contacts);
  res.json({ success: true, message: 'Thank you! Your message has been received.' });
});

// ════════════════════════════════════════════════════════════
//  ADMIN API  (all routes require session auth)
// ════════════════════════════════════════════════════════════

// POST login
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Incorrect password.' });
  }
});

// POST logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET session status
app.get('/admin/status', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// GET admin settings
app.get('/admin/settings', requireAdmin, (req, res) => {
  const s = readJSON(SETTINGS_FILE);
  res.json((!s || Array.isArray(s)) ? {} : s);
});

// POST upload about/profile photo
app.post('/admin/settings/about-photo', requireAdmin, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });
  const url = '/images/uploads/' + req.file.filename;
  let s = readJSON(SETTINGS_FILE);
  if (!s || Array.isArray(s)) s = {};
  s.aboutPhoto = url;
  writeJSON(SETTINGS_FILE, s);
  res.json({ success: true, url });
});

// DELETE about photo
app.delete('/admin/settings/about-photo', requireAdmin, (req, res) => {
  let s = readJSON(SETTINGS_FILE);
  if (!s || Array.isArray(s)) s = {};
  if (s.aboutPhoto && s.aboutPhoto.startsWith('/images/uploads/')) {
    const fp = path.join(__dirname, 'public', s.aboutPhoto);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  s.aboutPhoto = null;
  writeJSON(SETTINGS_FILE, s);
  res.json({ success: true });
});

// POST upload workshop / homepage photo
app.post('/admin/settings/workshop-photo', requireAdmin, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });
  const url = '/images/uploads/' + req.file.filename;
  let s = readJSON(SETTINGS_FILE);
  if (!s || Array.isArray(s)) s = {};
  // Remove old file if it was an upload
  if (s.workshopPhoto && s.workshopPhoto.startsWith('/images/uploads/')) {
    const old = path.join(__dirname, 'public', s.workshopPhoto);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  s.workshopPhoto = url;
  writeJSON(SETTINGS_FILE, s);
  res.json({ success: true, url });
});

// DELETE workshop photo
app.delete('/admin/settings/workshop-photo', requireAdmin, (req, res) => {
  let s = readJSON(SETTINGS_FILE);
  if (!s || Array.isArray(s)) s = {};
  if (s.workshopPhoto && s.workshopPhoto.startsWith('/images/uploads/')) {
    const fp = path.join(__dirname, 'public', s.workshopPhoto);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  s.workshopPhoto = null;
  writeJSON(SETTINGS_FILE, s);
  res.json({ success: true });
});

// PATCH set main/primary image for a design (moves chosen index to position 0)
app.patch('/admin/designs/:id/set-main-image', requireAdmin, (req, res) => {
  const { imageIndex } = req.body;
  const designs = readJSON(DESIGNS_FILE);
  const idx = designs.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Design not found.' });
  const images = [...(designs[idx].images || [designs[idx].image])];
  const imgIdx = parseInt(imageIndex, 10);
  if (imgIdx < 0 || imgIdx >= images.length) return res.status(400).json({ error: 'Invalid image index.' });
  const [selected] = images.splice(imgIdx, 1);
  images.unshift(selected);
  designs[idx].images = images;
  designs[idx].image  = images[0];
  writeJSON(DESIGNS_FILE, designs);
  res.json({ success: true });
});

// GET categories list (public)
app.get('/api/categories', (req, res) => {
  const s = readJSON(SETTINGS_FILE);
  res.json((!s || Array.isArray(s)) ? [] : (s.categories || []));
});

// POST add category (admin)
app.post('/admin/settings/categories', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name required.' });
  let s = readJSON(SETTINGS_FILE);
  if (!s || Array.isArray(s)) s = {};
  if (!s.categories) s.categories = [];
  const clean = name.trim();
  if (!s.categories.includes(clean)) s.categories.push(clean);
  writeJSON(SETTINGS_FILE, s);
  res.json({ success: true, categories: s.categories });
});

// DELETE a category (admin)
app.delete('/admin/settings/categories/:name', requireAdmin, (req, res) => {
  let s = readJSON(SETTINGS_FILE);
  if (!s || Array.isArray(s)) s = {};
  s.categories = (s.categories || []).filter(c => c !== decodeURIComponent(req.params.name));
  writeJSON(SETTINGS_FILE, s);
  res.json({ success: true, categories: s.categories });
});

// PUT/replace hero photos array (admin) — up to 4 photo URLs
app.put('/admin/settings/hero-photos', requireAdmin, (req, res) => {
  const { photos } = req.body;
  if (!Array.isArray(photos)) return res.status(400).json({ error: 'photos must be an array.' });
  let s = readJSON(SETTINGS_FILE);
  if (!s || Array.isArray(s)) s = {};
  s.heroPhotos = photos.slice(0, 5);
  writeJSON(SETTINGS_FILE, s);
  res.json({ success: true, heroPhotos: s.heroPhotos });
});

// PATCH move a single image from one design to another
app.patch('/admin/designs/:sourceId/move-image', requireAdmin, (req, res) => {
  const { imageIndex, targetDesignId } = req.body;
  if (imageIndex === undefined || !targetDesignId) {
    return res.status(400).json({ error: 'imageIndex and targetDesignId are required.' });
  }
  const designs = readJSON(DESIGNS_FILE);
  const srcIdx = designs.findIndex(d => d.id === req.params.sourceId);
  const tgtIdx = designs.findIndex(d => d.id === targetDesignId);
  if (srcIdx === -1) return res.status(404).json({ error: 'Source design not found.' });
  if (tgtIdx === -1) return res.status(404).json({ error: 'Target design not found.' });

  const srcImages = [...(designs[srcIdx].images || [designs[srcIdx].image])];
  const imgIdx    = parseInt(imageIndex, 10);
  if (imgIdx < 0 || imgIdx >= srcImages.length) {
    return res.status(400).json({ error: 'Invalid image index.' });
  }

  const willDeleteSource = srcImages.length === 1;

  // Move photo to target
  const [movedUrl] = srcImages.splice(imgIdx, 1);
  const tgtImages = [...(designs[tgtIdx].images || [designs[tgtIdx].image])];
  tgtImages.push(movedUrl);
  designs[tgtIdx].images = tgtImages;
  designs[tgtIdx].image  = tgtImages[0];

  if (willDeleteSource) {
    // Source has no images left — delete the design entirely
    designs.splice(srcIdx, 1);
  } else {
    designs[srcIdx].images = srcImages;
    designs[srcIdx].image  = srcImages[0] || '';
  }

  writeJSON(DESIGNS_FILE, designs);
  res.json({ success: true, sourceDeleted: willDeleteSource });
});

// GET all designs (admin — includes full data)
app.get('/admin/designs', requireAdmin, (req, res) => {
  const designs = readJSON(DESIGNS_FILE);
  designs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(designs);
});

// POST new design (with one or more images)
app.post('/admin/designs', requireAdmin, upload.array('images', 10), (req, res) => {
  const { title, description, category, featured, price, isNew } = req.body;
  if (!title || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Title and at least one image are required.' });
  }
  const imageUrls = req.files.map(f => '/images/uploads/' + f.filename);
  const designs = readJSON(DESIGNS_FILE);
  const newDesign = {
    id:          Date.now().toString(),
    title,
    description: description || '',
    category:    category    || 'Other',
    price:       price       || '',
    image:       imageUrls[0],   // primary image (first uploaded)
    images:      imageUrls,      // all images
    featured:    featured === 'true' || featured === true,
    isNew:       isNew === 'true' || isNew === true,
    createdAt:   new Date().toISOString()
  };
  designs.push(newDesign);
  writeJSON(DESIGNS_FILE, designs);
  res.json({ success: true, design: newDesign });
});

// PATCH update design (title, description, category, featured, price; optionally add more images)
app.patch('/admin/designs/:id', requireAdmin, upload.array('images', 10), (req, res) => {
  const designs = readJSON(DESIGNS_FILE);
  const idx = designs.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Design not found.' });
  const { title, description, category, featured, price, isNew } = req.body;
  if (title)       designs[idx].title       = title;
  if (description !== undefined) designs[idx].description = description;
  if (category)    designs[idx].category    = category;
  if (price !== undefined) designs[idx].price = price;
  if (featured !== undefined) designs[idx].featured = featured === 'true' || featured === true;
  if (isNew !== undefined) designs[idx].isNew = isNew === 'true' || isNew === true;
  // Append any newly uploaded images
  if (req.files && req.files.length > 0) {
    const newUrls = req.files.map(f => '/images/uploads/' + f.filename);
    const existing = designs[idx].images || [designs[idx].image];
    designs[idx].images = [...existing, ...newUrls];
    designs[idx].image  = designs[idx].images[0];
  }
  // Ensure images array always exists
  if (!designs[idx].images) {
    designs[idx].images = [designs[idx].image];
  }
  writeJSON(DESIGNS_FILE, designs);
  res.json({ success: true, design: designs[idx] });
});

// DELETE a single image from a design
app.delete('/admin/designs/:id/images/:imgIndex', requireAdmin, (req, res) => {
  const designs = readJSON(DESIGNS_FILE);
  const idx = designs.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Design not found.' });
  const imgIdx = parseInt(req.params.imgIndex, 10);
  const images = designs[idx].images || [designs[idx].image];
  if (imgIdx < 0 || imgIdx >= images.length) return res.status(400).json({ error: 'Invalid image index.' });
  // Remove image file if it is an upload
  const imgPath = images[imgIdx];
  if (imgPath && imgPath.startsWith('/images/uploads/')) {
    const filePath = path.join(__dirname, 'public', imgPath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  images.splice(imgIdx, 1);
  designs[idx].images = images;
  designs[idx].image  = images[0] || '';
  writeJSON(DESIGNS_FILE, designs);
  res.json({ success: true });
});

// DELETE a design (also removes all uploaded image files)
app.delete('/admin/designs/:id', requireAdmin, (req, res) => {
  const designs = readJSON(DESIGNS_FILE);
  const idx = designs.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Design not found.' });
  const removed = designs.splice(idx, 1)[0];
  // Remove all uploaded image files
  const allImages = removed.images || (removed.image ? [removed.image] : []);
  allImages.forEach(imgUrl => {
    if (imgUrl && imgUrl.startsWith('/images/uploads/')) {
      const imgPath = path.join(__dirname, 'public', imgUrl);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
  });
  writeJSON(DESIGNS_FILE, designs);
  res.json({ success: true });
});

// GET all contact inquiries
app.get('/admin/contacts', requireAdmin, (req, res) => {
  res.json(readJSON(CONTACTS_FILE));
});

// PATCH mark inquiry as read
app.patch('/admin/contacts/:id/read', requireAdmin, (req, res) => {
  const contacts = readJSON(CONTACTS_FILE);
  const idx = contacts.findIndex(c => c.id === req.params.id);
  if (idx !== -1) { contacts[idx].read = true; writeJSON(CONTACTS_FILE, contacts); }
  res.json({ success: true });
});

// DELETE a contact inquiry
app.delete('/admin/contacts/:id', requireAdmin, (req, res) => {
  const contacts = readJSON(CONTACTS_FILE);
  const idx = contacts.findIndex(c => c.id === req.params.id);
  if (idx !== -1) { contacts.splice(idx, 1); writeJSON(CONTACTS_FILE, contacts); }
  res.json({ success: true });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌊 Sea Breeze Sewing BDA is running!`);
  console.log(`   Open http://localhost:${PORT} in your browser\n`);
});
