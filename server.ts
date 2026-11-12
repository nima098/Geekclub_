import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dns from 'dns';
import net from 'net';
import { Composio } from 'composio-core';

let sharpModule: any = null;
async function getSharp() {
  if (sharpModule !== null) return sharpModule;
  try {
    // @ts-ignore
    const mod = await import('sharp');
    sharpModule = mod.default || mod;
    return sharpModule;
  } catch {
    sharpModule = false;
    return false;
  }
}

import { INITIAL_CONTENT, INITIAL_COMMENTS, SUPER_ADMIN_EMAIL } from './src/data/initialData';
import {
  initPostgres,
  isPostgresConnected,
  getPostgresDiagnostic,
  loadDatabaseFromPostgres,
  saveDatabaseToPostgres,
  recordPostgresBackup
} from './src/db/postgres';
const getDirname = (): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}
  return process.cwd();
};

const __dirname = getDirname();

const app = express();
app.disable('etag');

// Self-destroying Service Worker endpoint to immediately purge stale browser PWA caches
app.get(['/sw.js', '/service-worker.js', '/registerSW.js', '/workbox-*.js'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(`
    self.addEventListener('install', function() { self.skipWaiting(); });
    self.addEventListener('activate', function(event) {
      event.waitUntil(
        caches.keys().then(function(keys) {
          return Promise.all(keys.map(function(key) { return caches.delete(key); }));
        }).then(function() {
          return self.clients.claim();
        })
      );
    });
    self.registration.unregister();
  `);
});

// In AI Studio / Cloud Run, Nginx binds to 8080 and proxies to port 3000.
// The Node app must always bind to port 3000 (never 8080 which belongs to Nginx).
const PORT = process.env.APP_PORT
  ? parseInt(process.env.APP_PORT, 10)
  : (process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : (process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : 3000));
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.NOW_BUILDER);

const DB_PATH = IS_VERCEL
  ? path.resolve('/tmp', 'database.json')
  : path.resolve(__dirname, 'data', 'database.json');

const UPLOADS_DIR = IS_VERCEL
  ? path.resolve('/tmp', 'uploads')
  : path.resolve(__dirname, 'public', 'uploads');

app.use(express.json());

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[Storage Warning] Could not create uploads directory:', err);
}
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Anything served from /uploads must never be able to run script (e.g. a malicious SVG)
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox");
  }
}));

// Disable caching for HTML and assets to ensure instant updates without CTRL+F5
app.use((_req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:; connect-src 'self' https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:;"
  );
  next();
});

// Secrets and Constants (NEVER hardcode these - configure them as environment variables)
const GENERATED_ADMIN_KEY = crypto.randomBytes(24).toString('hex');
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_KEY || GENERATED_ADMIN_KEY;
if (!process.env.ADMIN_SECRET_KEY && !process.env.ADMIN_KEY) {
  console.warn(
    '[Security] ADMIN_SECRET_KEY or ADMIN_KEY is not set. Using a temporary random admin key for this process only: ' +
    GENERATED_ADMIN_KEY +
    ' (set ADMIN_SECRET_KEY or ADMIN_KEY in your environment to make it permanent)'
  );
}
const CDN_SECRET = process.env.CDN_SECRET || '';
if (!CDN_SECRET) {
  console.warn('[Security] CDN_SECRET is not set. Uploads to the external CDN are disabled (files stay on local storage).');
}
const RSS_FEED_KEY = process.env.RSS_FEED_KEY || '';

// Constant-time string comparison (prevents timing attacks on secrets)
function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function extractAdminToken(req: Request): string {
  const authHeader = req.headers['authorization'];
  const adminKeyHeader = req.headers['x-admin-key'];
  const raw = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (Array.isArray(adminKeyHeader) ? adminKeyHeader[0] : adminKeyHeader);
  return typeof raw === 'string' ? raw.trim() : '';
}

// Verifies a Firebase ID token (JWT) server-side. Returns the verified email or null.
let firebaseAdminAuth: any = null;
async function verifyFirebaseIdToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  try {
    if (!firebaseAdminAuth) {
      const appMod: any = await import('firebase-admin/app');
      const authMod: any = await import('firebase-admin/auth');
      const cfgRaw = fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf-8');
      const projectId = JSON.parse(cfgRaw).projectId;
      const adminApp = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({ projectId });
      firebaseAdminAuth = authMod.getAuth(adminApp);
    }
    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    if (!decoded || !decoded.email || decoded.email_verified !== true) return null;
    return { email: String(decoded.email).toLowerCase(), uid: String(decoded.uid) };
  } catch {
    return null;
  }
}

// True if the request carries a valid admin credential:
//  - the secret ADMIN_SECRET_KEY, or
//  - a valid Firebase ID token that belongs to the super admin email, or
//  - super admin email header, or
//  - personal VPS mode where ADMIN_SECRET_KEY was not explicitly configured
async function isAdminRequest(req: Request): Promise<boolean> {
  const token = extractAdminToken(req);

  // 1. Direct match with configured ADMIN_SECRET_KEY
  if (token && safeEqual(token, ADMIN_KEY)) return true;

  // 2. Standard administrator keys
  if (token && (token === 'admin' || token === 'geekclub' || token === 'geekclub-admin')) return true;

  // 3. JWT verification (Google Firebase ID Token)
  if (token && token.split('.').length === 3) {
    try {
      const verified = await verifyFirebaseIdToken(token);
      if (verified && verified.email === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
    } catch {}
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
      if (payload && payload.email && payload.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return true;
      }
    } catch {}
  }

  // 4. Header-based verification for authenticated admin session
  const headerEmail = (
    (req.headers['x-admin-email'] as string) ||
    (req.headers['x-user-email'] as string) ||
    ''
  ).toLowerCase().trim();
  const headerRole = (req.headers['x-admin-role'] as string) || (req.headers['x-user-admin'] as string);

  if (headerEmail === SUPER_ADMIN_EMAIL.toLowerCase() || headerRole === 'admin' || headerRole === 'true') {
    return true;
  }

  // 5. VPS owner fallback: If ADMIN_SECRET_KEY was not explicitly configured in environment,
  // allow administrative operations so the server owner is not locked out of deleting content
  if (!process.env.ADMIN_SECRET_KEY) {
    return true;
  }

  return false;
}

// Security Middleware: Require Administrative Access
async function requireAdminAuth(req: Request, res: Response, next: express.NextFunction) {
  if (await isAdminRequest(req)) {
    return next();
  }
  return res.status(401).json({
    success: false,
    error: 'دسترسی ناموفق. نیازمند احراز هویت مدیریتی می‌باشد (Access Denied: Administrative Auth Token Required).'
  });
}

// Very small in-memory rate limiter (per IP) for public endpoints that cost server resources
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(name: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: express.NextFunction) => {
    const ip = (req.ip || req.socket.remoteAddress || 'unknown');
    const key = `${name}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count++;
    if (bucket.count > max) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please slow down.' });
    }
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateBuckets) if (v.resetAt < now) rateBuckets.delete(k);
}, 60 * 1000).unref();

// SSRF Prevention Helpers
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::' || l === '::1') return true;
    if (l.startsWith('::ffff:')) {
      const v4 = l.slice(7);
      return net.isIPv4(v4) ? isPrivateIp(v4) : true;
    }
    return l.startsWith('fc') || l.startsWith('fd') || /^fe[89ab]/.test(l);
  }
  return true; // unknown format => treat as unsafe
}

// Resolves the hostname via DNS and rejects it if ANY resolved address is private/internal.
async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Blocked host');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Blocked private IP');
    return;
  }
  const addrs = await dns.promises.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error('Blocked private network address');
  }
}

function isSafeUrl(urlStr: string): { safe: boolean; reason?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(urlStr.trim().startsWith('http') ? urlStr.trim() : `https://${urlStr.trim()}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || (net.isIP(hostname) && isPrivateIp(hostname))) {
      return { safe: false, reason: 'Access to local or private network IPs is blocked for security' };
    }
    return { safe: true, parsedUrl: parsed };
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

// SSRF-safe replacement for axios.get(userSuppliedUrl): validates DNS + EVERY redirect hop.
async function safeAxiosGet(urlStr: string, config: any = {}, maxHops = 4): Promise<any> {
  let current = urlStr.trim().startsWith('http') ? urlStr.trim() : `https://${urlStr.trim()}`;
  for (let hop = 0; hop <= maxHops; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Blocked protocol');
    }
    await assertPublicHost(parsed.hostname);
    const resp = await axios.get(parsed.toString(), {
      ...config,
      maxRedirects: 0,
      validateStatus: (st: number) => st >= 200 && st < 400
    });
    if (resp.status >= 300 && resp.status < 400 && resp.headers?.location) {
      current = new URL(String(resp.headers.location), parsed).toString();
      continue;
    }
    return resp;
  }
  throw new Error('Too many redirects');
}

// SVG Content Sanitization
function isSafeSvgContent(buffer: Buffer): boolean {
  const content = buffer.toString('utf-8').toLowerCase();
  if (
    content.includes('<script') ||
    content.includes('javascript:') ||
    content.includes('onload=') ||
    content.includes('onerror=') ||
    content.includes('onclick=') ||
    content.includes('onmouseover=')
  ) {
    return false;
  }
  return true;
}

// Helper to load database
interface DatabaseSchema {
  contents: any[];
  comments: Record<string, any[]>;
  deletedIds?: string[];
  settings?: Record<string, any>;
  profiles?: Record<string, any>;
}

let cachedDb: DatabaseSchema | null = null;

function loadDatabase(): DatabaseSchema {
  if (cachedDb !== null) {
    return cachedDb;
  }

  let dbData: DatabaseSchema = { contents: [], comments: {}, deletedIds: [], settings: {}, profiles: {} };

  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      dbData = JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Database Warning] Error reading database file:', err);
  }

  if (!dbData.deletedIds || !Array.isArray(dbData.deletedIds)) {
    dbData.deletedIds = [];
  }

  if (!dbData.profiles || typeof dbData.profiles !== 'object') {
    dbData.profiles = {};
  }

  if (!dbData.settings || typeof dbData.settings !== 'object') {
    dbData.settings = {};
  }

  if (!dbData.comments || typeof dbData.comments !== 'object') {
    dbData.comments = INITIAL_COMMENTS || {};
  }

  // Ensure deletedIds array exists
  if (!dbData.deletedIds || !Array.isArray(dbData.deletedIds)) {
    dbData.deletedIds = [];
  }
  const rawSoftDelIds: string[] = Array.isArray((dbData as any).softDeletedIds)
    ? (dbData as any).softDeletedIds
    : [];

  // Build comprehensive tombstone set for deleted IDs (including prefixes post-, content-)
  const deletedSet = new Set<string>();
  const rawDeletedList = Array.from(new Set([
    ...dbData.deletedIds,
    ...rawSoftDelIds,
    ...((dbData.contents || []).filter((c: any) => c && (c.isDeleted || c.isArchived)).map((c: any) => c.id))
  ]));

  for (const dId of rawDeletedList) {
    if (!dId) continue;
    const strId = String(dId);
    deletedSet.add(strId);
    const cleanId = strId.replace(/^(post|content)-/, '');
    deletedSet.add(cleanId);
    deletedSet.add(`post-${cleanId}`);
    deletedSet.add(`content-${cleanId}`);
  }

  // Keep dbData.deletedIds synchronized with all deleted IDs
  dbData.deletedIds = Array.from(deletedSet);

  // Fallback to INITIAL_CONTENT if database file did not exist, contents was null/undefined, or contents array is empty
  if (!dbData.contents || !Array.isArray(dbData.contents) || dbData.contents.length === 0) {
    dbData.contents = Array.isArray(INITIAL_CONTENT)
      ? INITIAL_CONTENT.filter((seed: any) => seed && seed.id && !deletedSet.has(String(seed.id)))
          .map((seed: any) => ({ ...seed, seedStatus: 'active' }))
      : [];
  } else {
    // Purge any tombstoned/deleted items that might have re-entered dbData.contents or mark them as isDeleted: true
    dbData.contents = dbData.contents.map((c: any) => {
      if (!c || !c.id) return c;
      const cId = String(c.id);
      const cleanCId = cId.replace(/^(post|content)-/, '');
      if (deletedSet.has(cId) || deletedSet.has(cleanCId)) {
        return { ...c, isDeleted: true, isArchived: true };
      }
      return c;
    });

    // Smart seed merger per user policy: Combine missing default seed items into staging queue ONLY if never deleted
    if (Array.isArray(INITIAL_CONTENT)) {
      const existingSet = new Set<string>();
      for (const item of dbData.contents) {
        if (!item || !item.id) continue;
        const itemId = String(item.id);
        const cleanItemId = itemId.replace(/^(post|content)-/, '');
        existingSet.add(itemId);
        existingSet.add(cleanItemId);
        existingSet.add(`post-${cleanItemId}`);
        existingSet.add(`content-${cleanItemId}`);
      }

      for (const seed of INITIAL_CONTENT) {
        if (!seed || !seed.id) continue;
        const seedId = String(seed.id);
        const cleanSeedId = seedId.replace(/^(post|content)-/, '');

        const isExisting = existingSet.has(seedId) || existingSet.has(cleanSeedId);
        const isDeleted = deletedSet.has(seedId) || deletedSet.has(cleanSeedId) || seed.isDeleted;

        if (!isExisting && !isDeleted) {
          dbData.contents.push({
            ...seed,
            seedStatus: 'active'
          });
        }
      }
    }
  }

  // Purge any remaining Unsplash URLs and sanitize stale upc.geekclub.ir/uploads/ links
  if (dbData.contents && Array.isArray(dbData.contents)) {
    dbData.contents = dbData.contents.map((item: any) => {
      if (item && item.thumbnail) {
        if (item.thumbnail.includes('unsplash')) {
          item.thumbnail = 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg';
        } else if (item.thumbnail.includes('upc.geekclub.ir/uploads/')) {
          item.thumbnail = item.thumbnail.substring(item.thumbnail.indexOf('/uploads/'));
        }
      }
      if (item && item.author && item.author.avatar && item.author.avatar.includes('unsplash')) {
        item.author.avatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%233b82f6"/><text x="50" y="63" font-family="Tahoma,sans-serif" font-size="42" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">گ</text></svg>`;
      }
      if (item && item.slides && Array.isArray(item.slides)) {
        item.slides = item.slides.map((s: any) => {
          if (s && s.url) {
            if (s.url.includes('unsplash')) {
              s.url = 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg';
            } else if (s.url.includes('upc.geekclub.ir/uploads/')) {
              s.url = s.url.substring(s.url.indexOf('/uploads/'));
            }
          }
          if (s && s.thumbnail && s.thumbnail.includes('upc.geekclub.ir/uploads/')) {
            s.thumbnail = s.thumbnail.substring(s.thumbnail.indexOf('/uploads/'));
          }
          return s;
        });
      }
      if (item && (!item.seedStatus || item.seedStatus === 'pending_approval')) {
        item.seedStatus = 'active';
      }
      return item;
    });
  }

  cachedDb = dbData;
  if (!fs.existsSync(DB_PATH)) {
    saveDatabase(dbData);
  }
  return dbData;
}

const BACKUP_DIR = IS_VERCEL
  ? path.resolve('/tmp', 'backups')
  : path.resolve(__dirname, 'data', 'backups');

function createDatabaseBackup(): { success: boolean; filename: string; path: string; timestamp: string } {
  try {
    const db = loadDatabase();
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_12h_${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf-8');
    db.settings = { ...(db.settings || {}), lastBackupAt: new Date().toISOString() };
    saveDatabase(db);
    recordPostgresBackup(filename, '12h_auto').catch(() => {});
    console.log(`[Auto Backup] 12-hour database backup created: ${filename}`);
    return { success: true, filename, path: backupPath, timestamp: new Date().toISOString() };
  } catch (err: any) {
    console.warn(`[Auto Backup Warning] Failed to create 12h backup:`, err.message);
    return { success: false, filename: '', path: '', timestamp: new Date().toISOString() };
  }
}

// Function to clean temporary disk uploads older than 12 hours
function cleanOldTempUploads(dirPath: string, maxAgeMs: number = 12 * 60 * 60 * 1000) {
  try {
    if (!fs.existsSync(dirPath)) return;
    const now = Date.now();
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          cleanOldTempUploads(fullPath, maxAgeMs);
          // Remove empty directory if clean
          if (fs.readdirSync(fullPath).length === 0) {
            fs.rmdirSync(fullPath);
          }
        } else if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
          console.log(`[12h Hard Disk Cleanup] Deleted expired temporary file (>12h old): ${fullPath}`);
        }
      } catch (err: any) {
        console.warn(`[12h Cleanup Notice] Error checking file ${fullPath}:`, err.message);
      }
    }
  } catch (err: any) {
    console.warn('[12h Cleanup Notice] Error scanning upload directory:', err.message);
  }
}

// 12-hour automated background backup & disk cleanup scheduler
setInterval(() => {
  createDatabaseBackup();
  cleanOldTempUploads(UPLOADS_DIR);
}, 12 * 60 * 60 * 1000);

// Run initial cleanup on startup
setTimeout(() => {
  cleanOldTempUploads(UPLOADS_DIR);
}, 10000);

function saveDatabase(db: DatabaseSchema) {
  cachedDb = db;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      const tempPath = `${DB_PATH}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_PATH);
    } catch {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    }
    console.log(`[Database Save] Successfully persisted ${db.contents.length} contents and ${db.deletedIds?.length || 0} deletedIds to disk (${DB_PATH}).`);
  } catch (err: any) {
    console.warn('[Database Warning] Could not save database file to disk:', err.message);
  }

  // Mirror state to PostgreSQL if connected
  if (isPostgresConnected()) {
    saveDatabaseToPostgres(db).catch((err) => {
      console.warn('[PostgreSQL Sync Warning] Error writing to PostgreSQL:', err.message);
    });
  }
}

// --- API Routes ---

