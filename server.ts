import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_PATH = path.resolve(__dirname, 'data', 'database.json');

app.use(express.json());

// Helper to load database
interface DatabaseSchema {
  contents: any[];
  comments: Record<string, any[]>;
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return { contents: [], comments: {} };
}

function saveDatabase(db: DatabaseSchema) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// --- API Routes ---

// 0. GET /api/extract-metadata - Fetch page metadata (title, meta description, image, author) server-side
app.get('/api/extract-metadata', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL query parameter is required' });
  }

  try {
    const cleanUrl = targetUrl.trim().startsWith('http') ? targetUrl.trim() : `https://${targetUrl.trim()}`;
    const response = await axios.get(cleanUrl, {
      timeout: 6000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    const html = response.data;
    if (typeof html !== 'string') {
      return res.json({ title: '', description: '', image: '', author: '' });
    }

    // Extract Meta Description (description, og:description, twitter:description)
    let description = '';
    const descMatches = [
      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i),
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i),
      html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:description["']/i)
    ];
    for (const m of descMatches) {
      if (m && m[1] && m[1].trim()) {
        description = m[1].trim();
        break;
      }
    }

    // Extract Title (og:title, <title>, twitter:title)
    let title = '';
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

    // Extract Thumbnail / OG Image
    let image = '';
    const imgMatches = [
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)
    ];
    for (const im of imgMatches) {
      if (im && im[1] && im[1].trim()) {
        image = im[1].trim();
        break;
      }
    }

    // Extract Author
    let author = '';
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

    return res.json({
      title,
      description,
      image,
      author
    });
  } catch (err: any) {
    console.error('Error in /api/extract-metadata:', err.message);
    return res.json({ title: '', description: '', image: '', author: '' });
  }
});

// 1. GET /api/contents - List all contents with optional filters
app.get('/api/contents', (req: Request, res: Response) => {
  const db = loadDatabase();
  let results = [...db.contents];
  const { platform, category, search, sort } = req.query;

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

  res.json({ success: true, count: results.length, data: results });
});

// 2. POST /api/contents - Add new content
app.post('/api/contents', (req: Request, res: Response) => {
  const { 
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
    sourceDomain 
  } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const db = loadDatabase();
  const newItem = {
    id: `content-${Date.now()}`,
    title: title || 'محتوای اشتراک‌گذاری شده',
    description: description || '',
    url,
    platform: platform || 'article',
    embedUrl: embedUrl || url,
    thumbnail: thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    author: author || {
      name: 'کاربر گیک کلاب',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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
    sourceDomain: sourceDomain || 'web'
  };

  db.contents.unshift(newItem);
  saveDatabase(db);

  res.status(201).json({ success: true, data: newItem });
});

// 3. POST /api/contents/:id/reaction - Like or Dislike
app.post('/api/contents/:id/reaction', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reaction } = req.body; // 'like' | 'dislike' | null

  const db = loadDatabase();
  const content = db.contents.find((c) => c.id === id);

  if (!content) {
    return res.status(404).json({ success: false, error: 'Content not found' });
  }

  const prevReaction = content.userReaction;

  if (reaction === 'like') {
    if (prevReaction === 'like') {
      content.likesCount = Math.max(0, (content.likesCount || 0) - 1);
      content.userReaction = null;
    } else if (prevReaction === 'dislike') {
      content.likesCount = (content.likesCount || 0) + 1;
      content.dislikesCount = Math.max(0, (content.dislikesCount || 0) - 1);
      content.userReaction = 'like';
    } else {
      content.likesCount = (content.likesCount || 0) + 1;
      content.userReaction = 'like';
    }
  } else if (reaction === 'dislike') {
    if (prevReaction === 'dislike') {
      content.dislikesCount = Math.max(0, (content.dislikesCount || 0) - 1);
      content.userReaction = null;
    } else if (prevReaction === 'like') {
      content.dislikesCount = (content.dislikesCount || 0) + 1;
      content.likesCount = Math.max(0, (content.likesCount || 0) - 1);
      content.userReaction = 'dislike';
    } else {
      content.dislikesCount = (content.dislikesCount || 0) + 1;
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
app.post('/api/contents/:id/comments', (req: Request, res: Response) => {
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
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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

// 7. GET /api/metadata/extract - Server-side oEmbed scraper
app.get('/api/metadata/extract', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'url parameter required' });
  }

  try {
    const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return res.json({ success: true, data });
    }
  } catch (err) {
    console.error('Server metadata extract error:', err);
  }

  res.json({ success: false, message: 'Could not fetch remote metadata' });
});

// --- Development & Production Middleware ---
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite in middleware mode for seamless development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GeekClub full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
