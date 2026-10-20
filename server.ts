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

// Helper to download real cover image from external platform and cache locally & on CDN
async function downloadAndCacheImage(imageUrl: string, filenamePrefix: string): Promise<string> {
  if (!imageUrl) return imageUrl;
  if (imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:')) {
    return imageUrl;
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
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('svg')) ext = 'svg';

    const buffer = Buffer.from(response.data);

    // Save physically in public/uploads/
    const filename = `${filenamePrefix}.${ext}`;
    const localFilePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(localFilePath, buffer);
    const localUrl = `/uploads/${filename}`;

    // Upload to upc.geekclub.ir CDN
    try {
      const fileBlob = new Blob([buffer], { type: contentType });
      const formData = new FormData();
      formData.append('file', fileBlob, filename);
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
          console.log(`[CDN Upload SUCCESS] ${filenamePrefix} uploaded to CDN: ${cdnData.url}`);
          return cdnData.url;
        }
      }
    } catch (cdnErr: any) {
      console.warn(`[CDN Upload Warning] Upload to upc.geekclub.ir failed for ${filenamePrefix}:`, cdnErr.message);
    }

    return localUrl;
  } catch (err: any) {
    console.warn(`Failed to download cover image from ${imageUrl}:`, err.message);
    return imageUrl;
  }
}

// 0.1. POST /api/transfer-to-cdn - Server-side external image downloader & CDN uploader
app.post('/api/transfer-to-cdn', async (req: Request, res: Response) => {
  const { imageUrl, folder, filenamePrefix } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ success: false, error: 'imageUrl parameter is required' });
  }

  if (imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:') || imageUrl.startsWith('/uploads/')) {
    return res.json({ success: true, url: imageUrl });
  }

  try {
    const pfx = filenamePrefix || `transfer_${Date.now()}`;
    const cdnUrl = await downloadAndCacheImage(imageUrl, pfx);
    return res.json({ success: true, url: cdnUrl });
  } catch (err: any) {
    console.error('Server image download error:', err.message);
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    return res.json({ success: true, url: proxyUrl });
  }
});