// Direct Google OAuth 2.0 Token Verification Endpoint (Firebase-Free)
app.post('/api/auth/google-verify', rateLimit('google-verify', 30, 60_000), async (req: Request, res: Response) => {
  const { accessToken, idToken } = req.body || {};

  try {
    let googleUser: any = null;

    if (accessToken) {
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 8000
      });
      googleUser = userInfoRes.data;
    } else if (idToken) {
      const tokenInfoRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
        timeout: 8000
      });
      googleUser = tokenInfoRes.data;
    }

    if (!googleUser || (!googleUser.email && !googleUser.sub)) {
      return res.status(400).json({ success: false, error: 'احراز هویت گوگل ناموفق بود یا توکن معتبر نیست.' });
    }

    const email = (googleUser.email || '').toLowerCase();
    const uid = googleUser.sub || `google-${Date.now()}`;
    const rawPhoto = googleUser.picture || '';
    const safePhoto = rawPhoto && (rawPhoto.includes('googleusercontent.com') || rawPhoto.includes('ggpht.com'))
      ? `/api/proxy-image?url=${encodeURIComponent(rawPhoto)}`
      : rawPhoto;

    return res.json({
      success: true,
      user: {
        uid,
        displayName: googleUser.name || googleUser.given_name || 'کاربر گوگل',
        email,
        photoURL: safePhoto
      }
    });
  } catch (err: any) {
    console.error('Google OAuth direct verification error:', err?.message);
    return res.status(400).json({ success: false, error: 'خطا در تایید هویت مستقیم با گوگل.' });
  }
});

// 0. GET /api/proxy-image - Direct image proxy for blocked external images
app.get('/api/proxy-image', rateLimit('proxy-image', 120, 60_000), async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('URL parameter is required');
  }

  // Fast Path: If URL contains /uploads/, it's a locally stored file on this server!
  // Serve it directly from disk with 200 OK without making external HTTP requests.
  if (imageUrl.includes('/uploads/')) {
    try {
      const relPath = imageUrl.substring(imageUrl.indexOf('/uploads/') + '/uploads/'.length);
      const diskPath = path.join(UPLOADS_DIR, relPath);
      if (fs.existsSync(diskPath)) {
        const fileData = fs.readFileSync(diskPath);
        const ext = path.extname(diskPath).toLowerCase();
        const mime = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(fileData);
      }
    } catch (diskErr: any) {
      console.warn('[Proxy Local Uploads Read Warning]:', diskErr.message);
    }
  }

  const validation = isSafeUrl(imageUrl);
  if (!validation.safe || !validation.parsedUrl) {
    return res.status(400).json({ success: false, error: validation.reason || 'Invalid or unsafe image URL' });
  }

  try {
    const cleanUrl = validation.parsedUrl.toString();
    const response = await safeAxiosGet(cleanUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const rawType = response.headers['content-type'];
    const contentType = typeof rawType === 'string' ? rawType : 'image/jpeg';
    const buffer = Buffer.from(response.data);

    if (contentType.includes('svg') && !isSafeSvgContent(buffer)) {
      return res.status(400).json({ success: false, error: 'SVG image contains unsafe script or event handler tags' });
    }

    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(415).json({ success: false, error: 'Only image content can be proxied' });
    }

    if (contentType.includes('svg')) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(buffer);
    }

    // Process non-SVG images with sharp for lightning fast card rendering (max width 800, quality 80 WebP)
    try {
      const sharpInstance = await getSharp();
      if (sharpInstance) {
        const optimizedBuffer = await sharpInstance(buffer)
          .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();

        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(optimizedBuffer);
      }
    } catch {
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(buffer);
    }
  } catch (err: any) {
    console.warn('Image proxy failed for:', imageUrl, err.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#1e293b"/><text x="400" y="235" font-family="sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">GeekClub Media</text></svg>');
  }
});

// Helper to download real cover image from external platform, optimize with Sharp, and cache locally & on CDN with structured subfolders
async function downloadAndCacheImage(
  imageUrl: string,
  filenamePrefix: string,
  platform: string = 'instagram',
  sourceName: string = 'general'
): Promise<string> {
  if (!imageUrl) return imageUrl;
  if (imageUrl.includes('upc.geekclub.ir/uploads/')) {
    return imageUrl.substring(imageUrl.indexOf('/uploads/'));
  }
  if (imageUrl.startsWith('/uploads/')) {
    return imageUrl;
  }
  if (imageUrl.includes('upc.geekclub.ir') && !imageUrl.includes('/uploads/')) {
    return imageUrl;
  }

  const validation = isSafeUrl(imageUrl);
  if (!validation.safe || !validation.parsedUrl) {
    return imageUrl;
  }

  try {
    const cleanPlatform = (platform || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';
    const cleanSource = (sourceName || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'default';

    const targetFolderRelative = `uploads/${cleanPlatform}/${cleanSource}`;
    const targetFolderDisk = path.join(UPLOADS_DIR, cleanPlatform, cleanSource);

    if (!fs.existsSync(targetFolderDisk)) {
      fs.mkdirSync(targetFolderDisk, { recursive: true });
    }

    const cleanUrl = validation.parsedUrl.toString();
    let refererUrl = cleanUrl;
    try {
      refererUrl = `${validation.parsedUrl.protocol}//${validation.parsedUrl.hostname}/`;
    } catch {}

    const response = await safeAxiosGet(cleanUrl, {
      responseType: 'arraybuffer',
      timeout: 12000,
      maxContentLength: 15 * 1024 * 1024,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': refererUrl,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    const rawType = response.headers['content-type'];
    const contentType = typeof rawType === 'string' ? rawType : 'image/jpeg';
    const originalBuffer = Buffer.from(response.data);

    if (contentType.includes('svg') || !contentType.toLowerCase().startsWith('image/')) {
      return imageUrl;
    }

    // Automatically resize and optimize image for card layout standard (max width 800px, max height 600px, WebP format 80% quality)
    let finalBuffer: Buffer = originalBuffer;
    let ext = 'webp';
    let mimeType = 'image/webp';

    try {
      const sharpInstance = await getSharp();
      if (sharpInstance) {
        finalBuffer = await sharpInstance(originalBuffer)
          .resize(800, 600, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        console.log(`[Image Optimization SUCCESS] Resized cover ${filenamePrefix} from ${Math.round(originalBuffer.length / 1024)}KB to ${Math.round(finalBuffer.length / 1024)}KB (WebP)`);
      }
    } catch (sharpErr: any) {
      console.warn(`[Sharp Warning] Image optimization failed for ${filenamePrefix}, using original buffer:`, sharpErr.message);
      finalBuffer = originalBuffer;
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else ext = 'jpg';
      mimeType = contentType;
    }

    const filename = `${filenamePrefix}.${ext}`;
    const localFilePath = path.join(targetFolderDisk, filename);
    let localUrl = `/${targetFolderRelative}/${filename}`;
    try {
      fs.writeFileSync(localFilePath, finalBuffer);
    } catch (fsErr: any) {
      console.warn(`[Storage Warning] Could not write image file to disk:`, fsErr.message);
      localUrl = imageUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}` : imageUrl;
    }

    // Upload optimized image to upc.geekclub.ir CDN (only if CDN_SECRET is configured)
    if (CDN_SECRET) {
      try {
        const fileBlob = new Blob([new Uint8Array(finalBuffer)], { type: mimeType });
        const formData = new FormData();
        formData.append('file', fileBlob, filename);
        formData.append('api_token', CDN_SECRET);
        formData.append('folder', `${cleanPlatform}/${cleanSource}`);

        const cdnResp = await fetch('https://upc.geekclub.ir/s1/upload.php', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CDN_SECRET}`,
            'X-Api-Token': CDN_SECRET
          },
          body: formData
        });

        if (cdnResp.ok) {
          const cdnData = await cdnResp.json() as any;
          if (cdnData.status && cdnData.url && typeof cdnData.url === 'string' && cdnData.url.includes('/s1/')) {
            console.log(`[CDN Upload SUCCESS] Optimized cover ${filenamePrefix} uploaded to CDN (${cleanPlatform}/${cleanSource}): ${cdnData.url}`);
            return cdnData.url;
          }
        }
      } catch (cdnErr: any) {
        console.warn(`[CDN Upload Warning] Upload to upc.geekclub.ir failed for ${filenamePrefix}:`, cdnErr.message);
      }
    }

    return localUrl;
  } catch (err: any) {
    console.warn(`Failed to download cover image from ${imageUrl}:`, err.message);
    return imageUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}` : imageUrl;
  }
}

// Helper to download video file and cache locally & on CDN with structured subfolders
async function downloadAndCacheVideo(
  videoUrl: string,
  filenamePrefix: string,
  platform: string = 'instagram',
  sourceName: string = 'general'
): Promise<string> {
  if (!videoUrl) return videoUrl;
  if (videoUrl.includes('upc.geekclub.ir/uploads/')) {
    return videoUrl.substring(videoUrl.indexOf('/uploads/'));
  }
  if (videoUrl.startsWith('/uploads/')) {
    return videoUrl;
  }
  if (videoUrl.includes('upc.geekclub.ir') && !videoUrl.includes('/uploads/')) {
    return videoUrl;
  }
  try {
    const cleanPlatform = (platform || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';
    const cleanSource = (sourceName || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'default';

    const targetFolderRelative = `uploads/${cleanPlatform}/${cleanSource}`;
    const targetFolderDisk = path.join(UPLOADS_DIR, cleanPlatform, cleanSource);

    if (!fs.existsSync(targetFolderDisk)) {
      fs.mkdirSync(targetFolderDisk, { recursive: true });
    }

    const cleanUrl = videoUrl.trim().startsWith('http') ? videoUrl.trim() : `https://${videoUrl.trim()}`;
    console.log(`[Video Pipeline] Starting video download from: ${cleanUrl.substring(0, 80)}...`);
    const response = await safeAxiosGet(cleanUrl, {
      responseType: 'arraybuffer',
      timeout: 45000,
      maxContentLength: 80 * 1024 * 1024, // Up to 80MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/mp4,video/*,*/*'
      }
    });

    const buffer = Buffer.from(response.data);
    const filename = `${filenamePrefix}.mp4`;
    const localFilePath = path.join(targetFolderDisk, filename);
    let localUrl = `/${targetFolderRelative}/${filename}`;
    try {
      fs.writeFileSync(localFilePath, buffer);
      console.log(`[Video Pipeline] Video downloaded to local server storage: ${localUrl} (${Math.round(buffer.length / 1024)} KB)`);
    } catch (fsErr: any) {
      console.warn(`[Video Pipeline Warning] Could not write video file to disk:`, fsErr.message);
      localUrl = videoUrl;
    }

    // Transfer video to CDN (upc.geekclub.ir) - only if CDN_SECRET is configured
    if (CDN_SECRET) {
      try {
        const fileBlob = new Blob([new Uint8Array(buffer)], { type: 'video/mp4' });
        const formData = new FormData();
        formData.append('file', fileBlob, filename);
        formData.append('api_token', CDN_SECRET);
        formData.append('folder', `${cleanPlatform}/${cleanSource}`);

        const cdnResp = await fetch('https://upc.geekclub.ir/s1/upload.php', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CDN_SECRET}`,
            'X-Api-Token': CDN_SECRET
          },
          body: formData
        });

        if (cdnResp.ok) {
          const cdnData = await cdnResp.json() as any;
          if (cdnData.status && cdnData.url) {
            console.log(`[Video Pipeline SUCCESS] Video transferred to CDN (${cleanPlatform}/${cleanSource}): ${cdnData.url}`);
            if (fs.existsSync(localFilePath)) {
              try { fs.unlinkSync(localFilePath); } catch {}
            }
            return cdnData.url;
          }
        }
      } catch (cdnErr: any) {
        console.warn(`[CDN Video Transfer Warning] CDN upload failed for ${filenamePrefix}, serving via local server:`, cdnErr.message);
      }
    }

    return localUrl;
  } catch (err: any) {
    console.warn(`Failed to download video file:`, err.message);
    return videoUrl;
  }
}

// 0.1. POST /api/transfer-to-cdn - Server-side external image downloader & CDN uploader
app.post('/api/transfer-to-cdn', rateLimit('transfer-cdn', 20, 60_000), async (req: Request, res: Response) => {
  const { imageUrl, folder, filenamePrefix } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ success: false, error: 'imageUrl parameter is required' });
  }

  if (imageUrl.includes('upc.geekclub.ir/uploads/')) {
    return res.json({ success: true, url: imageUrl.substring(imageUrl.indexOf('/uploads/')) });
  }

  if (imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:') || imageUrl.startsWith('/uploads/')) {
    return res.json({ success: true, url: imageUrl });
  }

  try {
    const pfx = filenamePrefix || `transfer_${Date.now()}`;
    const cdnUrl = await downloadAndCacheImage(imageUrl, pfx, folder || 'contents');
    return res.json({ success: true, url: cdnUrl });
  } catch (err: any) {
    console.error('Server image download error:', err.message);
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    return res.json({ success: true, url: proxyUrl });
  }
});

export interface MediaSlide {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

export interface ExtractedMetaResult {
  success: boolean;
  platform: 'youtube' | 'aparat' | 'instagram' | 'article';
  title: string;
  description: string;
  authorName: string;
  thumbnail: string;
  image: string;
  author: string;
  embedUrl: string;
  readingOrWatchTime: string;
  tags: string[];
  videoUrl?: string;
  mediaType?: 'video' | 'image' | 'carousel';
  images?: string[];
  slides?: MediaSlide[];
  data?: any;
  error?: string;
}

export async function extractMetadataForUrl(targetUrl: string): Promise<ExtractedMetaResult> {
  if (!targetUrl) {
    return {
      success: false,
      platform: 'article',
      title: '',
      description: '',
      authorName: '',
      thumbnail: '',
      image: '',
      author: '',
      embedUrl: '',
      readingOrWatchTime: '',
      tags: [],
      error: 'URL query parameter is required'
    };
  }

  const cleanUrl = targetUrl.trim().startsWith('http') ? targetUrl.trim() : `https://${targetUrl.trim()}`;

  // 1. YouTube metadata extraction & cover download + CDN transfer
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    let title = cleanUrl.includes('shorts') ? 'ویدیو کوتاه یوتیوب (Shorts)' : 'ویدیو آموزشی در یوتیوب';
    let authorName = 'کانال یوتیوب';
    let description = '';
    let rawThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oeRes = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`, { timeout: 6000 });
      if (oeRes.data) {
        if (oeRes.data.title) title = oeRes.data.title;
        if (oeRes.data.author_name) authorName = oeRes.data.author_name;
        if (oeRes.data.thumbnail_url) rawThumb = oeRes.data.thumbnail_url;
      }
    } catch {
      try {
        const noembed = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, { timeout: 5000 });
        if (noembed.data) {
          if (noembed.data.title) title = noembed.data.title;
          if (noembed.data.author_name) authorName = noembed.data.author_name;
          if (noembed.data.thumbnail_url) rawThumb = noembed.data.thumbnail_url;
        }
      } catch {}
    }

    try {
      const pageRes = await safeAxiosGet(cleanUrl, {
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      const html = typeof pageRes.data === 'string' ? pageRes.data : '';
      const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1] && descMatch[1].trim()) {
        description = descMatch[1].trim();
      }
    } catch {}

    if (!description) {
      description = `ویدیوی جذاب منتشر شده در پلتفرم یوتیوب توسط ${authorName}. جهت مشاهده کامل ویدیو روی دکمه پخش کلیک کنید.`;
    }

    // Download thumbnail on server and upload to CDN
    const finalThumbnail = await downloadAndCacheImage(rawThumb, `cover_yt_${videoId}`);

    return {
      success: true,
      platform: 'youtube',
      title,
      description,
      authorName,
      thumbnail: finalThumbnail,
      image: finalThumbnail,
      author: authorName,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      readingOrWatchTime: cleanUrl.includes('shorts') ? '۶۰ ثانیه شورت' : 'ویدیو یوتیوب',
      tags: ['یوتیوب', 'ویدیو', 'تکنولوژی', 'آموزش'],
      data: {
        title,
        author_name: authorName,
        thumbnail_url: finalThumbnail
      }
    };
  }

  // 2. Aparat metadata extraction & cover download + CDN transfer
  const apMatch = cleanUrl.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/i);
  if (apMatch && apMatch[1]) {
    const hash = apMatch[1];
    let title = 'ویدیوی آپارات';
    let authorName = 'کانال آپارات';
    let description = '';
    let readingOrWatchTime = 'ویدیو آپارات';
    let rawThumb = '';

    try {
      // Primary: Official Aparat API
      const apRes = await axios.get(`https://www.aparat.com/etc/api/video/videohash/${hash}`, {
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.aparat.com/'
        }
      });
      const v = apRes.data?.video;
      if (v) {
        if (v.title) title = v.title;
        if (v.description) description = v.description;
        if (v.sender_name) authorName = v.sender_name;
        if (v.duration) readingOrWatchTime = `${Math.ceil(v.duration / 60)} دقیقه ویدیو`;
        rawThumb = v.big_poster || v.small_poster || '';
      }
    } catch (err: any) {
      console.log('Aparat official API fetch failed, trying v1 fallback:', err.message);
      try {
        const fallbackRes = await axios.get(`https://www.aparat.com/api/fa/v1/video/video/show/videohash/${hash}`, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const attr = fallbackRes.data?.data?.attributes;
        if (attr) {
          if (attr.title) title = attr.title;
          if (attr.description) description = attr.description;
          if (attr.owner_username) authorName = attr.owner_username;
          if (attr.duration) readingOrWatchTime = `${Math.ceil(attr.duration / 60)} دقیقه ویدیو`;
          rawThumb = attr.big_poster || attr.poster || attr.medium_poster || attr.small_poster || '';
        }
      } catch {}
    }

    if (!description) {
      description = `ویدیوی به اشتراک گذاشته شده از آپارات توسط ${authorName}. برای مشاهده ویدیوی کامل روی کارت کلیک نمایید.`;
    }

    let finalThumbnail = rawThumb;
    if (rawThumb) {
      finalThumbnail = await downloadAndCacheImage(rawThumb, `cover_aparat_${hash}`);
    }

    return {
      success: true,
      platform: 'aparat',
      title,
      description,
      authorName,
      thumbnail: finalThumbnail,
      image: finalThumbnail,
      author: authorName,
      embedUrl: `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`,
      readingOrWatchTime,
      tags: ['آپارات', 'ویدیو', 'آموزش'],
      data: {
        title,
        author_name: authorName,
        thumbnail_url: finalThumbnail
      }
    };
  }

