import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'luminous_letters_secret_change_me';
const DATA_FILE = path.join(__dirname, '..', 'data', 'db.json');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const CLIENT_BUILD = path.join(__dirname, '..', '..', 'client', 'dist');

const app = express();
const DEFAULT_CORS_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://luminous-letters.onrender.com'
]);
const EXTRA_CORS_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const ALLOWED_CORS_ORIGINS = new Set([...DEFAULT_CORS_ORIGINS, ...EXTRA_CORS_ORIGINS]);

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl, server-to-server, same-origin without Origin header
  if (process.env.ALLOW_ALL_CORS === 'true') return true;
  if (ALLOWED_CORS_ORIGINS.has(origin)) return true;

  try {
    const url = new URL(origin);
    if (url.hostname.endsWith('.onrender.com') || url.hostname === 'onrender.com') return true;
  } catch {
    // ignore invalid origins
  }

  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOAD_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_')}`)
  })
});

const now = () => new Date().toISOString();
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function baseSettings() {
  return { theme: 'midnight', accent: '#8b5cf6', radius: 18, compact: false, pageBg: '', logoUrl: '' };
}

function defaults() {
  const t = now();
  return {
    users: [],
    cards: [],
    papers: [],
    envelopes: [],
    settings: baseSettings(),
    meta: { createdAt: t, updatedAt: t }
  };
}

function seedDb() {
  const adminHash = bcrypt.hashSync('admin123!', 10);
  const userHash = bcrypt.hashSync('luX007', 10);
  const t = now();
  return {
    users: [
      { id: 'u_admin', username: 'admin', passwordHash: adminHash, role: 'admin', displayName: 'Administrador', createdAt: t, updatedAt: t },
      { id: 'u_user', username: 'luana', passwordHash: userHash, role: 'viewer', displayName: 'Luana', createdAt: t, updatedAt: t }
    ],
    cards: [
      {
        id: 'c_demo',
        title: 'Carta de bienvenida',
        content: 'Bienvenido a Luminous Letters. Aquí podrás crear cartas bonitas, guardar sobres, reutilizar hojas y personalizar cada detalle visual.',
        fontFamily: 'Inter',
        fontSize: 18,
        lineHeight: 1.7,
        bold: false,
        italic: false,
        underline: false,
        textColor: '#f8fafc',
        cardColor: '#161b2e',
        backgroundImageUrl: '',
        logoImageUrl: '',
        sealImageUrl: '',
        paperId: 'p_letter',
        envelopeId: 'e_night',
        paperName: 'Papel premium',
        envelopeName: 'Sobre nocturno',
        paperColor: '#f8f1e4',
        envelopeColor: '#1e293b',
        paperDesignImageUrl: '',
        envelopeDesignImageUrl: '',
        createdAt: t,
        updatedAt: t
      }
    ],
    papers: [
      {
        id: 'p_letter',
        name: 'Papel premium',
        description: 'Textura suave para cartas formales y elegantes.',
        color: '#f8f1e4',
        designImageUrl: '',
        createdAt: t,
        updatedAt: t
      },
      {
        id: 'p_nature',
        name: 'Papel natural',
        description: 'Tono beige claro con estilo cálido.',
        color: '#f4e7d3',
        designImageUrl: '',
        createdAt: t,
        updatedAt: t
      }
    ],
    envelopes: [
      {
        id: 'e_night',
        name: 'Sobre nocturno',
        description: 'Oscuro y moderno para cartas premium.',
        color: '#1e293b',
        designImageUrl: '',
        createdAt: t,
        updatedAt: t
      },
      {
        id: 'e_rose',
        name: 'Sobre rosado',
        description: 'Más suave y romántico.',
        color: '#b48ab9',
        designImageUrl: '',
        createdAt: t,
        updatedAt: t
      }
    ],
    settings: baseSettings(),
    meta: { createdAt: t, updatedAt: t }
  };
}

async function ensureStorage() {
  await fs.mkdir(path.join(__dirname, '..', 'data'), { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try { await fs.access(DATA_FILE); }
  catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(seedDb(), null, 2));
    return;
  }
  const db = await readDb();
  await writeDb(normalizeDb(db));
}

async function readDb() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return normalizeDb(JSON.parse(raw));
}

async function writeDb(db) {
  const normalized = normalizeDb(db);
  normalized.meta.updatedAt = now();
  await fs.writeFile(DATA_FILE, JSON.stringify(normalized, null, 2));
}

