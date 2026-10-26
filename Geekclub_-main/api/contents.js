import { INITIAL_CONTENT } from './data.js';
import fs from 'fs';
import path from 'path';
import { isAdminRequest } from './_auth.js';

// NOTE (Vercel): the project folder is READ-ONLY at runtime and /tmp is per-instance + ephemeral.
// Changes made here are therefore NOT durable across cold starts / other instances. For a real
// deployment keep the data in Firestore (or another database) or host server.ts on a Node host.
const EPHEMERAL_STORAGE = !!process.env.VERCEL && process.env.ALLOW_EPHEMERAL_STORAGE !== 'true';
const SEED_DB_PATH = path.resolve(process.cwd(), 'data', 'database.json');
const RUNTIME_DB_PATH = path.resolve('/tmp', 'geekclub-database.json');

function readJson(p) {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err) {
    console.warn('Error reading database in api/contents.js:', err.message);
  }
  return null;
}

function loadDatabase() {
  let db = readJson(RUNTIME_DB_PATH) || readJson(SEED_DB_PATH);
  if (!db || !Array.isArray(db.contents) || db.contents.length === 0) {
    db = { ...(db || {}), contents: INITIAL_CONTENT.map((c) => ({ ...c })), comments: db?.comments || {} };
  }
  if (!Array.isArray(db.deletedIds)) db.deletedIds = [];
  return db;
}