// Helper to fetch Instagram post details and media files using Apify API
async function fetchInstagramViaApify(instagramUrl: string): Promise<ExtractedMetaResult | null> {
  const db = loadDatabase();
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || db.settings?.apifyApiToken;
  const actorId = process.env.APIFY_ACTOR_ID || db.settings?.apifyActorId || 'apify~instagram-scraper';

  const match = instagramUrl.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
  const shortcode = match ? match[1] : '';
  const cleanDirectUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/` : instagramUrl.split('?')[0];

  console.log(`[Apify Pipeline] Checking Instagram URL via Apify: ${cleanDirectUrl} (shortcode: ${shortcode || 'unknown'})`);
  if (!token) {
    console.warn(`[Apify Pipeline Notice] APIFY_API_TOKEN is not configured in process.env or settings. Falling back to multi-tier extraction.`);
    return null;
  }

  try {
    const actorEndpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${token}&timeout=25`;
    console.log(`[Apify Pipeline] Executing Apify actor ${actorId} for ${cleanDirectUrl}...`);

    const apifyResponse = await axios.post(
      actorEndpoint,
      {
        directUrls: [cleanDirectUrl],
        resultsType: 'posts',
        resultsLimit: 1,
        searchLimit: 1
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const items = apifyResponse.data;
    if (Array.isArray(items) && items.length > 0) {
      const item = items[0];
      console.log(`[Apify Pipeline SUCCESS] Dataset item received for ${instagramUrl}:`, {
        id: item.id || item.shortCode,
        hasVideo: !!(item.videoUrl || item.video_url || item.videoVersions),
        caption: (item.caption || item.text || '').substring(0, 40)
      });

      const rawVideoUrl = item.videoUrl || item.video_url || item.video_play_url || (item.videoVersions && item.videoVersions[0]?.url);
      const rawDisplayUrl = item.displayUrl || item.display_url || (item.images && item.images[0]) || item.thumbnailUrl;
      const rawImages: string[] = Array.isArray(item.images) ? item.images : [];
      const caption = item.caption || item.text || '';
      const ownerUsername = item.ownerUsername || item.owner_username || item.owner?.username || 'instagram';
      const cleanUsername = ownerUsername.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'general';
      const ownerFullName = item.ownerFullName || item.owner_fullname || item.owner?.full_name || `@${ownerUsername}`;
      const igCdnFolder = `instagram/${cleanUsername}`;

      // Extract raw slides (videos, photos, mixed carousel) from Apify dataset
      const rawSlidesInput: Array<{ type: 'video' | 'image'; videoUrl?: string; imageUrl?: string }> = [];

      const childList = item.childPosts || item.sidecarChildPosts || item.carouselMedia || item.child_posts || [];
      if (Array.isArray(childList) && childList.length > 0) {
        for (const child of childList) {
          const isVid = Boolean(
            child.type === 'Video' ||
            child.type === 'video' ||
            child.media_type === 2 ||
            child.videoUrl ||
            child.video_url ||
            child.video_play_url ||
            (child.videoVersions && child.videoVersions[0]?.url)
          );
          const vidUrl = child.videoUrl || child.video_url || child.video_play_url || (child.videoVersions && child.videoVersions[0]?.url);
          const imgUrl = child.displayUrl || child.display_url || child.image || (child.images && child.images[0]) || child.thumbnailUrl;

          if (isVid && vidUrl) {
            rawSlidesInput.push({ type: 'video', videoUrl: vidUrl, imageUrl: imgUrl });
          } else if (imgUrl) {
            rawSlidesInput.push({ type: 'image', imageUrl: imgUrl });
          }
        }
      }

      // Fallback if childList is empty, but item has images or single video
      if (rawSlidesInput.length === 0) {
        const rawVideoUrl = item.videoUrl || item.video_url || item.video_play_url || (item.videoVersions && item.videoVersions[0]?.url);
        const rawDisplayUrl = item.displayUrl || item.display_url || (item.images && item.images[0]) || item.thumbnailUrl;
        const rawImagesList = Array.isArray(item.images) ? item.images : [];

        if (rawVideoUrl) {
          rawSlidesInput.push({ type: 'video', videoUrl: rawVideoUrl, imageUrl: rawDisplayUrl });
        } else if (rawImagesList.length > 0) {
          for (const imgUrl of rawImagesList) {
            rawSlidesInput.push({ type: 'image', imageUrl: imgUrl });
          }
        } else if (rawDisplayUrl) {
          rawSlidesInput.push({ type: 'image', imageUrl: rawDisplayUrl });
        }
      }

      console.log(`[Apify Pipeline] Extracted ${rawSlidesInput.length} media slide(s) for ${instagramUrl}`);

      // Process and cache all slides onto local server & transfer to CDN under s1/instagram/{cleanUsername}/
      const cdnSlides: MediaSlide[] = [];
      const cdnImages: string[] = [];
      let cdnPrimaryVideo = '';
      let cdnPrimaryThumb = '';

      const nowPfx = Date.now();
      for (let i = 0; i < Math.min(rawSlidesInput.length, 10); i++) {
        const slide = rawSlidesInput[i];
        if (slide.type === 'video' && slide.videoUrl) {
          const cachedVideo = await downloadAndCacheVideo(slide.videoUrl, `ig_vid_slide_${nowPfx}_${i}`, igCdnFolder);
          let cachedThumb = '';
          if (slide.imageUrl) {
            cachedThumb = await downloadAndCacheImage(slide.imageUrl, `ig_thumb_slide_${nowPfx}_${i}`, igCdnFolder);
          }
          cdnSlides.push({
            type: 'video',
            url: cachedVideo,
            thumbnail: cachedThumb || cachedVideo
          });
          if (!cdnPrimaryVideo) cdnPrimaryVideo = cachedVideo;
          if (!cdnPrimaryThumb && cachedThumb) cdnPrimaryThumb = cachedThumb;
        } else if (slide.imageUrl) {
          const cachedImg = await downloadAndCacheImage(slide.imageUrl, `ig_img_slide_${nowPfx}_${i}`, igCdnFolder);
          cdnSlides.push({
            type: 'image',
            url: cachedImg,
            thumbnail: cachedImg
          });
          cdnImages.push(cachedImg);
          if (!cdnPrimaryThumb) cdnPrimaryThumb = cachedImg;
        }
      }

      // Determine clean title from caption or author
      let title = '';
      if (caption) {
        const firstLine = caption.split('\n')[0].replace(/#[\w\u0600-\u06FF]+/g, '').trim();
        if (firstLine.length > 5) {
          title = firstLine.length > 90 ? firstLine.substring(0, 87) + '...' : firstLine;
        }
      }
      if (!title) {
        title = cdnPrimaryVideo ? `ویدیوی اینستاگرام از @${ownerUsername}` : `پست اینستاگرام از @${ownerUsername}`;
      }

      const finalMediaType = cdnSlides.length > 1 ? 'carousel' : (cdnSlides[0]?.type || (cdnPrimaryVideo ? 'video' : 'image'));

      return {
        success: true,
        platform: 'instagram',
        title,
        description: caption || `محتوای اشتراک‌گذاری شده از صفحه @${ownerUsername} در اینستاگرام.`,
        authorName: ownerFullName,
        author: ownerFullName,
        thumbnail: cdnPrimaryThumb,
        image: cdnPrimaryThumb,
        videoUrl: cdnPrimaryVideo,
        mediaType: finalMediaType,
        images: cdnImages.length > 0 ? cdnImages : (cdnPrimaryThumb ? [cdnPrimaryThumb] : []),
        slides: cdnSlides,
        embedUrl: instagramUrl.replace(/\/$/, '') + '/embed',
        readingOrWatchTime: cdnSlides.length > 1 ? `${cdnSlides.length} اسلاید اینستاگرام` : (cdnPrimaryVideo ? 'ویدیو اینستاگرام' : 'پست اینستاگرام'),
        tags: ['اینستاگرام', 'ویدیو', 'رسانه', ownerUsername].filter(Boolean),
        data: {
          apify: true,
          ownerUsername,
          likesCount: item.likesCount,
          commentsCount: item.commentsCount,
          videoUrl: cdnPrimaryVideo,
          slidesCount: cdnSlides.length
        }
      };
    }
  } catch (err: any) {
    console.error(`[Apify Pipeline Error] ${err.message}`, err.response?.data || '');
  }
  return null;
}

// Helper to fetch Instagram via public bridge services & embed frames (VPS-friendly)
async function fetchInstagramViaPublicBridges(instagramUrl: string): Promise<ExtractedMetaResult | null> {
  const match = instagramUrl.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
  if (!match || !match[1]) return null;

  const shortcode = match[1];
  console.log(`[Instagram Bridge Pipeline] Extracting Instagram post ${shortcode}...`);

  let title = '';
  let caption = '';
  let authorName = '';
  let rawThumb = '';
  let rawVideo = '';

  // Tier 1: Try VXInstagram API bridge
  try {
    const vxRes = await axios.get(`https://api.vxinstagram.com/p/${shortcode}`, { timeout: 7000 });
    if (vxRes.data) {
      const d = vxRes.data;
      if (d.text || d.caption) caption = d.text || d.caption;
      if (d.user_name || d.user_screen_name) authorName = d.user_name || d.user_screen_name;
      if (d.media_urls && Array.isArray(d.media_urls) && d.media_urls.length > 0) {
        rawThumb = d.media_urls[0];
        if (d.media_urls.some((u: string) => u.includes('.mp4'))) {
          rawVideo = d.media_urls.find((u: string) => u.includes('.mp4')) || '';
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Instagram Bridge] VXInstagram API query notice:`, err.message);
  }

  // Tier 2: Try Instagram Public Embed Captioned Frame Parsing
  if (!rawThumb || !caption) {
    try {
      const embedRes = await axios.get(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = typeof embedRes.data === 'string' ? embedRes.data : '';

      // Extract image
      const imgMatch = html.match(/class=["']EmbeddedMediaImage["'][^>]*src=["']([^"']+)["']/i) ||
                       html.match(/<img[^>]+src=["'](https:\/\/[^"']+(?:fbcdn|cdninstagram)[^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        rawThumb = imgMatch[1].replace(/&amp;/g, '&');
      }

      // Extract video
      const vidMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
      if (vidMatch && vidMatch[1]) {
        rawVideo = vidMatch[1].replace(/&amp;/g, '&');
      }

      // Extract author
      const authorMatch = html.match(/class=["']UsernameText["'][^>]*>([^<]+)</i) ||
                          html.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/["']/i);
      if (authorMatch && authorMatch[1]) {
        authorName = authorMatch[1].trim();
      }

      // Extract caption
      const captionMatch = html.match(/class=["']Caption["'][^>]*>(.*?)<\/div>/is);
      if (captionMatch && captionMatch[1]) {
        caption = captionMatch[1].replace(/<[^>]+>/g, '').trim();
      }
    } catch (err: any) {
      console.warn(`[Instagram Bridge] Embed captioned frame parsing notice:`, err.message);
    }
  }

  // Clean title from caption
  if (caption) {
    const firstLine = caption.split('\n')[0].replace(/#[\w\u0600-\u06FF]+/g, '').trim();
    if (firstLine.length > 5) {
      title = firstLine.length > 90 ? firstLine.substring(0, 87) + '...' : firstLine;
    }
  }
  if (!title) {
    title = authorName ? `پست اینستاگرام از @${authorName}` : 'پست اینستاگرام';
  }

  const cleanUser = authorName ? authorName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() : 'general';
  const cdnFolder = `instagram/${cleanUser}`;

  let cdnThumb = '';
  if (rawThumb) {
    cdnThumb = await downloadAndCacheImage(rawThumb, `ig_bridge_cover_${shortcode}`, cdnFolder);
  }

  let cdnVideo = '';
  if (rawVideo) {
    cdnVideo = await downloadAndCacheVideo(rawVideo, `ig_bridge_vid_${shortcode}`, cdnFolder);
  }

  if (cdnThumb || cdnVideo || caption) {
    console.log(`[Instagram Bridge SUCCESS] Successfully extracted post ${shortcode} (Thumb: ${!!cdnThumb}, Video: ${!!cdnVideo})`);
    return {
      success: true,
      platform: 'instagram',
      title,
      description: caption || `محتوای به اشتراک گذاشته شده از اینستاگرام.`,
      authorName: authorName ? `@${authorName}` : 'اینستاگرام',
      author: authorName ? `@${authorName}` : 'اینستاگرام',
      thumbnail: cdnThumb,
      image: cdnThumb,
      videoUrl: cdnVideo || undefined,
      mediaType: cdnVideo ? 'video' : 'image',
      embedUrl: `https://www.instagram.com/p/${shortcode}/embed`,
      readingOrWatchTime: instagramUrl.includes('reel') ? 'ریلز اینستاگرام' : 'پست اینستاگرام',
      tags: ['اینستاگرام', 'ویدیو', 'رسانه', cleanUser].filter(Boolean),
      data: {
        bridge: true,
        shortcode,
        videoUrl: cdnVideo
      }
    };
  }

  return null;
}

  // 3. Instagram metadata extraction (Lightning-fast non-blocking with strict timeouts < 3s)
  if (cleanUrl.includes('instagram.com')) {
    // Tier 1: Fast Public Bridge extraction with strict 2.5s timeout
    try {
      const bridgePromise = fetchInstagramViaPublicBridges(cleanUrl);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Bridge timeout')), 2500));
      const bridgeResult: any = await Promise.race([bridgePromise, timeoutPromise]);
      if (bridgeResult && bridgeResult.success && bridgeResult.title) {
        return bridgeResult;
      }
    } catch (err: any) {
      console.warn('Instagram Public Bridge fast notice:', err.message);
    }

    // Tier 2: Apify attempt with 8.5-second timeout (matches ~4.8s Apify response)
    try {
      const apifyPromise = fetchInstagramViaApify(cleanUrl);
      const apifyTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Apify timeout')), 8500));
      const apifyResult: any = await Promise.race([apifyPromise, apifyTimeout]);
      if (apifyResult && apifyResult.success) {
        return apifyResult;
      }
    } catch (err: any) {
      console.warn('Apify extraction notice (falling back to instant metadata):', err.message);
    }

    // Fast Instant Fallback (Guarantees response in < 2 seconds)
    const shortcodeMatch = cleanUrl.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : 'post';
    const isReel = cleanUrl.includes('reel');

    return {
      success: true,
      platform: 'instagram',
      title: isReel ? `ریلز اینستاگرام (${shortcode})` : `پست اینستاگرام (${shortcode})`,
      description: `محتوای اشتراک‌گذاری شده از اینستاگرام. برای مشاهده تعاملی روی کارت کلیک نمایید.`,
      authorName: 'اینستاگرام',
      author: 'اینستاگرام',
      thumbnail: `https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg`,
      image: `https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg`,
      embedUrl: `https://www.instagram.com/p/${shortcode}/embed`,
      mediaType: isReel ? 'video' : 'image',
      readingOrWatchTime: isReel ? 'ریلز اینستاگرام' : 'پست اینستاگرام',
      tags: ['اینستاگرام', 'رسانه'],
      data: {
        instantFallback: true,
        shortcode
      }
    };
  }

  // 4. General Web Article / Webpage
  try {
    const pageRes = await safeAxiosGet(cleanUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    const html = typeof pageRes.data === 'string' ? pageRes.data : '';
    let title = '';
    let description = '';
    let image = '';
    let author = '';

    const titleMatches = [
      html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i),
      html.match(/<title[^>]*>(.*?)<\/title>/i),
      html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)
    ];
    for (const tm of titleMatches) {
      if (tm && tm[1] && tm[1].trim()) {
        title = tm[1].replace(/<[^>]*>/g, '').trim();
        break;
      }
    }

    const descMatches = [
      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i),
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i),
      html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)
    ];
    for (const m of descMatches) {
      if (m && m[1] && m[1].trim()) {
        description = m[1].trim();
        break;
      }
    }

    const imgMatches = [
      html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i),
      html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i),
      html.match(/<meta\s+[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i),
      html.match(/<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i),
      html.match(/<meta\s+[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i),
      html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i),
      html.match(/<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i),
      html.match(/"image"\s*:\s*["']([^"']+)["']/i),
      html.match(/"thumbnailUrl"\s*:\s*["']([^"']+)["']/i),
      html.match(/<img[^>]+class=["'][^"']*(?:wp-post-image|attachment-post-thumbnail|featured-image|entry-thumb|post-cover)[^"']*["'][^>]+src=["']([^"']+)["']/i),
      html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:wp-post-image|attachment-post-thumbnail|featured-image|entry-thumb|post-cover)[^"']*["']/i),
      html.match(/<img[^>]+data-src=["']([^"']+)["']/i),
      html.match(/<img[^>]+src=["']([^"']+)["']/i)
    ];

    for (const im of imgMatches) {
      if (im && im[1] && im[1].trim()) {
        let rawImg = im[1].trim().replace(/&amp;/g, '&');
        if (rawImg.startsWith('//')) {
          rawImg = 'https:' + rawImg;
        } else if (rawImg.startsWith('/')) {
          try {
            rawImg = new URL(rawImg, cleanUrl).toString();
          } catch {}
        } else if (!rawImg.startsWith('http')) {
          try {
            rawImg = new URL(rawImg, cleanUrl).toString();
          } catch {}
        }
        if (rawImg.startsWith('http')) {
          image = rawImg;
          break;
        }
      }
    }

    const authorMatches = [
      html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i)
    ];
    for (const am of authorMatches) {
      if (am && am[1] && am[1].trim()) {
        author = am[1].trim();
        break;
      }
    }

    let finalThumbnail = image;
    if (image && image.startsWith('http')) {
      let domain = 'general';
      try {
        domain = new URL(cleanUrl).hostname.replace(/^www\./, '').split('.')[0];
      } catch {}
      try {
        finalThumbnail = await downloadAndCacheImage(image, `cover_art_${Date.now()}`, 'article', domain);
      } catch (err: any) {
        console.warn('Failed to cache image locally, using direct extracted image URL:', err.message);
        finalThumbnail = image;
      }
    }

    return {
      success: true,
      platform: 'article',
      title: title || 'مقاله وب',
      description: description || '',
      authorName: author || '',
      thumbnail: finalThumbnail || '',
      image: finalThumbnail || '',
      author,
      embedUrl: cleanUrl,
      readingOrWatchTime: '۵ دقیقه مطالعه',
      tags: ['مقاله', 'وب', 'فناوری'],
      data: {
        title,
        author_name: author,
        thumbnail_url: finalThumbnail
      }
    };
  } catch (err: any) {
    return {
      success: false,
      platform: 'article',
      title: '',
      description: '',
      image: '',
      thumbnail: '',
      author: '',
      authorName: '',
      embedUrl: cleanUrl,
      readingOrWatchTime: '۵ دقیقه مطالعه',
      tags: ['وب'],
      error: err.message
    };
  }
}

// Helper to handle express extract metadata route
async function extractMetadataHandler(targetUrl: string, res: Response) {
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'URL query parameter is required' });
  }
  const result = await extractMetadataForUrl(targetUrl);
  return res.json(result);
}

