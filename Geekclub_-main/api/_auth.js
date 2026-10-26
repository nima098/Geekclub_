// Shared helpers for the Vercel serverless functions (files starting with "_" are not deployed as routes).
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SUPER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '3dsaz1990@gmail.com').toLowerCase();

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function extractToken(req) {
  const auth = req.headers?.authorization;
  const x = req.headers?.['x-admin-key'];
  const raw = auth && auth.startsWith('Bearer ') ? auth.substring(7) : (Array.isArray(x) ? x[0] : x);
  return typeof raw === 'string' ? raw.trim() : '';
}

let firebaseAuth = null;
async function verifyIdToken(idToken) {
  try {
    if (!firebaseAuth) {
      const appMod = await import('firebase-admin/app');
      const authMod = await import('firebase-admin/auth');
      let projectId = process.env.FIREBASE_PROJECT_ID;
      if (!projectId) {
        const cfg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
        projectId = cfg.projectId;
      }
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({ projectId });
      firebaseAuth = authMod.getAuth(app);
    }
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    if (!decoded?.email || decoded.email_verified !== true) return null;
    return String(decoded.email).toLowerCase();
  } catch {
    return null;
  }
}

// Valid ADMIN_SECRET_KEY (environment variable) OR a verified Firebase ID token of the super admin.
export async function isAdminRequest(req) {
  const token = extractToken(req);
  if (!token) return false;
  const key = process.env.ADMIN_SECRET_KEY;
  if (key && safeEqual(token, key)) return true;
  if (token.split('.').length === 3) {
    const email = await verifyIdToken(token);
    return email === SUPER_ADMIN_EMAIL;
  }
  return false;
}
