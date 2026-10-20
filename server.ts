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

const UPLOADS_DIR = path.resolve(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Disable caching for HTML and assets to ensure instant updates without CTRL+F5
app.use((_req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

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

// 0. GET /api/proxy-image - Direct image proxy for blocked external images (YouTube, Instagram, etc.)
app.get('/api/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('URL is required');
  }
  try {
    const cleanUrl = imageUrl.trim().startsWith('http') ? imageUrl.trim() : `https://${imageUrl.trim()}`;
    const response = await axios.get(cleanUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const rawType = response.headers['content-type'];
    const contentType = typeof rawType === 'string' ? rawType : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(response.data));
  } catch (err: any) {
    console.warn('Image proxy failed for:', imageUrl, err.message);
    return res.status(404).send('Image unavailable');
  }
});

// 0.1. POST /api/transfer-to-cdn - Server-side external image downloader & CDN uploader
app.post('/api/transfer-to-cdn', async (req: Request, res: Response) => {
  const { imageUrl, folder } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ success: false, error: 'imageUrl parameter is required' });
  }

  if (imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:') || imageUrl.startsWith('/uploads/')) {
    return res.json({ success: true, url: imageUrl });
  }

  try {
    const targetFolder = folder || 'contents';
    
    // Step 1: Download image bytes on server
    console.log(`[CDN Transfer Step 1/2] Downloading image on server from: ${imageUrl}`);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const rawType = response.headers['content-type'];
    const contentType = typeof rawType === 'string' ? rawType : 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('svg')) ext = 'svg';

    const buffer = Buffer.from(response.data);

    // Save locally on server disk first
    const filename = `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const localFilePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(localFilePath, buffer);
    const localUrl = `/uploads/${filename}`;
    console.log(`[CDN Transfer Step 1/2 Complete] Saved locally on server at: ${localFilePath}`);

    // Step 2: Read downloaded file from local disk and transfer to CDN (s1/upload.php)
    console.log(`[CDN Transfer Step 2/2] Transferring downloaded server file to CDN https://upc.geekclub.ir/s1/upload.php...`);
    try {
      const fileBufferFromDisk = fs.readFileSync(localFilePath);
      const fileBlob = new Blob([fileBufferFromDisk], { type: contentType });
      const formData = new FormData();
      formData.append('file', fileBlob, filename);
      formData.append('api_token', 'geekclub_cdn_secret_2026');
      formData.append('folder', targetFolder);

      const cdnResp = await fetch('https://upc.geekclub.ir/s1/upload.php', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer geekclub_cdn_secret_2026',
          'X-Api-Token': 'geekclub_cdn_secret_2026'
        },
        body: formData
      });

      if (cdnResp.ok) {
        const cdnData = await cdnResp.json() as any;
        if (cdnData.status && cdnData.url) {
          console.log(`[CDN Transfer Step 2/2 Complete] File uploaded to CDN URL: ${cdnData.url}`);
          return res.json({ success: true, url: cdnData.url });
        }
      }
    } catch (cdnErr: any) {
      console.warn('[CDN Transfer Step 2/2 Warning] CDN upload endpoint unavailable, serving from local server path:', cdnErr.message);
    }

    return res.json({ success: true, url: localUrl });
  } catch (err: any) {
    console.error('Server image download error:', err.message);
    // If download failed, return proxy URL as ultimate fallback
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    return res.json({ success: true, url: proxyUrl });
  }
});

// 0.1. GET /api/extract-metadata - Fetch page metadata (title, meta description, image, author) server-side
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