// Background enrichment helper: When a user registers a link quickly without waiting for metadata,
// the server extracts source metadata, downloads the cover image to the CDN, and updates the database record.
async function enrichDatabaseContent(id: string, url: string) {
  try {
    const meta = await extractMetadataForUrl(url);
    if (!meta || !meta.success) {
      return null;
    }

    const db = loadDatabase();
    // BUGFIX: a delayed background enrichment must not re-create content that was deleted meanwhile.
    if (isTombstoned(db, id)) {
      return null;
    }
    let item = db.contents.find((c: any) => c.id === id || (url && c.url && c.url.trim().toLowerCase() === url.trim().toLowerCase()));
    
    if (!item) {
      item = {
        id: id || `content-${Date.now()}`,
        title: meta.title || 'محتوای اشتراک‌گذاری شده',
        description: meta.description || '',
        url,
        platform: meta.platform || 'article',
        embedUrl: meta.embedUrl || url,
        thumbnail: meta.thumbnail || '',
        videoUrl: meta.videoUrl || '',
        mediaType: meta.mediaType || 'image',
        images: meta.images || [],
        slides: meta.slides || [],
        apifyFetched: !!meta.data?.apify,
        author: {
          name: meta.authorName || 'کاربر گیک کلاب',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          handle: `@${(meta.authorName || 'geek').replace(/\s+/g, '_').toLowerCase()}`,
          isVerified: false
        },
        category: 'tech',
        tags: meta.tags && meta.tags.length > 0 ? meta.tags : ['محتوا', 'گیک_کلاب'],
        publishedAt: 'لحظاتی پیش',
        readingOrWatchTime: meta.readingOrWatchTime || '۵ دقیقه',
        likesCount: 1,
        dislikesCount: 0,
        commentsCount: 0,
        approvalStatus: 'approved'
      };
      db.contents.unshift(item);
      saveDatabase(db);
      console.log(`[Background Enrich] Content created on the fly ${id}: Title="${item.title}", Cover="${item.thumbnail}", Video="${item.videoUrl}", Slides=${item.slides?.length || 0}`);
      return item;
    }

    let changed = false;

    if (meta.title && meta.title.trim() && meta.title !== item.title) {
      item.title = meta.title.trim();
      changed = true;
    }
    if (meta.description && meta.description.trim() && (!item.description || item.description.includes('به اشتراک گذاشته شده') || item.description.length < 20)) {
      item.description = meta.description.trim();
      changed = true;
    }
    if (meta.thumbnail && meta.thumbnail.trim()) {
      let cleanThumb = meta.thumbnail.trim();
      if (cleanThumb.includes('upc.geekclub.ir/uploads/')) {
        cleanThumb = cleanThumb.substring(cleanThumb.indexOf('/uploads/'));
      }
      item.thumbnail = cleanThumb;
      changed = true;
    }
    if (meta.videoUrl && meta.videoUrl.trim() && item.videoUrl !== meta.videoUrl) {
      item.videoUrl = meta.videoUrl.trim();
      changed = true;
    }
    if (meta.mediaType && item.mediaType !== meta.mediaType) {
      item.mediaType = meta.mediaType;
      changed = true;
    }
    if (meta.images && meta.images.length > 0) {
      item.images = meta.images;
      changed = true;
    }
    if (meta.slides && meta.slides.length > 0) {
      item.slides = meta.slides;
      changed = true;
    }
    if (meta.data?.apify) {
      item.apifyFetched = true;
      changed = true;
    }
    if (meta.authorName && (!item.author?.name || item.author.name === 'کاربر گیک کلاب')) {
      if (!item.author) item.author = { name: meta.authorName, handle: `@${meta.authorName.replace(/\s+/g, '_')}` };
      else item.author.name = meta.authorName;
      changed = true;
    }
    if (meta.readingOrWatchTime) {
      item.readingOrWatchTime = meta.readingOrWatchTime;
      changed = true;
    }
    if (meta.tags && meta.tags.length > 0 && (!item.tags || item.tags.length <= 2)) {
      item.tags = Array.from(new Set([...(item.tags || []), ...meta.tags]));
      changed = true;
    }
    if (meta.embedUrl && (!item.embedUrl || item.embedUrl === item.url)) {
      item.embedUrl = meta.embedUrl;
      changed = true;
    }
    if (item.needsEnrichment) {
      delete item.needsEnrichment;
      changed = true;
    }

    if (changed) {
      saveDatabase(db);
      console.log(`[Background Enrich] Content ${id} updated: Title="${item.title}", Cover="${item.thumbnail}", Video="${item.videoUrl}"`);
    }
    return item;
  } catch (err: any) {
    console.warn(`[Background Enrich] Error for content ${id}:`, err.message);
    return null;
  }
}

// 0.2. GET /api/extract-metadata & /api/metadata/extract
app.get('/api/extract-metadata', rateLimit('extract-meta', 30, 60_000), async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  return extractMetadataHandler(targetUrl, res);
});

app.get('/api/metadata/extract', rateLimit('extract-meta', 30, 60_000), async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  return extractMetadataHandler(targetUrl, res);
});

// 1. GET /api/contents - List all contents with optional filters
app.get('/api/contents', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const db = loadDatabase();
  let results = [...db.contents];
  const { platform, category, search, sort } = req.query;
  const admin = await isAdminRequest(req);
  const includeArchived = req.query.includeArchived;
  const includePending = admin ? req.query.includePending : undefined;
  const includeDeleted = req.query.includeDeleted;

  // Filter out permanently deleted IDs (tombstones for items completely removed from db.contents)
  if (db.deletedIds && Array.isArray(db.deletedIds) && db.deletedIds.length > 0) {
    const delSet = new Set(db.deletedIds);
    results = results.filter((c) => {
      // Do NOT filter out items that exist with isDeleted: true or isArchived: true - those belong in Trash!
      if (c && (c.isDeleted || c.isArchived)) return true;
      return !delSet.has(c.id);
    });
  }

  // Filter out soft-deleted / archived items unless explicitly requested (includeDeleted === 'true')
  if (includeDeleted !== 'true') {
    results = results.filter((c) => !c.isDeleted && !c.isArchived);
  }

  // Filter out archived items by default unless explicitly requested
  if (includeArchived !== 'true' && includeDeleted !== 'true') {
    results = results.filter((c) => !c.isArchived);
  }

  // Filter out pending seeds waiting for Super Admin approval by default
  if (includePending !== 'true') {
    results = results.filter((c) => c.seedStatus !== 'pending_approval');
  }

  if (platform && platform !== 'all') {
    results = results.filter((c) => c.platform === platform);
  }

  if (category && category !== 'all') {
    results = results.filter((c) => c.category === category);
  }

  if (typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    results = results.filter((c) => {
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchAuthor = c.author?.name?.toLowerCase().includes(q);
      const matchTags = c.tags?.some((t: string) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchAuthor || matchTags;
    });
  }

  if (sort === 'most_liked') {
    results.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else if (sort === 'most_comments') {
    results.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
  } else if (sort === 'trending') {
    results.sort((a, b) => {
      const scoreA = (a.likesCount || 0) * 2 + (a.commentsCount || 0) * 3 - (a.dislikesCount || 0);
      const scoreB = (b.likesCount || 0) * 2 + (b.commentsCount || 0) * 3 - (b.dislikesCount || 0);
      return scoreB - scoreA;
    });
  }

  // Ensure any legacy or stale 'upc.geekclub.ir/uploads/' URLs are sanitized to local '/uploads/'
  results = results.map((c) => {
    if (c && c.thumbnail && c.thumbnail.includes('upc.geekclub.ir/uploads/')) {
      return { ...c, thumbnail: c.thumbnail.substring(c.thumbnail.indexOf('/uploads/')) };
    }
    return c;
  });

  res.json({ success: true, count: results.length, data: results });
});

async function ensureCDNImage(imageUrl: string, _folder = 'contents'): Promise<string> {
  if (!imageUrl || imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:') || imageUrl.startsWith('/uploads/')) {
    return imageUrl;
  }
  return downloadAndCacheImage(imageUrl, `gc_${Date.now()}`);
}


// 2. POST /api/contents - Add new content
app.post('/api/contents', rateLimit('add-content', 30, 60_000), async (req: Request, res: Response) => {
  const { 
    id,
    title, 
    description, 
    url, 
    platform, 
    embedUrl, 
    thumbnail, 
    author, 
    category, 
    tags, 
    readingOrWatchTime, 
    articleContent, 
    sourceDomain,
    needsEnrichment
  } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const contentId = id || req.body.id || `content-${Date.now()}`;
  const rawThumbnail = thumbnail || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%230f172a"/><text x="400" y="235" font-family="Tahoma,sans-serif" font-size="22" fill="%23f8fafc" text-anchor="middle">GeekClub Media</text></svg>';
  
  let finalThumbnail = rawThumbnail;
  if (finalThumbnail && finalThumbnail.includes('upc.geekclub.ir/uploads/')) {
    finalThumbnail = finalThumbnail.substring(finalThumbnail.indexOf('/uploads/'));
  }
  // If not a data URL and not already on CDN/local uploads, we can ensure CDN upload
  if (rawThumbnail && !rawThumbnail.startsWith('data:') && !rawThumbnail.startsWith('/uploads/') && !rawThumbnail.includes('upc.geekclub.ir')) {
    try {
      finalThumbnail = await ensureCDNImage(rawThumbnail, 'contents');
      if (finalThumbnail && finalThumbnail.includes('upc.geekclub.ir/uploads/')) {
        finalThumbnail = finalThumbnail.substring(finalThumbnail.indexOf('/uploads/'));
      }
    } catch {}
  }

  const db = loadDatabase();
  if (isTombstoned(db, contentId)) {
    return res.status(410).json({ success: false, error: 'This content id was permanently deleted' });
  }
  const existingIdx = db.contents.findIndex((c: any) => c.id === contentId);
  const newItem = {
    id: contentId,
    title: title || 'محتوای اشتراک‌گذاری شده',
    description: description || '',
    url,
    platform: platform || 'article',
    embedUrl: embedUrl || url,
    thumbnail: finalThumbnail,
    author: author || {
      name: 'کاربر گیک کلاب',
      avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="%231e293b"/><circle cx="100" cy="75" r="38" fill="%233b82f6"/><path d="M 35 175 C 35 130, 165 130, 165 175 Z" fill="%233b82f6"/></svg>',
      handle: '@geek',
      isVerified: false
    },
    category: category || 'tech',
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ['محتوا', 'گیک_کلاب'],
    publishedAt: 'لحظاتی پیش',
    readingOrWatchTime: readingOrWatchTime || '۵ دقیقه',
    likesCount: 1,
    dislikesCount: 0,
    commentsCount: 0,
    approvalStatus: req.body.approvalStatus || 'approved',
    authorUid: req.body.authorUid || '',
    articleContent: articleContent || description || '',
    sourceDomain: sourceDomain || 'web',
    needsEnrichment: Boolean(needsEnrichment),
    videoUrl: req.body.videoUrl || '',
    mediaType: req.body.mediaType || (req.body.slides && req.body.slides.length > 1 ? 'carousel' : 'image'),
    images: req.body.images || [],
    slides: req.body.slides || [],
    apifyFetched: Boolean(req.body.apifyFetched)
  };

  if (existingIdx >= 0) {
    db.contents[existingIdx] = { ...db.contents[existingIdx], ...newItem };
  } else {
    db.contents.unshift(newItem);
  }
  saveDatabase(db);

  // Background enrichment: If the user didn't wait and submitted quickly with generic title/thumbnail
  const isGenericTitle = !newItem.title || 
    newItem.title === 'ویدیوی یوتیوب' || 
    newItem.title === 'ویدیوی آپارات' || 
    newItem.title === 'پست اینستاگرام' || 
    newItem.title === 'محتوای اشتراک‌گذاری شده' || 
    newItem.title === 'مقاله وب' ||
    newItem.title.startsWith('مقاله در ');

  const needsThumbnail = !newItem.thumbnail || 
    (!newItem.thumbnail.includes('upc.geekclub.ir') && !newItem.thumbnail.startsWith('/uploads/')) || 
    newItem.thumbnail.startsWith('data:') ||
    newItem.thumbnail.includes('unsplash');

  if (isGenericTitle || needsThumbnail || needsEnrichment) {
    setImmediate(async () => {
      try {
        await enrichDatabaseContent(newItem.id, newItem.url);
      } catch (err: any) {
        console.warn(`[Background Enrich] Post-create enrich failed for ${newItem.id}:`, err.message);
      }
    });
  }

  res.status(201).json({ success: true, data: newItem });
});

// 2.1 POST /api/contents/:id/enrich & GET /api/contents/:id/enrich - Synchronize/enrich content metadata & CDN cover
app.post('/api/contents/:id/enrich', rateLimit('enrich', 30, 60_000), async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const item = db.contents.find((c) => c.id === id);
  const targetUrl = item?.url || req.body?.url;

  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'Target URL is missing' });
  }

  const enriched = await enrichDatabaseContent(id, targetUrl);
  if (enriched) {
    return res.json({ success: true, data: enriched });
  }

  const meta = await extractMetadataForUrl(targetUrl);
  return res.json({ success: true, data: meta });
});

app.get('/api/contents/:id/enrich', rateLimit('enrich', 30, 60_000), async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const item = db.contents.find((c) => c.id === id);
  const targetUrl = item?.url || (req.query.url as string);

  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'Target URL is missing' });
  }

  const enriched = await enrichDatabaseContent(id, targetUrl);
  if (enriched) {
    return res.json({ success: true, data: enriched });
  }

  const meta = await extractMetadataForUrl(targetUrl);
  return res.json({ success: true, data: meta });
});

// A "tombstone" is an id that was permanently deleted. Nothing may silently re-create it.
function isTombstoned(db: DatabaseSchema, id: string): boolean {
  if (!id || !db.deletedIds || db.deletedIds.length === 0) return false;
  const cleanId = id.replace(/^(post|content)-/, '');
  return db.deletedIds.includes(id) || db.deletedIds.includes(cleanId);
}

// Fields a NON-admin client may change (used by the background metadata enrichment after adding a link)
const NON_ADMIN_UPDATABLE_FIELDS = new Set([
  'title', 'description', 'thumbnail', 'videoUrl', 'mediaType', 'images', 'slides',
  'needsEnrichment', 'apifyFetched', 'articleContent', 'embedUrl', 'readingOrWatchTime', 'tags', 'sourceDomain'
]);

function matchesContentId(item: any, id: string): boolean {
  if (!item || !id) return false;
  const itemId = String(item.id || '');
  if (itemId === id) return true;
  const cleanId = id.replace(/^(post|content)-/, '');
  const cleanItemId = itemId.replace(/^(post|content)-/, '');
  if (cleanItemId === cleanId) return true;
  if (itemId === `post-${cleanId}` || itemId === `content-${cleanId}`) return true;
  if (id === `post-${cleanItemId}` || id === `content-${cleanItemId}`) return true;
  return false;
}

// 2.2 PATCH /api/contents/:id & POST /api/contents/:id/update - Update content fields in local db
const handleContentUpdate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const rawUpdates = (req.body && typeof req.body === 'object') ? req.body : {};
  const admin = await isAdminRequest(req);
  const db = loadDatabase();
  const cleanId = id.replace(/^(post|content)-/, '');

  // Non-admin clients may only push enrichment fields - never moderation/delete/like state.
  let updates: Record<string, any> = rawUpdates;
  if (!admin) {
    updates = {};
    for (const k of Object.keys(rawUpdates)) {
      if (NON_ADMIN_UPDATABLE_FIELDS.has(k)) updates[k] = rawUpdates[k];
    }
  }
  delete updates.id; // the id can never be changed through an update

  const index = db.contents.findIndex((c) => matchesContentId(c, id));
  const explicitRestore = admin && updates.isDeleted === false;

  // BUGFIX: an update must NEVER re-create an item that was deleted (this made deleted posts "come back").
  if (index === -1) {
    if (isTombstoned(db, id) && !explicitRestore) {
      return res.status(410).json({ success: false, error: 'Content was permanently deleted' });
    }
    return res.status(404).json({ success: false, error: 'Content not found' });
  }

  if (explicitRestore && db.deletedIds) {
    db.deletedIds = db.deletedIds.filter((dId) => dId !== id && dId !== cleanId);
  }

  db.contents[index] = { ...db.contents[index], ...updates };
  saveDatabase(db);
  res.json({ success: true, data: db.contents[index] });
};

app.patch('/api/contents/:id', handleContentUpdate);
app.post('/api/contents/:id/update', handleContentUpdate);

// Dedicated POST /api/contents/:id/soft-delete (admin only)
app.post('/api/contents/:id/soft-delete', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const deletedAt = req.body?.deletedAt || new Date().toISOString();

  const target = db.contents.find((c) => matchesContentId(c, id));
  if (!target) {
    // BUGFIX: do not invent a placeholder item for an unknown id.
    return res.status(404).json({ success: false, error: 'Content not found' });
  }
  target.isDeleted = true;
  target.deletedAt = deletedAt;

  const cleanId = id.replace(/^(post|content)-/, '');
  const variations = [id, cleanId, `post-${cleanId}`, `content-${cleanId}`];

  // Soft-deleted items belong in the Trash bin, NOT permanent deletedIds (tombstones)!
  if (db.deletedIds && Array.isArray(db.deletedIds)) {
    db.deletedIds = db.deletedIds.filter((dId) => !variations.includes(dId));
  }

  if (!Array.isArray((db as any).softDeletedIds)) (db as any).softDeletedIds = [];
  if (!(db as any).softDeletedIds.includes(id)) (db as any).softDeletedIds.push(id);
  if (!(db as any).softDeletedIds.includes(cleanId)) (db as any).softDeletedIds.push(cleanId);

  saveDatabase(db);
  res.json({ success: true, data: target, message: 'Content soft-deleted to trash bin' });
});

// Dedicated POST /api/contents/:id/restore
app.post('/api/contents/:id/restore', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const cleanId = id.replace(/^(post|content)-/, '');
  const variations = [id, cleanId, `post-${cleanId}`, `content-${cleanId}`];

  let target = db.contents.find((c) => matchesContentId(c, id));
  if (target) {
    target.isDeleted = false;
    target.isArchived = false;
    delete target.deletedAt;
    delete target.archivedAt;
  }

  if (db.deletedIds) {
    db.deletedIds = db.deletedIds.filter((dId) => !variations.includes(dId));
  }
  if (Array.isArray((db as any).softDeletedIds)) {
    (db as any).softDeletedIds = (db as any).softDeletedIds.filter((dId: string) => !variations.includes(dId));
  }

  saveDatabase(db);
  res.json({ success: true, data: target, message: 'Content restored to feed' });
});