function normalizeDb(db) {
  const base = defaults();
  const t = now();
  const ensureIds = (items, prefix) => (Array.isArray(items) ? items.map((item) => ({
    ...item,
    id: item?.id && String(item.id).trim() ? String(item.id) : uid(prefix),
  })) : []);
  const out = {
    ...base,
    ...db,
    users: Array.isArray(db?.users) ? db.users : [],
    cards: Array.isArray(db?.cards) ? db.cards : [],
    papers: Array.isArray(db?.papers) ? db.papers : [],
    envelopes: Array.isArray(db?.envelopes) ? db.envelopes : [],
    settings: { ...base.settings, ...(db?.settings || {}) },
    meta: { ...base.meta, ...(db?.meta || {}) }
  };

  if (!out.users.some((u) => u.username === 'admin')) {
    out.users.unshift({
      id: 'u_admin',
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123!', 10),
      role: 'admin',
      displayName: 'Administrador',
      createdAt: t,
      updatedAt: t
    });
  }
  if (!out.users.some((u) => String(u.username || '').toLowerCase() === 'luana')) {
    out.users.push({
      id: 'u_user',
      username: 'luana',
      passwordHash: bcrypt.hashSync('luX007', 10),
      role: 'viewer',
      displayName: 'Luana',
      createdAt: t,
      updatedAt: t
    });
  }

  out.cards = ensureIds(out.cards, 'c').map((c) => ({
    paperDesignImageUrl: '',
    envelopeDesignImageUrl: '',
    ...c,
    id: c.id,
    paperColor: c.paperColor || '',
    envelopeColor: c.envelopeColor || '',
    backgroundImageUrl: c.backgroundImageUrl || '',
    logoImageUrl: c.logoImageUrl || '',
    sealImageUrl: c.sealImageUrl || '',
    createdAt: c.createdAt || t,
    updatedAt: c.updatedAt || t
  }));
  out.papers = ensureIds(out.papers, 'p').map((p) => ({
    designImageUrl: '',
    ...p,
    id: p.id,
    createdAt: p.createdAt || t,
    updatedAt: p.updatedAt || t
  }));
  out.envelopes = ensureIds(out.envelopes, 'e').map((e) => ({
    designImageUrl: '',
    ...e,
    id: e.id,
    createdAt: e.createdAt || t,
    updatedAt: e.updatedAt || t
  }));
  return out;
}

function auth(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Sesión inválida' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Permisos insuficientes' });
  next();
}

function signUser(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, displayName: user.displayName || user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno' });
});

app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const db = await readDb();
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const user = db.users.find((u) => String(u.username || '').trim().toLowerCase() === normalizedUsername);
  if (!user) return res.status(401).json({ message: 'Credenciales incorrectas' });
  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Credenciales incorrectas' });
  const token = signUser(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { id: user.id, username: user.username, role: user.role, displayName: user.displayName || user.username } });
}));

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { path: '/', sameSite: 'lax' });
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));

app.get('/api/settings', wrap(async (_, res) => {
  const db = await readDb();
  res.json(db.settings);
}));

app.put('/api/settings', auth, wrap(async (req, res) => {
  const db = await readDb();
  db.settings = { ...db.settings, ...(req.body || {}) };
  await writeDb(db);
  res.json(db.settings);
}));

app.post('/api/uploads/image', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Archivo requerido' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

function listRoutes(entity, options = {}) {
  const adminOnly = options.adminOnly ?? true;
  const getHandler = wrap(async (_, res) => { const db = await readDb(); res.json(db[entity]); });
  const createHandler = wrap(async (req, res) => {
    const db = await readDb();
    const t = now();
    const body = { ...(req.body || {}) };
    delete body.id;
    const item = { ...body, id: uid(entity.slice(0, 1)), createdAt: t, updatedAt: t };
    db[entity].unshift(item);
    await writeDb(db);
    res.json(item);
  });
  const updateHandler = wrap(async (req, res) => {
    const db = await readDb();
    const idx = db[entity].findIndex((i) => i.id === req.params.id);
    if (idx < 0) return res.status(404).json({ message: 'No encontrado' });
    db[entity][idx] = { ...db[entity][idx], ...(req.body || {}), id: req.params.id, updatedAt: now() };
    await writeDb(db);
    res.json(db[entity][idx]);
  });
  const deleteHandler = wrap(async (req, res) => {
    const db = await readDb();
    db[entity] = db[entity].filter((i) => i.id !== req.params.id);
    await writeDb(db);
    res.json({ ok: true });
  });

  app.get(`/api/${entity}`, auth, getHandler);
  app.post(`/api/${entity}`, auth, ...(adminOnly ? [requireAdmin] : []), createHandler);
  app.put(`/api/${entity}/:id`, auth, ...(adminOnly ? [requireAdmin] : []), updateHandler);
  app.delete(`/api/${entity}/:id`, auth, ...(adminOnly ? [requireAdmin] : []), deleteHandler);
}

listRoutes('cards', { adminOnly: true });
listRoutes('papers', { adminOnly: true });
listRoutes('envelopes', { adminOnly: true });

app.get('/api/health', (_, res) => res.json({ ok: true }));

if (process.env.NODE_ENV === 'production' && await fs.access(CLIENT_BUILD).then(() => true).catch(() => false)) {
  app.use(express.static(CLIENT_BUILD));
  app.get('*', (_, res) => res.sendFile(path.join(CLIENT_BUILD, 'index.html')));
}

await ensureStorage();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