async function ensureCDNImage(imageUrl: string, folder = 'contents'): Promise<string> {
  if (!imageUrl || imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:') || imageUrl.startsWith('/uploads/')) {
    return imageUrl;
  }
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const rawType = response.headers['content-type'];
    const contentType = typeof rawType === 'string' ? rawType : 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('svg')) ext = 'svg';

    const buffer = Buffer.from(response.data);

    try {
      const fileBlob = new Blob([buffer], { type: contentType });
      const formData = new FormData();
      formData.append('file', fileBlob, `gc_${Date.now()}.${ext}`);
      formData.append('api_token', 'geekclub_cdn_secret_2026');
      formData.append('folder', folder);

      const cdnResp = await fetch('https://upc.geekclub.ir/s1/upload.php', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer geekclub_cdn_secret_2026',
          'X-Api-Token': 'geekclub_cdn_secret_2026'
        },
        body: formData
      });

      if (cdnResp.ok) {
        const cdnData = await cdnResp.json() as any;
        if (cdnData.status && cdnData.url) {
          return cdnData.url;
        }
      }
    } catch (cdnErr: any) {
      console.warn('CDN upload to upc.geekclub.ir failed in ensureCDNImage:', cdnErr.message);
    }

    // Save locally
    const filename = `cached_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const localFilePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(localFilePath, buffer);
    return `/uploads/${filename}`;
  } catch (err: any) {
    console.warn('Auto CDN transfer in server route skipped:', err.message);
  }
  return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}

// 2. POST /api/contents - Add new content
app.post('/api/contents', async (req: Request, res: Response) => {
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

  const rawThumbnail = thumbnail || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%230f172a"/><text x="400" y="235" font-family="Tahoma,sans-serif" font-size="22" fill="%23f8fafc" text-anchor="middle">GeekClub Media</text></svg>';
  const finalThumbnail = await ensureCDNImage(rawThumbnail, 'contents');

  const db = loadDatabase();
  const newItem = {
    id: `content-${Date.now()}`,
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

// Helper to download real cover image from external platform and cache locally & on CDN
async function downloadAndCacheImage(imageUrl: string, filenamePrefix: string): Promise<string> {
  if (!imageUrl) return imageUrl;
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const rawType = response.headers['content-type'];
    const contentType = typeof rawType === 'string' ? rawType : 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';

    const buffer = Buffer.from(response.data);

    // Save physically in public/uploads/
    const filename = `${filenamePrefix}.${ext}`;
    const localFilePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(localFilePath, buffer);
    const localUrl = `/uploads/${filename}`;

    // Attempt primary upload to upc.geekclub.ir CDN
    try {
      const fileBlob = new Blob([buffer], { type: contentType });
      const formData = new FormData();
      formData.append('file', fileBlob, `${filenamePrefix}.${ext}`);
      formData.append('api_token', 'geekclub_cdn_secret_2026');
      formData.append('folder', 'contents');

      const cdnResp = await fetch('https://upc.geekclub.ir/s1/upload.php', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer geekclub_cdn_secret_2026',
          'X-Api-Token': 'geekclub_cdn_secret_2026'
        },
        body: formData
      });

      if (cdnResp.ok) {
        const cdnData = await cdnResp.json() as any;
        if (cdnData.status && cdnData.url) {
          try {
            const checkCDN = await axios.head(cdnData.url, { timeout: 3500 });
            if (checkCDN.status === 200) {
              return cdnData.url;
            }
          } catch {
            console.warn(`CDN URL ${cdnData.url} not responding with 200, using local file ${localUrl}`);
          }
        }
      }
    } catch (cdnErr: any) {
      console.warn(`CDN upload to upc.geekclub.ir skipped for ${filenamePrefix}:`, cdnErr.message);
    }

    return localUrl;
  } catch (err: any) {
    console.warn(`Failed to download cover image from ${imageUrl}:`, err.message);
    return imageUrl;
  }
}

async function syncPlatformCoverImages() {
  try {
    const db = loadDatabase();
    let updated = false;

    for (const item of db.contents) {
      let sourceImageUrl = '';
      
      // 1. YouTube Cover Download
      if (item.platform === 'youtube' && item.url) {
        const ytMatch = item.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytMatch && ytMatch[1]) {
          sourceImageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        }
      } 
      // 2. Aparat Cover Download
      else if (item.platform === 'aparat' && item.url) {
        const apMatch = item.url.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/i);
        if (apMatch && apMatch[1]) {
          try {
            const res = await axios.get(`https://www.aparat.com/etc/api/video/videohash/${apMatch[1]}`, { timeout: 5000 });
            if (res.data?.video?.big_poster) {
              sourceImageUrl = res.data.video.big_poster;
            } else if (res.data?.video?.small_poster) {
              sourceImageUrl = res.data.video.small_poster;
            }
          } catch {
            try {
              const noembed = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(item.url)}`, { timeout: 5000 });
              if (noembed.data?.thumbnail_url) {
                sourceImageUrl = noembed.data.thumbnail_url;
              }
            } catch {}
          }
        }
      }
      // 3. Instagram / Article Cover Download
      else if (item.url) {
        try {
          const noembed = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(item.url)}`, { timeout: 5000 });
          if (noembed.data?.thumbnail_url) {
            sourceImageUrl = noembed.data.thumbnail_url;
          }
        } catch {}
      }

      // Ensure local server file exists
      const expectedFilename = `cover_${item.id}.jpg`;
      const localFilePath = path.join(UPLOADS_DIR, expectedFilename);
      if (sourceImageUrl && !fs.existsSync(localFilePath)) {
        console.log(`📥 Downloading original ${item.platform} cover for ${item.id} from ${sourceImageUrl}...`);
        await downloadAndCacheImage(sourceImageUrl, `cover_${item.id}`);
      }

      // If thumbnail is empty, use working source image or fallback
      if (!item.thumbnail) {
        item.thumbnail = sourceImageUrl || `/uploads/${expectedFilename}`;
        updated = true;
      }
    }

    if (updated) {
      saveDatabase(db);
      console.log('✅ Real YouTube & Aparat cover images downloaded and saved successfully!');
    }
  } catch (err: any) {
    console.error('Error in syncPlatformCoverImages:', err.message);
  }
}

// --- Development & Production Middleware ---
async function startServer() {
  // Sync and download real YouTube and Aparat thumbnails on startup
  await syncPlatformCoverImages();

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filepath) => {
          if (filepath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (filepath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        }
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