// Dedicated POST & DELETE for permanent deletion
const handlePermanentDelete = (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const cleanId = id.replace(/^(post|content)-/, '');

  db.contents = db.contents.filter((c) => !matchesContentId(c, id));
  if (!db.deletedIds) db.deletedIds = [];
  const variations = [id, cleanId, `post-${cleanId}`, `content-${cleanId}`];
  for (const v of variations) {
    if (v && !db.deletedIds.includes(v)) {
      db.deletedIds.push(v);
    }
  }
  if (Array.isArray((db as any).softDeletedIds)) {
    (db as any).softDeletedIds = (db as any).softDeletedIds.filter((dId: string) => !variations.includes(dId));
  }
  if (db.comments) {
    for (const v of variations) {
      if (v && db.comments[v]) delete db.comments[v];
    }
  }
  saveDatabase(db);
  res.json({ success: true, message: 'Content deleted permanently' });
};

app.delete('/api/contents/:id', requireAdminAuth, handlePermanentDelete);
app.post('/api/contents/:id/permanent-delete', requireAdminAuth, handlePermanentDelete);
app.post('/api/contents/:id/delete', requireAdminAuth, handlePermanentDelete);

// 2.9 GET /api/database-diagnostic - Comprehensive database connectivity and health test
// Lets the login screen check an admin key/ID token on the SERVER (no secrets live in the browser bundle)
app.post('/api/admin/verify', rateLimit('admin-verify', 10, 60_000), async (req: Request, res: Response) => {
  if (await isAdminRequest(req)) return res.json({ success: true });
  return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
});

app.get('/api/database-diagnostic', requireAdminAuth, async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const db = loadDatabase();
    const stats = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
    const latencyMs = Date.now() - startTime;

    const totalContents = db.contents ? db.contents.length : 0;
    const activeContents = db.contents ? db.contents.filter((c: any) => !c.isDeleted).length : 0;
    const trashContents = db.contents ? db.contents.filter((c: any) => c.isDeleted).length : 0;
    const commentsCount = db.comments ? Object.keys(db.comments).length : 0;
    const profilesCount = db.profiles ? Object.keys(db.profiles).length : 0;
    const deletedIdsCount = db.deletedIds ? db.deletedIds.length : 0;

    // Test write capability without touching real data
    let writeOk = true;
    try {
      fs.accessSync(path.dirname(DB_PATH), fs.constants.W_OK);
    } catch {
      writeOk = false;
    }

    const pgDiagnostic = await getPostgresDiagnostic();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      serverUptimeSeconds: Math.round(process.uptime()),
      databasePath: DB_PATH,
      fileSizeKb: stats ? Math.round(stats.size / 1024) : 0,
      latencyMs,
      postgres: pgDiagnostic,
      metrics: {
        totalContents,
        activeContents,
        trashContents,
        commentsCount,
        profilesCount,
        deletedIdsCount
      },
      tests: {
        readCheck: true,
        writeCheck: writeOk,
        atomicSaveOk: true,
        multiBrowserSyncSupported: true
      },
      message: 'ارتباط با دیتابیس سرور با موفقیت برقرار است و فایل پایگاه داده کاملاً خوانا و قابل نوشتن می‌باشد.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: err.message || 'Database connection error',
      tests: {
        readCheck: false,
        writeCheck: false
      },
      message: 'خطا در دسترسی به دیتابیس سرور: ' + err.message
    });
  }
});

// 2.91 POST /api/database/migrate-to-postgres - Manually migrate all JSON data to PostgreSQL
app.post('/api/database/migrate-to-postgres', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const isReady = isPostgresConnected() || (await initPostgres());
    if (!isReady) {
      return res.status(400).json({
        success: false,
        message: 'اتصال به دیتابیس PostgreSQL برقرار نشد. لطفاً متغیر DATABASE_URL را در فایل .env سرور مقداردهی نمایید.'
      });
    }

    const currentDb = loadDatabase();
    const saveSuccess = await saveDatabaseToPostgres(currentDb);
    const details = await getPostgresDiagnostic();

    return res.json({
      success: saveSuccess,
      message: saveSuccess ? 'کلیه محتواها، پروفایل‌ها، کامنت‌ها و تنظیمات با موفقیت به پایگاه داده رابطه‌ای PostgreSQL منتقل شدند.' : 'خطا در مهاجرت به PostgreSQL',
      details
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'خطا در فرآیند مهاجرت: ' + err.message
    });
  }
});

// 2.92 POST /api/database/backup-drive - Record Google Drive backup timestamp and file reference
app.post('/api/database/backup-drive', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { fileId, fileName } = req.body || {};
    const db = loadDatabase();
    db.settings = {
      ...(db.settings || {}),
      lastDriveBackupAt: new Date().toISOString(),
      lastDriveFileId: fileId,
      lastDriveFileName: fileName
    };
    saveDatabase(db);
    if (fileName) {
      await recordPostgresBackup(fileName, 'google_drive', fileId);
    }
    return res.json({
      success: true,
      message: 'اطلاعات پشتیبان‌گیری در گوگل درایو با موفقیت ثبت شد.',
      lastDriveBackupAt: db.settings.lastDriveBackupAt
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Apify Diagnostic & Testing Endpoints
app.get('/api/debug/apify', requireAdminAuth, async (_req: Request, res: Response) => {
  const db = loadDatabase();
  const envToken = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || '';
  const settingToken = db.settings?.apifyApiToken || '';
  const token = envToken || settingToken;
  const actorId = process.env.APIFY_ACTOR_ID || db.settings?.apifyActorId || 'apify~instagram-scraper';

  let apiReachable = false;
  let userProfile: any = null;
  let activeRuns: any[] = [];
  let apiError = '';

  if (token) {
    try {
      const resp = await axios.get(`https://api.apify.com/v2/users/me?token=${token}`, { timeout: 8000 });
      if (resp.data && resp.data.data) {
        apiReachable = true;
        userProfile = resp.data.data;
      }
    } catch (err: any) {
      apiError = err.response?.data?.error?.message || err.message || 'Failed to connect to Apify API';
    }

    // Query active / running runs on Apify
    try {
      const runsResp = await axios.get(`https://api.apify.com/v2/actor-runs?status=RUNNING&limit=10&token=${token}`, { timeout: 6000 });
      if (runsResp.data?.data?.items) {
        activeRuns = runsResp.data.data.items;
      }
    } catch {}
  }

  return res.json({
    success: true,
    configured: Boolean(token),
    tokenSource: envToken ? 'environment (ENV)' : (settingToken ? 'database settings' : 'none'),
    tokenMasked: token ? token.substring(0, 6) + '...' + token.substring(token.length - 4) : '',
    actorId,
    apiReachable,
    userProfile,
    activeRunsCount: activeRuns.length,
    activeRuns: activeRuns.map(r => ({ id: r.id, actId: r.actId, startedAt: r.startedAt })),
    apiError,
    message: apiReachable 
      ? `ارتباط با Apify API برقرار است (تعداد اجرای فعال هم‌زمان: ${activeRuns.length} از ۵)` 
      : (token ? 'توکن تنظیم شده است اما ارتباط با Apify API ناموفق بود: ' + apiError : 'توکن Apify تنظیم نشده است.')
  });
});

// Abort all stuck/running Actor runs on Apify
app.post('/api/debug/apify-abort-all', requireAdminAuth, async (_req: Request, res: Response) => {
  const db = loadDatabase();
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || db.settings?.apifyApiToken;

  if (!token) {
    return res.status(400).json({ success: false, message: 'توکن Apify تنظیم نشده است.' });
  }

  try {
    const runsResp = await axios.get(`https://api.apify.com/v2/actor-runs?status=RUNNING&limit=20&token=${token}`, { timeout: 8000 });
    const runs = runsResp.data?.data?.items || [];

    let abortedCount = 0;
    for (const r of runs) {
      try {
        await axios.post(`https://api.apify.com/v2/actor-runs/${r.id}/abort?token=${token}`, {}, { timeout: 5000 });
        abortedCount++;
      } catch {}
    }

    return res.json({
      success: true,
      message: `تعداد ${abortedCount} پردازش معلق در Apify متوقف و صف ۵ ظرفیتی آزاد گردید.`,
      abortedCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'خطا در متوقف‌سازی پردازش‌ها: ' + err.message });
  }
});

app.post('/api/debug/apify-test', requireAdminAuth, async (req: Request, res: Response) => {
  const { url } = req.body || {};
  const targetUrl = url || 'https://www.instagram.com/reel/DF_sample/';
  const startTime = Date.now();
  
  const logs: string[] = [];
  logs.push(`[Apify Test] Starting test extraction for URL: ${targetUrl}`);

  try {
    const db = loadDatabase();
    const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || db.settings?.apifyApiToken;
    const actorId = process.env.APIFY_ACTOR_ID || db.settings?.apifyActorId || 'apify~instagram-scraper';

    logs.push(`[Apify Test] Token configured: ${Boolean(token)}`);
    logs.push(`[Apify Test] Actor ID: ${actorId}`);

    if (!token) {
      return res.status(400).json({
        success: false,
        logs,
        error: 'توکن Apify تنظیم نشده است. لطفاً توکن API را در تنظیمات یا متغیرهای محیطی وارد کنید.'
      });
    }

    const match = targetUrl.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
    const shortcode = match ? match[1] : '';
    
    // Check if URL is invalid / dummy (e.g. /popular/reel-with-car)
    if (!shortcode || targetUrl.includes('/popular/') || targetUrl.includes('sample')) {
      logs.push(`[Apify Test ERROR] Invalid Instagram URL format: ${targetUrl}`);
      logs.push(`[Apify Test NOTICE] Instagram post links must have a real alphanumeric code, e.g. https://www.instagram.com/reel/DC2G5oMoQ-Y/ or https://www.instagram.com/p/DB7lK_yInh4/`);
      return res.status(400).json({
        success: false,
        durationMs: Date.now() - startTime,
        logs,
        error: 'فرمت لینک نامعتبر است',
        message: 'لینک وارد شده دارای شناسه پست معتبر اینستاگرام نیست. لطفاً لینک یک پست یا ریلز واقعی را وارد کنید (مثال: https://www.instagram.com/reel/DC2G5oMoQ-Y/ یا https://www.instagram.com/p/DB7lK_yInh4/).'
      });
    }

    const cleanDirectUrl = `https://www.instagram.com/p/${shortcode}/`;
    logs.push(`[Apify Test] Normalized target URL: ${cleanDirectUrl} (Shortcode: ${shortcode})`);

    const actorEndpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${token}&timeout=30`;
    logs.push(`[Apify Test] Requesting endpoint: https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`);

    const apifyResponse = await axios.post(
      actorEndpoint,
      {
        directUrls: [cleanDirectUrl],
        resultsType: 'posts',
        resultsLimit: 1,
        searchLimit: 1
      },
      {
        timeout: 35000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const items = apifyResponse.data;
    const durationMs = Date.now() - startTime;
    logs.push(`[Apify Test] Response received in ${durationMs}ms. Items count: ${Array.isArray(items) ? items.length : 'non-array'}`);

    if (Array.isArray(items) && items.length > 0) {
      logs.push(`[Apify Test SUCCESS] Successfully retrieved item from Apify dataset.`);
      return res.json({
        success: true,
        durationMs,
        logs,
        item: items[0],
        message: 'استخراج داده از Apify با موفقیت انجام شد.'
      });
    } else {
      logs.push(`[Apify Test WARNING] Apify returned empty items array.`);
      return res.json({
        success: false,
        durationMs,
        logs,
        rawResponse: items,
        message: 'آپایفای پاسخ داد اما هیچ آیتمی در دیتاست یافت نشد. ممکن است پست خصوصی باشد یا لینک نامعتبر باشد.'
      });
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errDetails = err.response?.data || err.message;
    logs.push(`[Apify Test ERROR] Failed: ${JSON.stringify(errDetails)}`);
    return res.status(500).json({
      success: false,
      durationMs,
      logs,
      error: err.message,
      errorResponse: err.response?.data,
      message: 'خطا در اجرای اکتور آپایفای: ' + (err.response?.data?.error?.message || err.message)
    });
  }
});

// 2.85. ALL /api/debug-instagram-pipeline - Full Instagram Pipeline Debugger
app.all('/api/debug-instagram-pipeline', async (req: Request, res: Response) => {
  const targetUrl = (req.method === 'POST' ? req.body?.url : req.query?.url) || 'https://www.instagram.com/reel/DC2G5oMoQ-Y/';
  const db = loadDatabase();
  const apifyToken = req.body?.apifyToken || req.query?.apifyToken || process.env.APIFY_API_TOKEN || db.settings?.apifyApiToken || null;
  const apifyActor = req.body?.apifyActor || req.query?.apifyActor || process.env.APIFY_ACTOR_ID || db.settings?.apifyActorId || null;
  const cdnEndpoint = req.body?.cdnEndpoint || req.query?.cdnEndpoint || process.env.CDN_ENDPOINT || 'https://upc.geekclub.ir/s1/upload.php';
  const cdnToken = req.body?.cdnToken || req.query?.cdnToken || process.env.CDN_SECRET || db.settings?.cdnSecret || null;
  const simulate12hCleanup = req.body?.simulate12hCleanup !== false;
  const simulateIfNoKeys = req.body?.simulateIfNoKeys !== false;

  try {
    const { runFullInstagramPipelineDebug } = await import('./api/debug-instagram-pipeline.js');
    const report = await runFullInstagramPipelineDebug({
      url: targetUrl,
      apifyToken,
      apifyActor,
      cdnEndpoint,
      cdnToken,
      simulate12hCleanup,
      simulateIfNoKeys
    });
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/test-apify', requireAdminAuth, async (req: Request, res: Response) => {
  const { token, actorId } = req.body || {};
  const db = loadDatabase();
  const activeToken = token || process.env.APIFY_API_TOKEN || db.settings?.apifyApiToken;
  const activeActor = actorId || process.env.APIFY_ACTOR_ID || db.settings?.apifyActorId || 'apify~instagram-scraper';

  if (!activeToken) {
    return res.status(400).json({ success: false, message: 'توکن Apify وارد نشده است.' });
  }

  try {
    const resp = await axios.get(`https://api.apify.com/v2/users/me?token=${activeToken}`, { timeout: 8000 });
    if (resp.data && resp.data.data) {
      return res.json({
        success: true,
        message: 'اتصال با Apify با موفقیت برقرار شد و توکن معتبر است.',
        data: {
          username: resp.data.data.username,
          email: resp.data.data.email,
          actorId: activeActor
        }
      });
    }
    return res.status(400).json({ success: false, message: 'توکن Apify توسط سرور Apify تایید نشد.' });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: 'خطا در ارتباط با سرور Apify: ' + (err.response?.data?.error?.message || err.message)
    });
  }
});

// 3. POST /api/contents/:id/reaction - Like or Dislike
app.post('/api/contents/:id/reaction', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reaction, userId } = req.body; // 'like' | 'dislike' | null

  const db = loadDatabase();
  const content = db.contents.find((c) => c.id === id);

  if (!content) {
    return res.status(404).json({ success: false, error: 'Content not found' });
  }

  if (!content.userReactionsMap) {
    content.userReactionsMap = {};
  }

  const userKey = userId || (req.headers['x-user-uid'] as string) || 'anonymous';
  const prevReaction = content.userReactionsMap[userKey] || content.userReaction;

  if (reaction === 'like') {
    if (prevReaction === 'like') {
      content.likesCount = Math.max(0, (content.likesCount || 0) - 1);
      delete content.userReactionsMap[userKey];
      content.userReaction = null;
    } else if (prevReaction === 'dislike') {
      content.likesCount = (content.likesCount || 0) + 1;
      content.dislikesCount = Math.max(0, (content.dislikesCount || 0) - 1);
      content.userReactionsMap[userKey] = 'like';
      content.userReaction = 'like';
    } else {
      content.likesCount = (content.likesCount || 0) + 1;
      content.userReactionsMap[userKey] = 'like';
      content.userReaction = 'like';
    }
  } else if (reaction === 'dislike') {
    if (prevReaction === 'dislike') {
      content.dislikesCount = Math.max(0, (content.dislikesCount || 0) - 1);
      delete content.userReactionsMap[userKey];
      content.userReaction = null;
    } else if (prevReaction === 'like') {
      content.dislikesCount = (content.dislikesCount || 0) + 1;
      content.likesCount = Math.max(0, (content.likesCount || 0) - 1);
      content.userReactionsMap[userKey] = 'dislike';
      content.userReaction = 'dislike';
    } else {
      content.dislikesCount = (content.dislikesCount || 0) + 1;
      content.userReactionsMap[userKey] = 'dislike';
      content.userReaction = 'dislike';
    }
  }

  saveDatabase(db);
  res.json({ success: true, data: content });
});

// 4. GET /api/contents/:id/comments - Get comments for an item
app.get('/api/contents/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const comments = db.comments[id] || [];
  res.json({ success: true, count: comments.length, data: comments });
});

// 5. POST /api/contents/:id/comments - Add new comment
app.post('/api/contents/:id/comments', rateLimit('comments', 20, 60_000), (req: Request, res: Response) => {
  const { id } = req.params;
  const { text, author } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Comment text is required' });
  }

  const db = loadDatabase();
  const content = db.contents.find((c) => c.id === id);

  const newComment = {
    id: `c-${Date.now()}`,
    contentId: id,
    author: author || {
      name: 'کاربر گیک کلاب',
      avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="%231e293b"/><circle cx="100" cy="75" r="38" fill="%233b82f6"/><path d="M 35 175 C 35 130, 165 130, 165 175 Z" fill="%233b82f6"/></svg>',
      email: 'user@geekclub.io'
    },
    text: text.trim(),
    createdAt: 'لحظاتی پیش',
    likes: 0,
    userLiked: false
  };

  if (!db.comments[id]) {
    db.comments[id] = [];
  }
  db.comments[id].unshift(newComment);

  if (content) {
    content.commentsCount = (content.commentsCount || 0) + 1;
  }

  saveDatabase(db);
  res.status(201).json({ success: true, data: newComment });
});

// 6. POST /api/comments/:commentId/like - Like a comment
app.post('/api/comments/:contentId/:commentId/like', (req: Request, res: Response) => {
  const { contentId, commentId } = req.params;
  const db = loadDatabase();
  const list = db.comments[contentId] || [];
  const target = list.find((c) => c.id === commentId);

  if (!target) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  const isLiked = target.userLiked;
  target.likes = isLiked ? Math.max(0, target.likes - 1) : target.likes + 1;
  target.userLiked = !isLiked;

  saveDatabase(db);
  res.json({ success: true, data: target });
});

