'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('Set JWT_SECRET to a random value at least 32 characters long.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Create a PostgreSQL database and set DATABASE_URL.');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
const ROOT = __dirname;
const uploadDir = path.join(ROOT, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir, { maxAge: '7d', fallthrough: false }));
app.use(express.static(ROOT, { index: 'index.html' }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please wait and try again.' } });
const upload = multer({
  storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadDir), filename: (_req, file, cb) => cb(null, `${Date.now()}-${require('crypto').randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(file.mimetype))
});
const cookieOptions = { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
function publicUser(u) { return { id: u.id, email: u.email, account_type: u.account_type, store_name: u.store_name, created_at: u.created_at }; }
function setToken(res, user) { const token = jwt.sign({ sub: String(user.id) }, JWT_SECRET, { expiresIn: '7d' }); res.cookie('kivora_session', token, cookieOptions); }
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.kivora_session;
    if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id,email,account_type,store_name,is_active,created_at FROM users WHERE id=$1', [payload.sub]);
    if (!result.rowCount || !result.rows[0].is_active) return res.status(401).json({ error: 'This account is unavailable. Please contact KIVORA support.' });
    req.user = result.rows[0]; next();
  } catch (_err) { return res.status(401).json({ error: 'Your session has expired. Please log in again.' }); }
}
function requireSeller(req, res, next) { if (!['seller','admin'].includes(req.user.account_type)) return res.status(403).json({ error: 'A seller account is required to list products.' }); next(); }
function requireAdmin(req, res, next) { if (req.user.account_type !== 'admin') return res.status(403).json({ error: 'Admin access required.' }); next(); }

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'KIVORA API' }));
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const requestedRole = req.body.account_type === 'seller' ? 'seller' : 'buyer';
    const storeName = String(req.body.store_name || '').trim().slice(0, 80) || null;
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (password.length > 72) return res.status(400).json({ error: 'Password is too long.' });
    const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase() ? 'admin' : requestedRole;
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO users(email,password_hash,account_type,store_name) VALUES($1,$2,$3,$4) RETURNING id,email,account_type,store_name,created_at', [email, hash, role, role === 'seller' ? storeName : null]);
    setToken(res, result.rows[0]); res.status(201).json({ user: publicUser(result.rows[0]), message: 'Your KIVORA account has been created.' });
  } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists. Please log in.' }); console.error(err); res.status(500).json({ error: 'Could not create your account. Please try again.' }); }
});
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase(); const password = String(req.body.password || '');
    const result = await pool.query('SELECT id,email,password_hash,account_type,store_name,is_active,created_at FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    if (!user.is_active) return res.status(403).json({ error: 'This account has been suspended. Contact KIVORA support.' });
    setToken(res, user); res.json({ user: publicUser(user), message: 'Welcome back to KIVORA.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed. Please try again.' }); }
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('kivora_session', { ...cookieOptions, maxAge: undefined }); res.json({ message: 'You have been logged out.' }); });

app.get('/api/products', async (req, res) => {
  try { const q = `%${String(req.query.q || '').slice(0,80)}%`; const category = String(req.query.category || 'All');
    const result = await pool.query(`SELECT p.id,p.name,p.category,p.price,p.description,p.image_url,p.store_name,p.created_at FROM products p WHERE p.is_active=TRUE AND ($1='All' OR p.category=$1) AND (p.name ILIKE $2 OR p.category ILIKE $2 OR p.store_name ILIKE $2) ORDER BY p.created_at DESC LIMIT 100`, [category,q]); res.json({ products: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Could not load products.' }); }
});
app.post('/api/products', requireAuth, requireSeller, (req, res, next) => upload.single('image')(req,res,err => { if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : 'Use a JPG, PNG or WEBP image.' }); next(); }), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    if (!name || !category || !description || !req.file || !Number.isFinite(Number(price)) || Number(price) <= 0) return res.status(400).json({ error: 'Complete all fields and choose a valid product photo.' });
    const imageUrl = `/uploads/${req.file.filename}`;
    const storeName = req.user.store_name || req.user.email;
    const result = await pool.query('INSERT INTO products(seller_id,name,category,price,description,image_url,store_name) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,category,price,description,image_url,store_name,created_at', [req.user.id, String(name).trim().slice(0,100), String(category).slice(0,40), Number(price), String(description).trim().slice(0,1000), imageUrl, storeName]);
    res.status(201).json({ product: result.rows[0], message: 'Your product has been published on KIVORA.' });
  } catch (err) { if (req.file) fs.unlink(req.file.path, () => {}); console.error(err); res.status(500).json({ error: 'Could not save this product.' }); }
});
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try { const result = await pool.query('UPDATE products SET is_active=FALSE WHERE id=$1 AND (seller_id=$2 OR $3=TRUE) RETURNING id', [req.params.id, req.user.id, req.user.account_type === 'admin']); if (!result.rowCount) return res.status(404).json({ error: 'Product not found or you cannot remove it.' }); res.json({ message: 'Product removed.' }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Could not remove product.' }); }
});

app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
  try { const [users, products] = await Promise.all([pool.query('SELECT id,email,account_type,is_active,created_at FROM users ORDER BY created_at DESC LIMIT 250'), pool.query('SELECT id,name,category,price,image_url,store_name,is_active,created_at FROM products ORDER BY created_at DESC LIMIT 250')]); res.json({ users: users.rows, products: products.rows }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Could not load admin dashboard.' }); }
});
app.patch('/api/admin/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try { const active = req.body.is_active === true; if (String(req.params.id) === String(req.user.id) && !active) return res.status(400).json({ error: 'You cannot suspend your own admin account.' }); const r = await pool.query('UPDATE users SET is_active=$1 WHERE id=$2 AND account_type <> \'admin\' RETURNING id,email,is_active', [active, req.params.id]); if (!r.rowCount) return res.status(404).json({ error: 'User not found or cannot be changed.' }); res.json({ user: r.rows[0] }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Could not update account.' }); }
});
app.patch('/api/admin/products/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try { const r = await pool.query('UPDATE products SET is_active=$1 WHERE id=$2 RETURNING id,is_active', [req.body.is_active === true, req.params.id]); if (!r.rowCount) return res.status(404).json({ error: 'Product not found.' }); res.json({ product: r.rows[0] }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Could not update product.' }); }
});

app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' }); res.sendFile(path.join(ROOT, 'index.html'), err => { if (err) next(err); }); });
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Unexpected server error.' }); });
(async () => { try { await pool.query('SELECT 1'); console.log('KIVORA database connected.'); app.listen(PORT, () => console.log(`KIVORA running on port ${PORT}`)); } catch (err) { console.error('Database connection failed:', err.message); process.exit(1); } })();
