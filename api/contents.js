import { INITIAL_CONTENT } from './data.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'data', 'database.json');

function loadDatabase() {
  let dbData = { contents: INITIAL_CONTENT, comments: {} };
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.contents) && parsed.contents.length > 0) {
        dbData = parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading database in api/contents.js:', err);
  }

  if (!dbData.contents || !Array.isArray(dbData.contents) || dbData.contents.length === 0) {
    dbData.contents = [...INITIAL_CONTENT];
  }
  if (dbData.deletedIds && dbData.deletedIds.length > 0) {
    dbData.contents = dbData.contents.filter((c) => !dbData.deletedIds.includes(c.id));
  }
  return dbData;
}

function saveDatabase(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving database in api/contents.js:', err);
  }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = loadDatabase();
  const urlPath = req.url || '';
  const pathParts = urlPath.split('?')[0].split('/').filter(Boolean);
  const contentId = pathParts.length > 2 ? pathParts[2] : req.query?.id;

  try {
    // Check for soft-delete subpath
    if (urlPath.includes('/soft-delete') || req.body?.isDeleted === true) {
      const id = contentId || req.query?.id || req.body?.id;
      if (id) {
        let matched = false;
        for (const c of db.contents) {
          if (c.id === id || c.id.replace(/^(post|content)-/, '') === id.replace(/^(post|content)-/, '')) {
            c.isDeleted = true;
            c.isArchived = true;
            c.deletedAt = req.body?.deletedAt || new Date().toISOString();
            matched = true;
          }
        }
        if (!matched) {
          db.contents.push({ id, title: 'محتوای حذف‌شده', url: '', isDeleted: true, isArchived: true });
        }
        saveDatabase(db);
        return res.status(200).json({ success: true, message: 'Content soft-deleted' });
      }
    }

    // Check for restore subpath
    if (urlPath.includes('/restore') || (req.body?.isDeleted === false && req.method === 'POST')) {
      const id = contentId || req.query?.id || req.body?.id;
      if (id) {
        for (const c of db.contents) {
          if (c.id === id || c.id.replace(/^(post|content)-/, '') === id.replace(/^(post|content)-/, '')) {
            c.isDeleted = false;
            c.isArchived = false;
            delete c.deletedAt;
            delete c.archivedAt;
          }
        }
        if (db.deletedIds) {
          db.deletedIds = db.deletedIds.filter((dId) => dId !== id && dId !== id.replace(/^(post|content)-/, ''));
        }
        saveDatabase(db);
        return res.status(200).json({ success: true, message: 'Content restored' });
      }
    }

    if (req.method === 'GET') {
      const { platform, category, search, sort, includeDeleted } = req.query || {};
      let results = [...db.contents];

      if (db.deletedIds && db.deletedIds.length > 0) {
        results = results.filter((c) => !db.deletedIds.includes(c.id));
      }

      if (includeDeleted !== 'true') {
        results = results.filter((c) => !c.isDeleted && !c.isArchived);
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
          const matchTags = c.tags?.some((t) => t.toLowerCase().includes(q));
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

      return res.status(200).json({ success: true, count: results.length, data: results });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const newItem = {
        id: body.id || `content-${Date.now()}`,
        title: body.title || 'محتوای اشتراک‌گذاری شده',
        description: body.description || '',
        url: body.url || '',
        platform: body.platform || 'article',
        embedUrl: body.embedUrl || body.url || '',
        thumbnail: body.thumbnail || '',
        author: body.author || { name: 'کاربر گیک کلاب', avatar: '' },
        category: body.category || 'tech',
        tags: body.tags || ['محتوا', 'گیک_کلاب'],
        publishedAt: 'همین الان',
        readingOrWatchTime: body.readingOrWatchTime || '۵ دقیقه',
        likesCount: body.likesCount ?? 1,
        dislikesCount: body.dislikesCount ?? 0,
        commentsCount: body.commentsCount ?? 0,
        approvalStatus: body.approvalStatus || 'approved',
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

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const id = contentId || req.query?.id;
      const updates = req.body || {};
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Content ID is required for update' });
      }

      let index = db.contents.findIndex((c) => c.id === id);
      if (index === -1) {
        const newItem = { id, ...updates };
        db.contents.push(newItem);
        index = db.contents.length - 1;
      } else {
        db.contents[index] = { ...db.contents[index], ...updates };
      }

      saveDatabase(db);
      return res.status(200).json({ success: true, data: db.contents[index] });
    }

    if (req.method === 'DELETE') {
      const id = contentId || req.query?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Content ID is required for delete' });
      }

      db.contents = db.contents.filter((c) => c.id !== id);
      if (!db.deletedIds) db.deletedIds = [];
      if (!db.deletedIds.includes(id)) {
        db.deletedIds.push(id);
      }
      saveDatabase(db);
      return res.status(200).json({ success: true, message: 'Content deleted successfully' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('API contents error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