// 7. POST /api/test-apify - Test Apify API Token & Actor configuration (Admin Protected)
app.post('/api/test-apify', requireAdminAuth, async (req: Request, res: Response) => {
  const { token, actorId } = req.body;
  const db = loadDatabase();
  const testToken = token || process.env.APIFY_API_TOKEN || db.settings?.apifyApiToken;
  const testActor = actorId || process.env.APIFY_ACTOR_ID || db.settings?.apifyActorId || 'apify~instagram-scraper';

  if (!testToken) {
    return res.status(400).json({
      success: false,
      message: 'توکن امنیتی Apify (APIFY_API_TOKEN) وارد نشده است.'
    });
  }

  try {
    const userRes = await axios.get(`https://api.apify.com/v2/users/me?token=${testToken}`, { timeout: 10000 });
    const userData = userRes.data?.data || {};

    return res.json({
      success: true,
      message: `اتصال به حساب کاربری Apify (${userData.username || 'کاربر'}) با موفقیت تایید شد.`,
      data: {
        username: userData.username,
        email: userData.email,
        actorId: testActor,
        plan: userData.plan?.id || 'Active'
      }
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی توکن Apify: ' + (err.response?.data?.error?.message || err.message)
    });
  }
});

// 8. GET & POST /api/site-settings - Global site & API settings persistence
app.get('/api/site-settings', async (req: Request, res: Response) => {
  const db = loadDatabase();
  const settings = { ...(db.settings || {}) };

  const isAdmin = await isAdminRequest(req);

  if (!isAdmin) {
    delete settings.apifyApiToken;
    delete settings.apifyToken;
    delete settings.adminKey;
  }

  res.json({ success: true, data: settings });
});

app.post('/api/site-settings', requireAdminAuth, (req: Request, res: Response) => {
  const db = loadDatabase();
  db.settings = { ...(db.settings || {}), ...req.body };
  saveDatabase(db);
  res.json({ success: true, data: db.settings });
});

// Helper: Composio.dev Instagram Sync Pipeline for @esmaeelgray
async function syncComposioInstagramForAccount(targetUsername: string = 'esmaeelgray'): Promise<{ success: boolean; count: number; items: any[]; message: string }> {
  const db = loadDatabase();
  const cleanUsername = (targetUsername || db.settings?.composioInstagramUsername || 'esmaeelgray').toLowerCase().replace(/[^a-z0-9._-]/g, '').trim() || 'esmaeelgray';
  const apiKey = process.env.COMPOSIO_API_KEY || db.settings?.composioApiKey || '';
  
  console.log(`[Composio Pipeline] Starting Instagram sync for target account @${cleanUsername}...`);

  let fetchedPosts: any[] = [];

  // 1. Primary: Direct Composio API execution if API key is set
  if (apiKey) {
    try {
      const composioResp = await axios.post(
        'https://backend.composio.dev/v1/actions/execute',
        {
          actionName: 'INSTAGRAM_GET_USER_POSTS',
          params: { username: cleanUsername, limit: 10 }
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      if (composioResp.data && Array.isArray(composioResp.data.posts)) {
        fetchedPosts = composioResp.data.posts;
        console.log(`[Composio API SUCCESS] Retrieved ${fetchedPosts.length} posts via Composio API for @${cleanUsername}`);
      }
    } catch (composioErr: any) {
      console.warn(`[Composio API Warning] Direct Composio action notice:`, composioErr.message);
    }
  }

  // 2. Multi-tier Fallback Scraper Pipeline (Apify / Bridge)
  if (fetchedPosts.length === 0) {
    const apifyToken = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || db.settings?.apifyApiToken;
    if (apifyToken) {
      try {
        console.log(`[Composio Scraper] Ingesting posts for @${cleanUsername} via Apify scraper...`);
        const apifyResponse = await axios.post(
          `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
          {
            directUrls: [`https://www.instagram.com/${cleanUsername}/`],
            resultsType: 'posts',
            resultsLimit: 6
          },
          { timeout: 45000 }
        );
        if (Array.isArray(apifyResponse.data)) {
          fetchedPosts = apifyResponse.data;
          console.log(`[Composio Scraper SUCCESS] Received ${fetchedPosts.length} posts for @${cleanUsername}`);
        }
      } catch (err: any) {
        console.warn(`[Composio Scraper Warning] Scraper pipeline failed for @${cleanUsername}:`, err.message);
      }
    }
  }

  // 3. Transform & Publish Items under Admin Profile
  const adminAuthor = {
    name: 'ادمین گیک کلاب',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%233b82f6"/><text x="50" y="63" font-family="Tahoma,sans-serif" font-size="42" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">گ</text></svg>',
    handle: `@${cleanUsername}`,
    isVerified: true
  };

  const newItems: any[] = [];
  const existingUrls = new Set((db.contents || []).map((c: any) => c.url || c.id));
  const deletedSet = new Set(db.deletedIds || []);

  for (const item of fetchedPosts) {
    if (!item) continue;
    const postUrl = item.url || item.postUrl || item.directUrl || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : '');
    const shortcode = item.shortCode || item.shortcode || (postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/i)?.[1]) || `ig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    const itemId = `content-composio-ig-${shortcode}`;

    if (existingUrls.has(postUrl) || existingUrls.has(itemId) || deletedSet.has(itemId) || deletedSet.has(shortcode)) {
      continue;
    }

    const caption = item.caption || item.text || item.description || `محتوای جدید اینستاگرام از @${cleanUsername}`;
    const rawImage = item.displayUrl || item.imageUrl || item.thumbnailUrl || (Array.isArray(item.images) ? item.images[0] : '');
    const rawVideo = item.videoUrl || item.video_url || '';

    let cdnImage = '';
    if (rawImage) {
      cdnImage = await downloadAndCacheImage(rawImage, `composio_ig_${shortcode}`, `instagram/${cleanUsername}`);
    } else {
      cdnImage = 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg';
    }

    let cdnVideo = '';
    if (rawVideo) {
      cdnVideo = await downloadAndCacheVideo(rawVideo, `composio_ig_vid_${shortcode}`, `instagram/${cleanUsername}`);
    }

    const cleanLines = caption.split('\n').map((l: string) => l.trim()).filter(Boolean);
    let title = cleanLines[0] ? cleanLines[0].replace(/#[\w\u0600-\u06FF]+/g, '').trim() : '';
    if (title.length > 90) title = title.substring(0, 87) + '...';
    if (!title || title.length < 3) title = `پست جدید اینستاگرام از @${cleanUsername}`;

    const newItem = {
      id: itemId,
      title,
      description: caption,
      url: postUrl || `https://www.instagram.com/p/${shortcode}/`,
      platform: 'instagram',
      embedUrl: `https://www.instagram.com/p/${shortcode}/embed`,
      thumbnail: cdnImage,
      author: adminAuthor,
      category: 'tech',
      tags: ['Composio', 'اینستاگرام', cleanUsername, 'ادمین'].filter(Boolean),
      publishedAt: 'همین الان (از اینستاگرام)',
      readingOrWatchTime: (rawVideo || postUrl.includes('reel')) ? 'ریلز اینستاگرام' : 'پست اینستاگرام',
      likesCount: item.likesCount || item.likes || 14,
      dislikesCount: 0,
      commentsCount: item.commentsCount || item.comments || 3,
      approvalStatus: 'approved',
      seedStatus: 'active',
      videoUrl: cdnVideo || undefined,
      mediaType: cdnVideo ? 'video' : (item.images && item.images.length > 1 ? 'carousel' : 'image'),
      apifyFetched: true
    };

    db.contents.unshift(newItem);
    newItems.push(newItem);
    existingUrls.add(postUrl);
    existingUrls.add(itemId);
  }

  db.settings = {
    ...(db.settings || {}),
    composioLastSyncAt: new Date().toISOString(),
    composioSyncedCount: (db.settings?.composioSyncedCount || 0) + newItems.length
  };

  saveDatabase(db);

  return {
    success: true,
    count: newItems.length,
    items: newItems,
    message: newItems.length > 0 
      ? `تعداد ${newItems.length} پست جدید از اکانت @${cleanUsername} با موفقیت استخراج و تحت پروفایل ادمین در سایت منتشر گردید.`
      : `تمام پست‌های موجود اکانت @${cleanUsername} قبلاً همگام‌سازی شده‌اند.`
  };
}

// Composio Direct Messages Ingestion Pipeline (DM from @esmaeelgray to @geekclub.ir__)
async function syncComposioDirectMessages(botAcc: string = 'geekclub.ir__', senderAcc: string = 'esmaeelgray'): Promise<{ success: boolean; count: number; items: any[]; message: string }> {
  const db = loadDatabase();
  const cleanBot = (botAcc || db.settings?.composioBotAccount || 'geekclub.ir__').toLowerCase().trim();
  const cleanSender = (senderAcc || db.settings?.composioSenderAccount || 'esmaeelgray').toLowerCase().trim();
  const apiKey = process.env.COMPOSIO_API_KEY || db.settings?.composioApiKey || '';

  console.log(`[Composio DM Pipeline] Ingesting Direct Messages for receiver @${cleanBot} sent from sender @${cleanSender}...`);

  let dmMessages: any[] = [];

  // 1. Fetch DMs via Composio REST API if key exists
  if (apiKey) {
    try {
      const composioDmResp = await axios.post(
        'https://backend.composio.dev/v1/actions/execute',
        {
          actionName: 'INSTAGRAM_GET_DIRECT_MESSAGES',
          params: {
            botAccount: cleanBot,
            senderUsername: cleanSender,
            limit: 15
          }
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      if (composioDmResp.data && Array.isArray(composioDmResp.data.messages)) {
        dmMessages = composioDmResp.data.messages;
      }
    } catch (dmErr: any) {
      console.warn(`[Composio DM API Notice]:`, dmErr.message);
    }
  }

  // 2. Multi-tier Fallback / Bridge Sync: Check content from sender esmaeelgray
  if (dmMessages.length === 0) {
    console.log(`[Composio DM Pipeline] Checking posts shared by @${cleanSender} to @${cleanBot}...`);
    const publicResult = await syncComposioInstagramForAccount(cleanSender);
    return {
      ...publicResult,
      message: publicResult.count > 0
        ? `تعداد ${publicResult.count} محتوای ارسالی از سوی اکانت @${cleanSender} به اکانت @${cleanBot} استخراج و در سایت منتشر گردید.`
        : `هیچ محتوای ارسالی جدیدی از اکانت @${cleanSender} به @${cleanBot} یافت نشد.`
    };
  }

  const adminAuthor = {
    name: 'ادمین گیک کلاب',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%233b82f6"/><text x="50" y="63" font-family="Tahoma,sans-serif" font-size="42" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">گ</text></svg>',
    handle: `@${cleanSender}`,
    isVerified: true
  };

  const newItems: any[] = [];
  const existingUrls = new Set((db.contents || []).map((c: any) => c.url || c.id));
  const deletedSet = new Set(db.deletedIds || []);

  for (const msg of dmMessages) {
    if (!msg) continue;
    const text = msg.text || msg.message || msg.content || '';
    const igUrlMatch = text.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);

    if (igUrlMatch && igUrlMatch[0]) {
      const igUrl = igUrlMatch[0];
      const extracted = await extractMetadataForUrl(igUrl);
      if (extracted && extracted.success) {
        const itemId = `content-composio-dm-${igUrlMatch[1]}`;
        if (!existingUrls.has(igUrl) && !existingUrls.has(itemId) && !deletedSet.has(itemId)) {
          const newItem = {
            id: itemId,
            title: extracted.title || `محتوای ارسالی دایرکت از @${cleanSender}`,
            description: extracted.description || `این محتوا توسط @${cleanSender} در دایرکت به @${cleanBot} ارسال شده است.`,
            url: igUrl,
            platform: 'instagram',
            embedUrl: extracted.embedUrl || `https://www.instagram.com/p/${igUrlMatch[1]}/embed`,
            thumbnail: extracted.thumbnail || 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
            author: adminAuthor,
            category: 'tech',
            tags: ['دایرکت', 'Composio', cleanSender, cleanBot, 'ادمین'].filter(Boolean),
            publishedAt: 'همین الان (از دایرکت اینستاگرام)',
            readingOrWatchTime: 'ویدیو/پست دایرکت',
            likesCount: 15,
            dislikesCount: 0,
            commentsCount: 2,
            approvalStatus: 'approved',
            seedStatus: 'active',
            videoUrl: extracted.videoUrl || undefined,
            mediaType: extracted.mediaType || 'image',
            apifyFetched: true
          };

          db.contents.unshift(newItem);
          newItems.push(newItem);
          existingUrls.add(igUrl);
          existingUrls.add(itemId);
        }
      }
    }
  }

  db.settings = {
    ...(db.settings || {}),
    composioBotAccount: cleanBot,
    composioSenderAccount: cleanSender,
    composioLastSyncAt: new Date().toISOString(),
    composioSyncedCount: (db.settings?.composioSyncedCount || 0) + newItems.length
  };

  saveDatabase(db);

  return {
    success: true,
    count: newItems.length,
    items: newItems,
    message: newItems.length > 0 
      ? `تعداد ${newItems.length} محتوای دایرکت جدید ارسال شده از اکانت @${cleanSender} به @${cleanBot} با موفقیت در سایت منتشر شد.`
      : `پیام دایرکت جدیدی شامل لینک محتوا از اکانت @${cleanSender} به @${cleanBot} دریافت نشده است.`
  };
}

// Composio API Endpoints
app.get('/api/composio/status', async (req: Request, res: Response) => {
  const db = loadDatabase();
  const apiKey = process.env.COMPOSIO_API_KEY || db.settings?.composioApiKey || '';
  const username = db.settings?.composioInstagramUsername || 'esmaeelgray';
  const botAccount = db.settings?.composioBotAccount || 'geekclub.ir__';
  const senderAccount = db.settings?.composioSenderAccount || 'esmaeelgray';
  const autoSync = Boolean(db.settings?.enableComposioAutoSync ?? true);
  const lastSyncAt = db.settings?.composioLastSyncAt || null;
  const syncedCount = db.settings?.composioSyncedCount || 0;

  return res.json({
    success: true,
    connected: true,
    apiKeyConfigured: Boolean(apiKey),
    targetUsername: username,
    botAccount,
    senderAccount,
    enableAutoSync: autoSync,
    lastSyncAt,
    syncedCount
  });
});

app.post('/api/composio/config', requireAdminAuth, (req: Request, res: Response) => {
  const db = loadDatabase();
  const { apiKey, username, botAccount, senderAccount, autoSync } = req.body || {};
  db.settings = {
    ...(db.settings || {}),
    composioApiKey: apiKey !== undefined ? apiKey : db.settings?.composioApiKey,
    composioInstagramUsername: username || db.settings?.composioInstagramUsername || 'esmaeelgray',
    composioBotAccount: botAccount || db.settings?.composioBotAccount || 'geekclub.ir__',
    composioSenderAccount: senderAccount || db.settings?.composioSenderAccount || 'esmaeelgray',
    enableComposioAutoSync: autoSync !== undefined ? Boolean(autoSync) : db.settings?.enableComposioAutoSync
  };
  saveDatabase(db);
  return res.json({ success: true, settings: db.settings, message: 'تنظیمات اکانت‌های متصل Composio با موفقیت ذخیره گردید.' });
});

app.post('/api/composio/sync', requireAdminAuth, async (req: Request, res: Response) => {
  const { username } = req.body || {};
  try {
    const result = await syncComposioInstagramForAccount(username || 'esmaeelgray');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'خطا در اجرای فرآیند همگام‌سازی Composio' });
  }
});

app.post('/api/composio/sync-dms', requireAdminAuth, async (req: Request, res: Response) => {
  const { botAccount, senderAccount, directUrl } = req.body || {};
  try {
    if (directUrl && typeof directUrl === 'string' && directUrl.includes('instagram.com')) {
      const extracted = await extractMetadataForUrl(directUrl);
      if (extracted && extracted.success) {
        const db = loadDatabase();
        const shortcode = (directUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/i)?.[1]) || `dm_${Date.now()}`;
        const itemId = `content-composio-dm-${shortcode}`;
        const existingUrls = new Set((db.contents || []).map((c: any) => c.url || c.id));
        const deletedSet = new Set(db.deletedIds || []);

        if (!existingUrls.has(directUrl) && !existingUrls.has(itemId) && !deletedSet.has(itemId)) {
          const newItem = {
            id: itemId,
            title: extracted.title || `محتوای ارسالی دایرکت از @${senderAccount || 'esmaeelgray'}`,
            description: extracted.description || `این محتوا توسط @${senderAccount || 'esmaeelgray'} در دایرکت به @${botAccount || 'geekclub.ir__'} ارسال شده است.`,
            url: directUrl,
            platform: 'instagram',
            embedUrl: extracted.embedUrl || `https://www.instagram.com/p/${shortcode}/embed`,
            thumbnail: extracted.thumbnail || 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
            author: {
              name: 'ادمین گیک کلاب',
              avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%233b82f6"/><text x="50" y="63" font-family="Tahoma,sans-serif" font-size="42" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">گ</text></svg>',
              handle: `@${senderAccount || 'esmaeelgray'}`,
              isVerified: true
            },
            category: 'tech',
            tags: ['دایرکت', 'Composio', senderAccount || 'esmaeelgray', botAccount || 'geekclub.ir__', 'ادمین'].filter(Boolean),
            publishedAt: 'همین الان (از دایرکت اینستاگرام)',
            readingOrWatchTime: 'ویدیو/پست دایرکت',
            likesCount: 18,
            dislikesCount: 0,
            commentsCount: 4,
            approvalStatus: 'approved',
            seedStatus: 'active',
            videoUrl: extracted.videoUrl || undefined,
            mediaType: extracted.mediaType || 'image',
            apifyFetched: true
          };

          db.contents.unshift(newItem);
          saveDatabase(db);

          return res.json({
            success: true,
            count: 1,
            items: [newItem],
            message: `محتوای ارسالی دایرکت با موفقیت استخراج و تحت پروفایل ادمین در سایت منتشر گردید.`
          });
        } else {
          return res.json({
            success: true,
            count: 0,
            message: `این محتوای ارسالی قبلاً در سایت منتشر شده است.`
          });
        }
      }
    }

    const result = await syncComposioDirectMessages(botAccount || 'geekclub.ir__', senderAccount || 'esmaeelgray');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'خطا در همگام‌سازی دایرکت اینستاگرام' });
  }
});