function saveDatabase(db) {
  try {
    const tmp = `${RUNTIME_DB_PATH}.tmp_${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(db), 'utf-8');
    fs.renameSync(tmp, RUNTIME_DB_PATH);
    return true;
  } catch (err) {
    console.warn('Error saving database in api/contents.js:', err.message);
    return false;
  }
}

const stripPrefix = (id) => String(id || '').replace(/^(post|content)-/, '');
const matches = (item, id) => !!item && !!id && (item.id === id || stripPrefix(item.id) === stripPrefix(id));
const isTombstoned = (db, id) => db.deletedIds.includes(id) || db.deletedIds.includes(stripPrefix(id));

// Fields a NON-admin client may change (background metadata enrichment only)
const NON_ADMIN_FIELDS = new Set([
  'title', 'description', 'thumbnail', 'videoUrl', 'mediaType', 'images', 'slides', 'needsEnrichment',
  'apifyFetched', 'articleContent', 'embedUrl', 'readingOrWatchTime', 'tags', 'sourceDomain'
]);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = loadDatabase();
  const pathParts = (req.url || '').split('?')[0].split('/').filter(Boolean); // ['api','contents',':id',':action']
  const rawId = pathParts.length > 2 ? pathParts[2] : req.query?.id;
  const contentId = rawId ? decodeURIComponent(rawId) : undefined;
  const action = pathParts.length > 3 ? pathParts[3] : undefined;

  try {
    const admin = await isAdminRequest(req);

    // HONESTY GUARD: on Vercel the file system is read-only/ephemeral, so a write can look successful and then
    // silently disappear (deleted items "come back"). Refuse writes instead of pretending they were saved.
    if (req.method !== 'GET' && EPHEMERAL_STORAGE) {
      return res.status(503).json({
        success: false,
        error: 'storage_not_persistent',
        message: 'Vercel storage is not persistent. Host server.ts on a VPS (or store data in Firestore). ' +
                 'Set ALLOW_EPHEMERAL_STORAGE=true only for demos.'
      });
    }

    // ---------------- READ ----------------
    if (req.method === 'GET' && !contentId) {
      const { platform, category, search, sort } = req.query || {};
      const tomb = new Set([...db.deletedIds, ...db.deletedIds.map(stripPrefix)]);
      let results = db.contents.filter((c) => !tomb.has(c.id) && !tomb.has(stripPrefix(c.id)));

      // Trash / archive / pending seeds are admin-only
      if (!(admin && req.query?.includeDeleted === 'true')) results = results.filter((c) => !c.isDeleted);
      if (!(admin && req.query?.includeArchived === 'true')) results = results.filter((c) => !c.isArchived);
      if (!(admin && req.query?.includePending === 'true')) results = results.filter((c) => c.seedStatus !== 'pending_approval');

      if (platform && platform !== 'all') results = results.filter((c) => c.platform === platform);
      if (category && category !== 'all') results = results.filter((c) => c.category === category);
      if (typeof search === 'string' && search.trim()) {
        const q = search.toLowerCase().trim();
        results = results.filter((c) =>
          c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) ||
          c.author?.name?.toLowerCase().includes(q) || c.tags?.some((t) => t.toLowerCase().includes(q)));
      }
      if (sort === 'most_liked') results.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      else if (sort === 'most_comments') results.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
      else if (sort === 'trending') {
        const score = (x) => (x.likesCount || 0) * 2 + (x.commentsCount || 0) * 3 - (x.dislikesCount || 0);
        results.sort((a, b) => score(b) - score(a));
      }
      return res.status(200).json({ success: true, count: results.length, data: results });
    }

    // ---------------- CREATE ----------------
    if (req.method === 'POST' && !contentId) {
      const body = req.body || {};
      if (!body.url) return res.status(400).json({ success: false, error: 'URL is required' });
      const id = body.id || `content-${Date.now()}`;
      if (isTombstoned(db, id)) return res.status(410).json({ success: false, error: 'This content id was permanently deleted' });
      if (db.contents.some((c) => c.id === id)) return res.status(409).json({ success: false, error: 'Content already exists' });
      const newItem = {
        id,
        title: body.title || 'محتوای اشتراک‌گذاری شده',
        description: body.description || '',
        url: body.url,
        platform: body.platform || 'article',
        embedUrl: body.embedUrl || body.url,
        thumbnail: body.thumbnail || '',
        author: body.author || { name: 'کاربر گیک کلاب', avatar: '' },
        category: body.category || 'tech',
        tags: body.tags || ['محتوا', 'گیک_کلاب'],
        publishedAt: 'همین الان',
        readingOrWatchTime: body.readingOrWatchTime || '۵ دقیقه',
        likesCount: 1,
        dislikesCount: 0,
        commentsCount: 0,
        // Only an admin may publish directly; everybody else goes through moderation
        approvalStatus: admin ? (body.approvalStatus || 'approved') : (body.approvalStatus === 'approved' ? 'approved' : 'pending'),
        authorUid: body.authorUid || '',
        articleContent: body.articleContent || body.description || '',
        sourceDomain: body.sourceDomain || 'web',
        videoUrl: body.videoUrl || '',
        mediaType: body.mediaType || 'image',
        images: body.images || [],
        slides: body.slides || [],
        apifyFetched: Boolean(body.apifyFetched)
      };
      db.contents.unshift(newItem);
      saveDatabase(db);
      return res.status(201).json({ success: true, data: newItem });
    }

    if (!contentId) return res.status(405).json({ success: false, error: 'Method not allowed' });

    // ---------------- ADMIN-ONLY ACTIONS ----------------
    const isDeleteAction =
      req.method === 'DELETE' || (req.method === 'POST' && (action === 'permanent-delete' || action === 'delete'));
    const isSoftDelete = req.method === 'POST' && action === 'soft-delete';
    const isRestore = req.method === 'POST' && action === 'restore';

    if ((isDeleteAction || isSoftDelete || isRestore) && !admin) {
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }

    if (isDeleteAction) {
      const clean = stripPrefix(contentId);
      db.contents = db.contents.filter((c) => !matches(c, contentId));
      if (!db.deletedIds.includes(contentId)) db.deletedIds.push(contentId);
      if (!db.deletedIds.includes(clean)) db.deletedIds.push(clean);
      if (db.comments?.[contentId]) delete db.comments[contentId];
      saveDatabase(db);
      return res.status(200).json({ success: true, message: 'Content deleted permanently' });
    }

    if (isSoftDelete) {
      const target = db.contents.find((c) => matches(c, contentId));
      if (!target) return res.status(404).json({ success: false, error: 'Content not found' });
      target.isDeleted = true;
      target.deletedAt = req.body?.deletedAt || new Date().toISOString();
      saveDatabase(db);
      return res.status(200).json({ success: true, data: target });
    }

    if (isRestore) {
      const target = db.contents.find((c) => matches(c, contentId));
      if (!target) return res.status(404).json({ success: false, error: 'Content not found' });
      target.isDeleted = false;
      target.isArchived = false;
      delete target.deletedAt;
      delete target.archivedAt;
      db.deletedIds = db.deletedIds.filter((d) => d !== contentId && d !== stripPrefix(contentId));
      saveDatabase(db);
      return res.status(200).json({ success: true, data: target });
    }

    // ---------------- UPDATE ----------------
    if (req.method === 'PATCH' || req.method === 'PUT' || (req.method === 'POST' && action === 'update')) {
      const raw = req.body && typeof req.body === 'object' ? req.body : {};
      let updates = raw;
      if (!admin) {
        updates = {};
        for (const k of Object.keys(raw)) if (NON_ADMIN_FIELDS.has(k)) updates[k] = raw[k];
      }
      delete updates.id;

      const index = db.contents.findIndex((c) => matches(c, contentId));
      if (index === -1) {
        // BUGFIX: an update must never re-create deleted content
        if (isTombstoned(db, contentId)) return res.status(410).json({ success: false, error: 'Content was permanently deleted' });
        return res.status(404).json({ success: false, error: 'Content not found' });
      }
      if (admin && updates.isDeleted === false) {
        db.deletedIds = db.deletedIds.filter((d) => d !== contentId && d !== stripPrefix(contentId));
      }
      db.contents[index] = { ...db.contents[index], ...updates };
      saveDatabase(db);
      return res.status(200).json({ success: true, data: db.contents[index] });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('API contents error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