// Centralized metadata extractor that handles YouTube (oEmbed & scrape), Aparat (API & scrape), Instagram, and Web Articles
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
      const pageRes = await axios.get(cleanUrl, {
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
    let title = 'ویدیوی آموزشی آپارات';
    let authorName = 'کانال آپارات';
    let description = '';
    let readingOrWatchTime = 'ویدیو آپارات';
    let rawThumb = '';

    try {
      const apRes = await axios.get(`https://www.aparat.com/api/fa/v1/video/video/show/videohash/${hash}`, {
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      const attr = apRes.data?.data?.attributes;
      if (attr) {
        if (attr.title) title = attr.title;
        if (attr.description) description = attr.description;
        if (attr.owner_username) authorName = attr.owner_username;
        if (attr.duration) readingOrWatchTime = `${Math.ceil(attr.duration / 60)} دقیقه ویدیو`;
        rawThumb = attr.big_poster || attr.poster || attr.medium_poster || attr.small_poster || '';
      }
    } catch (err: any) {
      console.warn('Aparat API fetch error:', err.message);
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

  // 3. Instagram metadata extraction
  if (cleanUrl.includes('instagram.com')) {
    let title = 'پست منتخب در اینستاگرام';
    let authorName = 'پیج اینستاگرام';
    let description = 'محتوای به اشتراک گذاشته شده در اینستاگرام. برای مشاهده تعاملی روی کارت کلیک نمایید.';
    let rawThumb = '';

    try {
      const noembed = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, { timeout: 6000 });
      if (noembed.data) {
        if (noembed.data.title) title = noembed.data.title;
        if (noembed.data.author_name) authorName = noembed.data.author_name;
        if (noembed.data.thumbnail_url) rawThumb = noembed.data.thumbnail_url;
      }
    } catch {}

    let finalThumbnail = rawThumb;
    if (rawThumb) {
      finalThumbnail = await downloadAndCacheImage(rawThumb, `cover_ig_${Date.now()}`);
    }

    return {
      success: true,
      platform: 'instagram',
      title,
      description,
      authorName,
      thumbnail: finalThumbnail,
      image: finalThumbnail,
      author: authorName,
      embedUrl: cleanUrl.replace(/\/$/, '') + '/embed',
      readingOrWatchTime: cleanUrl.includes('reel') ? 'ریلز اینستاگرام' : 'پست اینستاگرام',
      tags: ['اینستاگرام', 'ریلز', 'رسانه'],
      data: {
        title,
        author_name: authorName,
        thumbnail_url: finalThumbnail
      }
    };
  }

  // 4. General Web Article / Webpage
  try {
    const pageRes = await axios.get(cleanUrl, {
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
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i),
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)
    ];
    for (const im of imgMatches) {
      if (im && im[1] && im[1].trim()) {
        image = im[1].trim();
        break;
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
      finalThumbnail = await downloadAndCacheImage(image, `cover_art_${Date.now()}`);
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
    const item = db.contents.find((c: any) => c.id === id);
    if (!item) return null;

    const isGenericTitle = !item.title || 
      item.title === 'ویدیوی یوتیوب' || 
      item.title === 'ویدیوی آپارات' || 
      item.title === 'پست اینستاگرام' || 
      item.title === 'محتوای اشتراک‌گذاری شده' || 
      item.title === 'مقاله وب' ||
      item.title.startsWith('مقاله در ');

    const isGenericDesc = !item.description || 
      item.description.includes('به اشتراک گذاشته شده') ||
      item.description.length < 10;

    const needsThumbnailUpdate = !item.thumbnail || 
      !item.thumbnail.includes('upc.geekclub.ir') || 
      item.thumbnail.startsWith('data:') ||
      item.thumbnail.includes('unsplash');

    let changed = false;

    if (isGenericTitle && meta.title) {
      item.title = meta.title;
      changed = true;
    }
    if (isGenericDesc && meta.description) {
      item.description = meta.description;
      changed = true;
    }
    if (needsThumbnailUpdate && meta.thumbnail) {
      item.thumbnail = meta.thumbnail;
      changed = true;
    }
    if (meta.authorName && (!item.author?.name || item.author.name === 'کاربر گیک کلاب')) {
      if (!item.author) item.author = { name: meta.authorName, handle: `@${meta.authorName.replace(/\s+/g, '_')}` };
      else item.author.name = meta.authorName;
      changed = true;
    }
    if (meta.readingOrWatchTime && (!item.readingOrWatchTime || item.readingOrWatchTime === '۵ دقیقه')) {
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

    if (changed) {
      saveDatabase(db);
      console.log(`[Background Enrich] Content ${id} updated: Title="${item.title}", Cover="${item.thumbnail}"`);
    }
    return item;
  } catch (err: any) {
    console.warn(`[Background Enrich] Error for content ${id}:`, err.message);
    return null;
  }
}

// 0.2. GET /api/extract-metadata & /api/metadata/extract
app.get('/api/extract-metadata', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  return extractMetadataHandler(targetUrl, res);
});

app.get('/api/metadata/extract', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  return extractMetadataHandler(targetUrl, res);
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

async function ensureCDNImage(imageUrl: string, _folder = 'contents'): Promise<string> {
  if (!imageUrl || imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:') || imageUrl.startsWith('/uploads/')) {
    return imageUrl;
  }
  return downloadAndCacheImage(imageUrl, `gc_${Date.now()}`);
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

  // Background enrichment: If the user didn't wait and submitted quickly with generic title/thumbnail
  const isGenericTitle = !newItem.title || 
    newItem.title === 'ویدیوی یوتیوب' || 
    newItem.title === 'ویدیوی آپارات' || 
    newItem.title === 'پست اینستاگرام' || 
    newItem.title === 'محتوای اشتراک‌گذاری شده' || 
    newItem.title === 'مقاله وب' ||
    newItem.title.startsWith('مقاله در ');

  const needsThumbnail = !newItem.thumbnail || 
    !newItem.thumbnail.includes('upc.geekclub.ir') || 
    newItem.thumbnail.startsWith('data:') ||
    newItem.thumbnail.includes('unsplash');

  if (isGenericTitle || needsThumbnail || req.body.needsEnrichment) {
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
app.post('/api/contents/:id/enrich', async (req: Request, res: Response) => {
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

app.get('/api/contents/:id/enrich', async (req: Request, res: Response) => {
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

// 2.2 PATCH /api/contents/:id - Update content fields in local db
app.patch('/api/contents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDatabase();
  const index = db.contents.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Content not found' });
  }
  db.contents[index] = { ...db.contents[index], ...updates };
  saveDatabase(db);
  res.json({ success: true, data: db.contents[index] });
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