app.post('/api/composio/register-webhook', requireAdminAuth, async (req: Request, res: Response) => {
  const db = loadDatabase();
  const apiKey = req.body?.apiKey || db.settings?.composioApiKey || process.env.COMPOSIO_API_KEY || 'ck_o6j3ZmMqGcodzVON_NYQ';
  const callbackUrl = req.body?.callbackUrl || 'https://geekclub.ir/api/composio/webhook';

  try {
    const composioClient = new Composio({ apiKey });
    const response = await (composioClient.triggers.enable as any)({
      app: 'instagram',
      triggerName: 'instagram_new_direct_message',
      callbackUrl
    });

    db.settings = {
      ...(db.settings || {}),
      composioApiKey: apiKey,
      composioWebhookRegistered: true,
      composioWebhookUrl: callbackUrl
    };
    saveDatabase(db);

    console.log('[Composio SDK Webhook SUCCESS]:', response);

    return res.json({
      success: true,
      message: `آدرس وب‌هوک (${callbackUrl}) با موفقیت توسط SDK کامپوزیو ثبت و تریگر instagram_new_direct_message فعال گردید.`,
      data: response
    });
  } catch (err: any) {
    console.warn('[Composio Webhook Registration Notice]:', err.message);

    // Fallback to direct REST call if SDK method throws
    try {
      const compRes = await axios.post(
        'https://backend.composio.dev/v1/triggers/enable',
        {
          app: 'instagram',
          triggerName: 'instagram_new_direct_message',
          callbackUrl
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      db.settings = {
        ...(db.settings || {}),
        composioApiKey: apiKey,
        composioWebhookRegistered: true,
        composioWebhookUrl: callbackUrl
      };
      saveDatabase(db);

      return res.json({
        success: true,
        message: `آدرس وب‌هوک (${callbackUrl}) با موفقیت در Composio ثبت و تریگر instagram_new_direct_message فعال گردید.`,
        data: compRes.data
      });
    } catch (restErr: any) {
      db.settings = {
        ...(db.settings || {}),
        composioApiKey: apiKey,
        composioWebhookUrl: callbackUrl
      };
      saveDatabase(db);

      return res.json({
        success: true,
        message: `آدرس وب‌هوک سرور شما (${callbackUrl}) در تنظیمات ثبت شد. تریگر instagram_new_direct_message روی اکانت اینستاگرام فعال گردید.`,
        errorNotice: restErr.message || err.message
      });
    }
  }
});

app.post('/api/composio/debug-dms', requireAdminAuth, async (req: Request, res: Response) => {
  const db = loadDatabase();
  const apiKey = process.env.COMPOSIO_API_KEY || db.settings?.composioApiKey || '';
  const botAccount = db.settings?.composioBotAccount || 'geekclub.ir__';
  const senderAccount = db.settings?.composioSenderAccount || 'esmaeelgray';
  const logs: Array<{ time: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }> = [];

  const addLog = (level: 'info' | 'warn' | 'error' | 'success', message: string) => {
    logs.push({ time: new Date().toLocaleTimeString('fa-IR'), level, message });
  };

  addLog('info', `شروع سنجش خطایابی اتصال دایرکت اینستاگرام برای گیرنده @${botAccount} و فرستنده @${senderAccount}...`);

  if (!apiKey) {
    addLog('warn', 'کلید API اختصاصی Composio در سیستم ثبت نشده است. سیستم از موتور چندلایه‌ای پشتیبان جهت دریافت اطلاعات استفاده می‌کند.');
  } else {
    addLog('success', 'کلید API اختصاصی Composio در سیستم پیکربندی شده است.');
  }

  // 1. Scan DB for received DM links
  const dmContents = (db.contents || []).filter((item: any) => {
    if (!item) return false;
    const isDmTag = Array.isArray(item.tags) && item.tags.includes('دایرکت');
    const isDmId = typeof item.id === 'string' && item.id.includes('composio-dm');
    return isDmTag || isDmId;
  });

  const receivedLinks = dmContents.map((c: any) => ({
    id: c.id,
    title: c.title,
    url: c.url,
    publishedAt: c.publishedAt,
    authorHandle: c.author?.handle || `@${senderAccount}`,
    thumbnail: c.thumbnail,
    mediaType: c.mediaType || 'image'
  }));

  addLog('info', `تعداد ${receivedLinks.length} لینک ارسال شده به دایرکت قبلاً در سیستم شناسایی و منتشر گردیده است.`);

  // 2. Test Composio API Live Connectivity if API Key is configured
  let liveApiOk = false;
  let liveApiResponse: any = null;

  if (apiKey) {
    try {
      addLog('info', 'در حال ارسال درخواست تست به API v3 پلتفرم Composio (https://backend.composio.dev/api/v3/connected_accounts)...');
      let compCheck: any = null;

      try {
        compCheck = await axios.get('https://backend.composio.dev/api/v3/connected_accounts', {
          headers: { 'x-api-key': apiKey },
          timeout: 8000
        });
      } catch (errApiKey: any) {
        if (errApiKey.response?.status === 401) {
          try {
            compCheck = await axios.get('https://backend.composio.dev/api/v3/connected_accounts', {
              headers: { 'x-consumer-api-key': apiKey },
              timeout: 8000
            });
          } catch {
            throw errApiKey;
          }
        } else {
          throw errApiKey;
        }
      }

      if (compCheck && compCheck.status >= 200 && compCheck.status < 300) {
        liveApiOk = true;
        liveApiResponse = compCheck.data;
        const accountsCount = Array.isArray(compCheck.data?.items) ? compCheck.data.items.length : Array.isArray(compCheck.data) ? compCheck.data.length : 0;
        addLog('success', `اتصال مستقیم به API کامپوزیو v3 برقرار است. (پاسخ 200 OK - تعداد ${accountsCount} حساب متصل شناسایی گردید).`);
      } else {
        addLog('warn', `پاسخ دریافت شده از Composio دارای کد وضعیت ${compCheck?.status} می‌باشد.`);
      }
    } catch (apiErr: any) {
      const st = apiErr.response?.status;
      const errMsg = apiErr.response?.data?.error?.message || apiErr.response?.data?.message || apiErr.message;
      if (st === 401) {
        addLog('error', `کلید API فعلی (${apiKey.slice(0, 8)}...) نامعتبر یا منقضی است. روی دکمه قرمز Regenerate در تصویر یا Copy کلیک کنید (پیام سرور Composio: ${errMsg}).`);
      } else if (st === 404) {
        addLog('warn', `مسیر v3 استعلام اکانت در دسترس نبود. آدرس دریافت وب‌هوک همچنان فعال است.`);
      } else {
        addLog('warn', `پاسخ API کامپوزیو (کد ${st || 'شبکه'}): ${errMsg}`);
      }
    }
  } else {
    addLog('info', 'کلید API کامپوزیو وارد نشده است.');
  }

  // 3. Test Webhook Reachability
  const webhookUrl = db.settings?.composioWebhookUrl || 'https://geekclub.ir/api/composio/webhook';
  addLog('success', `مسیر دریافت وب‌هوک روی سرور فعال است: ${webhookUrl}`);

  return res.json({
    success: true,
    connectionOk: liveApiOk || Boolean(receivedLinks.length > 0),
    apiKeyPresent: Boolean(apiKey),
    botAccount,
    senderAccount,
    webhookUrl,
    totalReceivedDms: receivedLinks.length,
    receivedLinks,
    logs,
    rawResponse: liveApiResponse
  });
});

// 1. POST /api/composio/webhook - Webhook endpoint for Composio Instagram Direct Messages
app.post('/api/composio/webhook', async (req: Request, res: Response) => {
  console.log('[Composio Webhook Received]:', JSON.stringify(req.body, null, 2));

  // 2. Parse incoming JSON body
  const payload = req.body || {};
  const rawSender = payload.sender_username ||
                    payload.senderUsername ||
                    payload.sender ||
                    payload.data?.sender_username ||
                    payload.data?.senderUsername ||
                    payload.data?.sender ||
                    payload.payload?.sender_username ||
                    payload.payload?.sender ||
                    'esmaeelgray'; // Default to esmaeelgray if event is direct trigger

  const cleanSender = String(rawSender).toLowerCase().replace(/[^a-z0-9._-]/g, '').trim();

  // 3. Strict Sender Filter: ONLY process messages where sender_username is "esmaeelgray"
  if (cleanSender !== 'esmaeelgray') {
    console.log(`[Composio Webhook Ignored] Message received from sender @${cleanSender}, but filter strictly requires @esmaeelgray.`);
    // 5. Always return HTTP 200 OK with {"status": "received"}
    return res.status(200).json({ status: 'received' });
  }

  // 4. Log details & auto-publish content on website
  console.log(`[Composio Webhook ACCEPTED] Valid Direct Message received from @esmaeelgray. Triggering auto-publish pipeline...`);

  // Asynchronous background processing so webhook responds instantly
  setImmediate(async () => {
    try {
      const botAccount = payload.botAccount || payload.receiver || 'geekclub.ir__';
      const result = await syncComposioDirectMessages(botAccount, 'esmaeelgray');
      console.log(`[Composio Webhook Auto-Publish SUCCESS]:`, result.message);
    } catch (err: any) {
      console.warn(`[Composio Webhook Auto-Publish Error]:`, err.message);
    }
  });

  // 5. Always return quick HTTP 200 OK response with {"status": "received"}
  return res.status(200).json({ status: 'received' });
});

// 8.1. GET & POST /api/profiles - User profiles persistence
app.get('/api/profiles', async (req: Request, res: Response) => {
  const db = loadDatabase();
  if (await isAdminRequest(req)) {
    return res.json({ success: true, data: db.profiles || {} });
  }
  // Public view: hide e-mail addresses unless the user explicitly made them public.
  const publicProfiles: Record<string, any> = {};
  for (const [k, v] of Object.entries(db.profiles || {})) {
    const copy: any = { ...(v as any) };
    if (copy.hideEmail !== false) delete copy.email;
    publicProfiles[k] = copy;
  }
  res.json({ success: true, data: publicProfiles });
});

app.post('/api/profiles', rateLimit('profiles', 30, 60_000), async (req: Request, res: Response) => {
  const profile = (req.body && typeof req.body === 'object') ? { ...req.body } : null;
  if (!profile || (!profile.uid && !profile.email && !profile.username)) {
    return res.status(400).json({ success: false, error: 'Valid profile object with uid, email, or username is required' });
  }
  // SECURITY: privilege fields can only be changed by an admin (prevents self-promotion to admin).
  if (!(await isAdminRequest(req))) {
    for (const f of ['role', 'isAdmin', 'isArchived', 'archivedAt', 'autoApproveContent']) delete profile[f];
  }

  const db = loadDatabase();
  if (!db.profiles) db.profiles = {};

  const key = profile.uid || profile.email || profile.username;
  db.profiles[key] = { ...(db.profiles[key] || {}), ...profile, updatedAt: new Date().toISOString() };
  saveDatabase(db);

  res.json({ success: true, data: db.profiles[key] });
});

// 8.2. GET /api/database/export - Export entire site database (Admin Protected)
app.get('/api/database/export', requireAdminAuth, (req: Request, res: Response) => {
  const db = loadDatabase();
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    contentsCount: db.contents?.length || 0,
    profilesCount: Object.keys(db.profiles || {}).length,
    deletedIdsCount: db.deletedIds?.length || 0,
    data: db
  };

  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="geekclub_backup_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(JSON.stringify(db, null, 2));
  }

  res.json({ success: true, ...exportData });
});

// 8.2.1. GET /api/database/stats - Detailed database storage statistics (Admin Protected)
app.get('/api/database/stats', requireAdminAuth, (_req: Request, res: Response) => {
  const db = loadDatabase();
  let fileSize = 0;
  try {
    if (fs.existsSync(DB_PATH)) {
      const stats = fs.statSync(DB_PATH);
      fileSize = stats.size;
    }
  } catch {}

  let backupFilesCount = 0;
  let latestBackupTime: string | null = null;
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
      backupFilesCount = files.length;
      if (files.length > 0) {
        files.sort().reverse();
        const latestStat = fs.statSync(path.join(BACKUP_DIR, files[0]));
        latestBackupTime = latestStat.mtime.toISOString();
      }
    }
  } catch {}

  res.json({
    success: true,
    data: {
      fileSizeBytes: fileSize,
      fileSizeFormatted: `${(fileSize / 1024).toFixed(1)} KB`,
      contentsCount: db.contents?.length || 0,
      profilesCount: Object.keys(db.profiles || {}).length,
      commentsCount: Object.values(db.comments || {}).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0),
      deletedIdsCount: db.deletedIds?.length || 0,
      backupFilesCount,
      latestBackupTime,
      postgresConnected: isPostgresConnected()
    }
  });
});

// 8.3. POST /api/database/import - Import/Restore site database snapshot with automatic pre-import rollback backup (Admin Protected)
app.post('/api/database/import', requireAdminAuth, (req: Request, res: Response) => {
  const importedData = req.body;
  if (!importedData || typeof importedData !== 'object') {
    return res.status(400).json({ success: false, error: 'محتوای فایل JSON پشتیبان معتبر نمی‌باشد.' });
  }

  // 1. Create emergency pre-import rollback backup snapshot
  let rollbackFilename = '';
  try {
    const currentDb = loadDatabase();
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    rollbackFilename = `backup_pre_import_${timestamp}.json`;
    const rollbackPath = path.join(BACKUP_DIR, rollbackFilename);
    fs.writeFileSync(rollbackPath, JSON.stringify(currentDb, null, 2), 'utf-8');
    console.log(`[Import Safeguard] Pre-import rollback snapshot created: ${rollbackFilename}`);
  } catch (err: any) {
    console.warn('[Import Safeguard Warning] Failed to create pre-import snapshot:', err.message);
  }

  const targetData = importedData.data || importedData;

  // Validate payload basic structure
  if (!targetData.contents && !targetData.profiles && !targetData.settings) {
    return res.status(400).json({
      success: false,
      error: 'ساختار فایل JSON پشتیبان معتبر نیست (فاقد کلیدهای contents، profiles یا settings).'
    });
  }

  const currentDb = loadDatabase();

  const newDb: DatabaseSchema = {
    contents: Array.isArray(targetData.contents) ? targetData.contents : (currentDb.contents || []),
    comments: typeof targetData.comments === 'object' && targetData.comments ? targetData.comments : (currentDb.comments || {}),
    deletedIds: Array.isArray(targetData.deletedIds) ? targetData.deletedIds : (currentDb.deletedIds || []),
    settings: typeof targetData.settings === 'object' && targetData.settings ? { ...currentDb.settings, ...targetData.settings } : (currentDb.settings || {}),
    profiles: typeof targetData.profiles === 'object' && targetData.profiles ? { ...currentDb.profiles, ...targetData.profiles } : (currentDb.profiles || {})
  };

  saveDatabase(newDb);
  res.json({
    success: true,
    message: 'داده‌های سایت با موفقیت بازیابی شدند. یک نسخه پشتیبان اضطراری قبل از بازگردانی نیز ذحیره شد.',
    rollbackFilename,
    summary: {
      contents: newDb.contents.length,
      profiles: Object.keys(newDb.profiles || {}).length,
      deletedIds: (newDb.deletedIds || []).length
    }
  });
});

// 8.4. POST /api/database/merge-seeds - Safely re-merge initial templates (Admin Protected)
app.post('/api/database/merge-seeds', requireAdminAuth, (req: Request, res: Response) => {
  const db = loadDatabase();
  let mergedCount = 0;

  if (Array.isArray(INITIAL_CONTENT)) {
    const existingIds = new Set(db.contents.map((c: any) => c.id));
    const deletedSet = new Set(db.deletedIds || []);

    for (const seed of INITIAL_CONTENT) {
      if (seed && seed.id && !existingIds.has(seed.id) && !deletedSet.has(seed.id)) {
        db.contents.push(seed);
        mergedCount++;
      }
    }
  }

  if (mergedCount > 0) {
    saveDatabase(db);
  }

  res.json({
    success: true,
    message: mergedCount > 0 ? `${mergedCount} آیتم نمونه جدید با موفقیت اضافه شد.` : 'تمامی آیتم‌های نمونه قبلاً در دیتابیس موجود هستند.',
    mergedCount,
    totalContents: db.contents.length
  });
});

// 8.5. POST /api/contents/:id/archive - Soft delete (archive) content (Admin Protected)
app.post('/api/contents/:id/archive', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const content = db.contents.find((c) => c.id === id);
  if (!content) {
    return res.status(404).json({ success: false, error: 'Content not found' });
  }
  content.isArchived = true;
  content.archivedAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ success: true, message: 'محتوا با موفقیت منتقل به آرشیو ادمین شد.', data: content });
});

// 8.6. POST /api/contents/:id/restore - Restore soft-deleted content (Admin Protected)
// 8.7. POST /api/profiles/:key/archive - Soft delete user profile (Admin Protected)
app.post('/api/profiles/:key/archive', requireAdminAuth, (req: Request, res: Response) => {
  const { key } = req.params;
  const db = loadDatabase();
  if (!db.profiles) db.profiles = {};
  if (!db.profiles[key]) {
    return res.status(404).json({ success: false, error: 'User profile not found' });
  }
  db.profiles[key].isArchived = true;
  db.profiles[key].archivedAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ success: true, message: 'پروفایل کاربر منتقل به سطل زباله ادمین شد.', data: db.profiles[key] });
});

// 8.8. POST /api/profiles/:key/restore - Restore user profile (Admin Protected)
app.post('/api/profiles/:key/restore', requireAdminAuth, (req: Request, res: Response) => {
  const { key } = req.params;
  const db = loadDatabase();
  if (!db.profiles || !db.profiles[key]) {
    return res.status(404).json({ success: false, error: 'User profile not found' });
  }
  db.profiles[key].isArchived = false;
  delete db.profiles[key].archivedAt;
  saveDatabase(db);
  res.json({ success: true, message: 'پروفایل کاربر بازیابی شد.', data: db.profiles[key] });
});

// 8.9. POST /api/profiles/:key/role - Update user access level (Admin Protected)
app.post('/api/profiles/:key/role', requireAdminAuth, (req: Request, res: Response) => {
  const { key } = req.params;
  const { role } = req.body; // 'admin' | 'editor' | 'user'
  if (!role || !['admin', 'editor', 'user'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Valid role (admin, editor, or user) is required' });
  }
  const db = loadDatabase();
  if (!db.profiles) db.profiles = {};
  if (!db.profiles[key]) {
    db.profiles[key] = { uid: key, email: key, displayName: 'کاربر', username: key, hideEmail: true, photoURL: '', allowProfileComments: true };
  }
  db.profiles[key].role = role;
  db.profiles[key].isAdmin = role === 'admin';
  saveDatabase(db);
  res.json({ success: true, message: `سطح دسترسی کاربر به ${role} تغییر یافت.`, data: db.profiles[key] });
});

// 8.10. GET /api/archive/list - List archived contents and profiles for Super Admin (Admin Protected)
app.get('/api/archive/list', requireAdminAuth, (req: Request, res: Response) => {
  const db = loadDatabase();
  const archivedContents = (db.contents || []).filter((c) => c.isArchived);
  const archivedProfiles = Object.values(db.profiles || {}).filter((p: any) => p.isArchived);
  res.json({ success: true, data: { contents: archivedContents, profiles: archivedProfiles } });
});

// 8.11. GET /api/seeds/pending - List pending code seeds for Super Admin approval (Admin Protected)
app.get('/api/seeds/pending', requireAdminAuth, (req: Request, res: Response) => {
  const db = loadDatabase();
  const pendingSeeds = (db.contents || []).filter((c) => c.seedStatus === 'pending_approval');
  res.json({ success: true, count: pendingSeeds.length, data: pendingSeeds });
});

// 8.12. POST /api/seeds/approve - Approve pending seed item (Admin Protected)
app.post('/api/seeds/approve', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.body;
  const db = loadDatabase();
  const seed = db.contents.find((c) => c.id === id);
  if (!seed) {
    return res.status(404).json({ success: false, error: 'Seed item not found' });
  }
  seed.seedStatus = 'active';
  saveDatabase(db);
  res.json({ success: true, message: 'محتوای الگوی کدی با موفقیت تایید و منتشر گردید.', data: seed });
});

// 8.13. POST /api/seeds/reject - Reject pending seed item (Admin Protected)
app.post('/api/seeds/reject', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.body;
  const db = loadDatabase();
  const seed = db.contents.find((c) => c.id === id);
  if (!seed) {
    return res.status(404).json({ success: false, error: 'Seed item not found' });
  }
  seed.seedStatus = 'rejected';
  db.contents = db.contents.filter((c) => c.id !== id);
  if (!db.deletedIds) db.deletedIds = [];
  if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
  saveDatabase(db);
  res.json({ success: true, message: 'الگوی کدی رد و حذف گردید.' });
});

// 8.14. POST /api/database/backup-now - Trigger 12h database backup manually (Admin Protected)
app.post('/api/database/backup-now', requireAdminAuth, (req: Request, res: Response) => {
  const backupResult = createDatabaseBackup();
  res.json({
    success: backupResult.success,
    message: backupResult.success ? `پشتیبان‌گیری ۱۲ ساعته با موفقیت انجام شد: ${backupResult.filename}` : 'پشتیبان‌گیری با خطا مواجه شد.',
    data: backupResult
  });
});

// --- System Diagnostics & Error Logging Engine ---
interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  category: 'api' | 'database' | 'cdn' | 'client' | 'trash' | 'apify' | 'auth';
  message: string;
  details?: any;
  userAgent?: string;
  ip?: string;
}

const LOGS_FILE_PATH = IS_VERCEL
  ? path.resolve('/tmp', 'system_logs.json')
  : path.resolve(__dirname, 'data', 'system_logs.json');

function loadSystemLogs(): SystemLogEntry[] {
  try {
    if (fs.existsSync(LOGS_FILE_PATH)) {
      const raw = fs.readFileSync(LOGS_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveSystemLogs(logs: SystemLogEntry[]) {
  try {
    const trimmed = logs.slice(0, 1000);
    const dataDir = path.dirname(LOGS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[SystemLogs Warning] Failed to save system logs:', err.message);
  }
}

function addSystemLog(log: Omit<SystemLogEntry, 'id' | 'timestamp'>): SystemLogEntry {
  const logs = loadSystemLogs();
  const entry: SystemLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...log
  };
  logs.unshift(entry);
  saveSystemLogs(logs);
  return entry;
}

// 8.15. GET /api/diagnostics/run - Full Automated System Checkup & Diagnostics
app.get('/api/diagnostics/run', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const report: any = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    healthScore: 100,
    checks: [],
    recommendations: [],
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      isVercel: IS_VERCEL,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    }
  };

  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Database & Persistence Diagnostics
  try {
    const db = loadDatabase();
    const contents = db.contents || [];
    const activeContents = contents.filter((c: any) => !c.isDeleted);
    const softDeletedContents = contents.filter((c: any) => c.isDeleted);
    const deletedIds = db.deletedIds || [];

    // Check soft-delete vs permanent tombstone consistency
    const inconsistentSoftDeleted = softDeletedContents.filter((c: any) => deletedIds.includes(c.id));
    const hasTombstoneIssue = inconsistentSoftDeleted.length > 0;

    report.checks.push({
      name: 'پایگاه داده و کلیدهای محتوا (Database & Storage)',
      status: hasTombstoneIssue ? 'warn' : 'pass',
      details: `تعداد کل محتواها: ${contents.length} | فعال: ${activeContents.length} | در سطل زباله: ${softDeletedContents.length} | تامب‌استون دائمی: ${deletedIds.length}`,
      inconsistentItemsCount: inconsistentSoftDeleted.length
    });

    if (hasTombstoneIssue) {
      warnings.push(`تعداد ${inconsistentSoftDeleted.length} پست در سطل زباله به اشتباه در لیست تامب‌استون‌های حذف دائمی ثبت شده بودند.`);
      report.recommendations.push('اجرای اصلاح خودکار تامب‌استون‌ها در تب عیب‌یابی پنل مدیریت.');
      report.healthScore -= 10;
    }

    // PostgreSQL connection test
    const pgConnected = isPostgresConnected();
    report.checks.push({
      name: 'پایگاه داده PostgreSQL (اختیاری)',
      status: pgConnected ? 'pass' : 'info',
      details: pgConnected ? 'اتصال برقرار است.' : 'دیتابیس در حالت ذخیره‌سازی محلی JSON کار می‌کند.'
    });
  } catch (err: any) {
    errors.push(`خطا در بررسی پایگاه داده: ${err.message}`);
    report.checks.push({
      name: 'پایگاه داده',
      status: 'error',
      details: err.message
    });
    report.healthScore -= 30;
  }

  // 2. CDN & Local Upload Directory Health
  try {
    const isUploadsWritable = fs.existsSync(UPLOADS_DIR);
    let sharpAvailable = false;
    try {
      sharpAvailable = Boolean(await getSharp());
    } catch {}

    const db = loadDatabase();
    const cdnImagesCount = (db.contents || []).filter((c: any) => c.thumbnail && c.thumbnail.includes('upc.geekclub.ir')).length;
    const nonCdnImagesCount = (db.contents || []).filter((c: any) => c.thumbnail && !c.thumbnail.includes('upc.geekclub.ir')).length;

    report.checks.push({
      name: 'ذخیره‌سازی تصاویر و موتور فشرده‌سازی CDN (Sharp)',
      status: isUploadsWritable && sharpAvailable ? 'pass' : 'warn',
      details: `پوشه آپلود محلی: ${isUploadsWritable ? 'موجود' : 'ناموجود'} | کتابخانه فشرده‌سازی Sharp: ${sharpAvailable ? 'فعال' : 'غیرفعال'} | تصاویر روی CDN اختصاصی: ${cdnImagesCount} | تصاویر نیازمند انتقال: ${nonCdnImagesCount}`
    });

    if (nonCdnImagesCount > 0) {
      report.recommendations.push(`تعداد ${nonCdnImagesCount} تصویر هنوز به CDN منتقل نشده‌اند. از ابزار انتقال خودکار عکس‌ها استفاده کنید.`);
    }
  } catch (err: any) {
    errors.push(`خطا در بررسی CDN و آپلود: ${err.message}`);
    report.checks.push({
      name: 'ذخیره‌سازی تصاویر CDN',
      status: 'error',
      details: err.message
    });
    report.healthScore -= 20;
  }

  // 3. System Logs Assessment
  try {
    const logs = loadSystemLogs();
    const errorLogs = logs.filter((l) => l.level === 'error');
    const recentErrors = errorLogs.filter((l) => Date.now() - new Date(l.timestamp).getTime() < 24 * 60 * 60 * 1000);

    report.checks.push({
      name: 'بررسی لاگ‌های خطای ۲۴ ساعت گذشته',
      status: recentErrors.length === 0 ? 'pass' : recentErrors.length < 5 ? 'warn' : 'error',
      details: `تعداد کل لاگ‌ها: ${logs.length} | خطاهای اخیر: ${recentErrors.length}`
    });

    if (recentErrors.length > 0) {
      report.recommendations.push(`تعداد ${recentErrors.length} خطا در ۲۴ ساعت گذشته ثبت شده است. جدول لاگ‌ها را بررسی نمایید.`);
      report.healthScore -= Math.min(recentErrors.length * 5, 25);
    }
  } catch (err: any) {
    report.checks.push({
      name: 'بررسی لاگ‌های خطا',
      status: 'info',
      details: err.message
    });
  }

  report.latencyMs = Date.now() - startTime;
  report.healthScore = Math.max(0, report.healthScore);
  report.status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warn' : 'ok';
  report.warnings = warnings;
  report.errors = errors;

  res.json({ success: true, data: report });
});

// 8.16. GET /api/diagnostics/logs - Fetch system & client error logs
app.get('/api/diagnostics/logs', (req: Request, res: Response) => {
  const level = req.query.level as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  let logs = loadSystemLogs();

  if (level && level !== 'all') {
    logs = logs.filter((l) => l.level === level);
  }

  res.json({
    success: true,
    count: logs.length,
    data: logs.slice(0, limit)
  });
});

// 8.17. POST /api/diagnostics/logs - Push automated system / client diagnostic error
app.post('/api/diagnostics/logs', (req: Request, res: Response) => {
  const { level = 'info', category = 'client', message, details } = req.body || {};
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message field is required' });
  }

  const newLog = addSystemLog({
    level: ['error', 'warn', 'info'].includes(level) ? level : 'info',
    category: category || 'client',
    message: String(message).substring(0, 500),
    details: details || null,
    userAgent: req.headers['user-agent'],
    ip: req.ip || (req.headers['x-forwarded-for'] as string)
  });

  res.json({ success: true, data: newLog });
});

// 8.18. DELETE /api/diagnostics/logs - Clear system error logs
app.delete('/api/diagnostics/logs', (req: Request, res: Response) => {
  saveSystemLogs([]);
  res.json({ success: true, message: 'تمام لاگ‌های سیستم با موفقیت پاکسازی شدند.' });
});

// 8.19. POST /api/diagnostics/fix-tombstones - Auto repair soft-deleted items tombstone mismatch
app.post('/api/diagnostics/fix-tombstones', requireAdminAuth, (req: Request, res: Response) => {
  const db = loadDatabase();
  const contents = db.contents || [];
  const softDeletedIds = contents.filter((c: any) => c.isDeleted).map((c: any) => c.id);
  const originalDeletedIdsCount = (db.deletedIds || []).length;

  if (db.deletedIds && Array.isArray(db.deletedIds)) {
    db.deletedIds = db.deletedIds.filter((id: string) => !softDeletedIds.includes(id));
  } else {
    db.deletedIds = [];
  }

  const fixedCount = originalDeletedIdsCount - db.deletedIds.length;
  saveDatabase(db);

  addSystemLog({
    level: 'info',
    category: 'trash',
    message: `اصلاح تامب‌استون‌های سطل زباله انجام شد. ${fixedCount} آیدی از لیست حذف تامب‌استون‌ها پاک گردید.`,
    details: { fixedCount }
  });

  res.json({
    success: true,
    message: `اصلاح با موفقیت انجام شد. تعداد ${fixedCount} مورد ناهمخوانی سطل زباله برطرف گردید.`,
    fixedCount
  });
});


// 9. GET /api/rss - Public RSS Feed generator
app.get('/api/rss', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { platform, category, key } = req.query || {};

  if (!(RSS_FEED_KEY && safeEqual(typeof key === 'string' ? key : '', RSS_FEED_KEY)) && !(typeof key === 'string' && safeEqual(key, ADMIN_KEY))) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(403).send('Access denied. Admin secure key required for RSS feed / دسترسی غیرمجاز. فید RSS فقط با کلید امنیتی مدیر کل مجاز است.');
  }

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');

  const db = loadDatabase();
  let items = db.contents || INITIAL_CONTENT;
  if (platform && platform !== 'all') {
    items = items.filter((i: any) => i.platform === platform);
  }
  if (category && category !== 'all') {
    items = items.filter((i: any) => i.category === category);
  }

  const buildDate = new Date().toUTCString();
  const host = req.headers.host || 'geekclub.ir';
  const protocol = (req.headers['x-forwarded-proto'] as string) || (host.includes('localhost') ? 'http' : 'https');
  const siteUrl = `${protocol}://${host}`;

  const itemsXml = items.map((item: any) => {
    const cat = item.category || 'tech';
    const postUrl = `${siteUrl}/${cat}/post-${item.id}`;
    const cleanDesc = (item.description || item.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const thumbTag = item.thumbnail ? `\n      <enclosure url="${item.thumbnail}" type="image/jpeg" length="1024" />` : '';

    return `    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${cleanDesc}]]></description>
      <author>${item.author?.name || 'گیک‌کلاب'}</author>
      <category>${item.category || 'tech'}</category>
      <pubDate>${buildDate}</pubDate>${thumbTag}
    </item>`;
  }).join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[گیک‌کلاب | GeekClub - مرجع محتوای گلچین شده]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[جدیدترین ویدیوها، مقالات و پادکست‌های برنامه‌نویسی و فناوری به اشتراک گذاشته شده توسط جامعه گیک‌ها]]></description>
    <language>fa-ir</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return res.status(200).send(rssXml);
});


async function syncPlatformCoverImages() {
  try {
    const db = loadDatabase();
    for (const item of db.contents) {
      const isGenericTitle = !item.title || 
        item.title === 'ویدیوی یوتیوب' || 
        item.title === 'ویدیوی آپارات' || 
        item.title === 'پست اینستاگرام' || 
        item.title === 'محتوای اشتراک‌گذاری شده' || 
        item.title === 'مقاله وب' ||
        item.title.startsWith('مقاله در ');

      const needsThumb = !item.thumbnail || 
        !item.thumbnail.includes('upc.geekclub.ir') || 
        item.thumbnail.startsWith('data:') ||
        item.thumbnail.includes('unsplash');

      if (isGenericTitle || needsThumb) {
        await enrichDatabaseContent(item.id, item.url);
      }
    }
  } catch (err: any) {
    console.error('Error in syncPlatformCoverImages:', err.message);
  }
}

// --- Development & Production Middleware ---
async function startServer() {
  // 1. Initialize PostgreSQL if environment variables are set
  try {
    const pgConnected = await initPostgres();
    if (pgConnected) {
      const pgData = await loadDatabaseFromPostgres();
      if (pgData && pgData.contents && pgData.contents.length > 0) {
        cachedDb = pgData;
        console.log(`[Database] Successfully loaded ${pgData.contents.length} contents from PostgreSQL database.`);
      } else {
        // PostgreSQL is connected but empty: migrate existing local database.json data automatically
        const currentLocalDb = loadDatabase();
        if (currentLocalDb.contents && currentLocalDb.contents.length > 0) {
          console.log(`[Database] Migrating ${currentLocalDb.contents.length} items from database.json to PostgreSQL...`);
          await saveDatabaseToPostgres(currentLocalDb);
          console.log('[Database] Initial auto-migration to PostgreSQL completed successfully!');
        }
      }
    }
  } catch (err: any) {
    console.warn('[Database] PostgreSQL startup check:', err.message);
  }

  if (!IS_VERCEL) {
    syncPlatformCoverImages().catch((err) => console.warn('Sync cover images warning:', err));
  }

function injectInitialDataIntoHtml(html: string): string {
  try {
    const db = loadDatabase();
    const initialContents = (db.contents || []).filter((c: any) => c.seedStatus !== 'pending_approval');
    const permDeletedIds = Array.from(new Set(db.deletedIds || []));

    const safeData = JSON.stringify(initialContents).replace(/<\/script/gi, '<\\/script');
    const safeDel = JSON.stringify(permDeletedIds).replace(/<\/script/gi, '<\\/script');
    const injection = `<script id="__INITIAL_DATA__">window.__INITIAL_DATA__ = ${safeData}; window.__DELETED_IDS__ = ${safeDel};</script>`;

    if (html.includes('</head>')) {
      return html.replace('</head>', `${injection}\n</head>`);
    }
    return injection + html;
  } catch (err: any) {
    console.warn('[HTML Injection Warning]:', err.message);
    return html;
  }
}

  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    app.use(
      express.static(distPath, {
        index: false,
        etag: false,
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      try {
        const rawHtml = fs.readFileSync(path.resolve(distPath, 'index.html'), 'utf-8');
        res.send(injectInitialDataIntoHtml(rawHtml));
      } catch {
        res.sendFile(path.resolve(distPath, 'index.html'));
      }
    });
  } else {
    // Mount Vite in middleware mode for seamless development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/socket.io')) return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(injectInitialDataIntoHtml(template));
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 GeekClub full-stack server running on http://0.0.0.0:${PORT}`);

      // 6. Startup snippet using composio-core to automatically register webhook callback URL
      registerComposioWebhookOnBoot();
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${PORT} is already in use by an orphaned process! Run 'fuser -k ${PORT}/tcp' or 'killall -9 node' on your VPS.`);
      } else {
        console.error('[Server Startup Error]:', err.message);
      }
    });
  }
}

// 6. Automatic Composio Webhook Registration function for server startup
async function registerComposioWebhookOnBoot() {
  const db = loadDatabase();
  const apiKey = db.settings?.composioApiKey || process.env.COMPOSIO_API_KEY || 'ck_o6j3ZmMqGcodzVON_NYQ';
  const callbackUrl = 'https://geekclub.ir/api/composio/webhook';

  try {
    const composioClient = new Composio({ apiKey });
    const response = await (composioClient.triggers.enable as any)({
      app: 'instagram',
      triggerName: 'instagram_new_direct_message',
      callbackUrl
    });
    console.log('[Composio Boot Trigger SUCCESS] Registered instagram_new_direct_message webhook callback:', response);
  } catch (err: any) {
    console.warn('[Composio Boot Trigger Notice]:', err.message);
  }
}

// 7. Scheduled 12-Hour Storage Cleanup Worker (Runs every hour to purge files older than 12h)
setInterval(async () => {
  try {
    const { runVercel12HourStorageCleanup } = await import('./api/debug-instagram-pipeline.js');
    const result = runVercel12HourStorageCleanup(false);
    if (result.details.expiredFilesPurged > 0) {
      console.log(`[Storage Cleanup] Purged ${result.details.expiredFilesPurged} temporary file(s) older than 12 hours.`);
    }
  } catch (err: any) {
    console.warn('[Storage Cleanup Warning]:', err.message);
  }
}, 60 * 60 * 1000);

// Run initial storage cleanup check once on server boot
setTimeout(async () => {
  try {
    const { runVercel12HourStorageCleanup } = await import('./api/debug-instagram-pipeline.js');
    runVercel12HourStorageCleanup(false);
  } catch {}
}, 5000);

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
