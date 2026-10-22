import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_CONTENT, INITIAL_COMMENTS } from './src/data/initialData.ts';

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
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
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
app.use('/uploads', express.static(UPLOADS_DIR));

// Disable caching for HTML and assets to ensure instant updates without CTRL+F5
app.use((_req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob:; style-src * 'unsafe-inline';");
  next();
});

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

  // Fallback to INITIAL_CONTENT only if database file did not exist or contents was null/undefined
  if (!dbData.contents || !Array.isArray(dbData.contents)) {
    dbData.contents = Array.isArray(INITIAL_CONTENT) ? INITIAL_CONTENT.map((seed: any) => ({ ...seed, seedStatus: 'active' })) : [];
  } else {
    // Smart seed merger per user policy: Combine any missing default seed items into staging/pending queue for Admin approval
    if (Array.isArray(INITIAL_CONTENT)) {
      const existingIds = new Set(dbData.contents.map((c: any) => c.id));
      const deletedSet = new Set(dbData.deletedIds);
      for (const seed of INITIAL_CONTENT) {
        if (seed && seed.id && !existingIds.has(seed.id) && !deletedSet.has(seed.id)) {
          dbData.contents.push({
            ...seed,
            seedStatus: 'pending_approval' // Staged for Super Admin review
          });
        }
      }
    }
  }

  // Filter out deletedIds from dbData.contents
  if (dbData.deletedIds && dbData.deletedIds.length > 0) {
    dbData.contents = dbData.contents.filter((c) => !dbData.deletedIds?.includes(c.id));
  }

  // Purge any remaining Unsplash URLs and replace with CDN assets
  if (dbData.contents && Array.isArray(dbData.contents)) {
    dbData.contents = dbData.contents.map((item: any) => {
      if (item.thumbnail && item.thumbnail.includes('unsplash')) {
        item.thumbnail = 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg';
      }
      if (item.author && item.author.avatar && item.author.avatar.includes('unsplash')) {
        item.author.avatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%233b82f6"/><text x="50" y="63" font-family="Tahoma,sans-serif" font-size="42" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">گ</text></svg>`;
      }
      if (item.slides && Array.isArray(item.slides)) {
        item.slides = item.slides.map((s: any) => {
          if (s.url && s.url.includes('unsplash')) {
            s.url = 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg';
          }
          return s;
        });
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
    console.log(`[Auto Backup] 12-hour database backup created: ${filename}`);
    return { success: true, filename, path: backupPath, timestamp: new Date().toISOString() };
  } catch (err: any) {
    console.warn(`[Auto Backup Warning] Failed to create 12h backup:`, err.message);
    return { success: false, filename: '', path: '', timestamp: new Date().toISOString() };
  }
}

// 12-hour automated background backup scheduler
setInterval(() => {
  createDatabaseBackup();
}, 12 * 60 * 60 * 1000);

function saveDatabase(db: DatabaseSchema) {
  cachedDb = db;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Database Warning] Could not save database file to disk:', err.message);
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
  } catch (err: any) {
    console.warn('Image proxy failed for:', imageUrl, err.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#1e293b"/><text x="400" y="235" font-family="sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">GeekClub Media</text></svg>');
  }
});

// Helper to download real cover image from external platform and cache locally & on CDN
async function downloadAndCacheImage(imageUrl: string, filenamePrefix: string, cdnFolder: string = 'contents'): Promise<string> {
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

    // Save physically in uploads/
    const filename = `${filenamePrefix}.${ext}`;
    const localFilePath = path.join(UPLOADS_DIR, filename);
    let localUrl = `/uploads/${filename}`;
    try {
      fs.writeFileSync(localFilePath, buffer);
    } catch (fsErr: any) {
      console.warn(`[Storage Warning] Could not write image file to disk:`, fsErr.message);
      localUrl = imageUrl;
    }

    // Upload to upc.geekclub.ir CDN
    try {
      const fileBlob = new Blob([buffer], { type: contentType });
      const formData = new FormData();
      formData.append('file', fileBlob, filename);
      formData.append('api_token', 'geekclub_cdn_secret_2026');
      formData.append('folder', cdnFolder || 'contents');

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
          console.log(`[CDN Upload SUCCESS] ${filenamePrefix} uploaded to CDN (${cdnFolder}): ${cdnData.url}`);
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

// Helper to download video file and cache locally & on CDN
async function downloadAndCacheVideo(videoUrl: string, filenamePrefix: string, cdnFolder: string = 'videos'): Promise<string> {
  if (!videoUrl) return videoUrl;
  if (videoUrl.includes('upc.geekclub.ir') || videoUrl.startsWith('/uploads/')) {
    return videoUrl;
  }
  try {
    const cleanUrl = videoUrl.trim().startsWith('http') ? videoUrl.trim() : `https://${videoUrl.trim()}`;
    console.log(`[Video Pipeline] Starting video download from: ${cleanUrl.substring(0, 80)}...`);
    const response = await axios.get(cleanUrl, {
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
    const localFilePath = path.join(UPLOADS_DIR, filename);
    let localUrl = `/uploads/${filename}`;
    try {
      fs.writeFileSync(localFilePath, buffer);
      console.log(`[Video Pipeline] Video downloaded to local server storage: ${localUrl} (${Math.round(buffer.length / 1024)} KB)`);
    } catch (fsErr: any) {
      console.warn(`[Video Pipeline Warning] Could not write video file to disk:`, fsErr.message);
      localUrl = videoUrl;
    }

    // Transfer video to CDN (upc.geekclub.ir)
    try {
      const fileBlob = new Blob([buffer], { type: 'video/mp4' });
      const formData = new FormData();
      formData.append('file', fileBlob, filename);
      formData.append('api_token', 'geekclub_cdn_secret_2026');
      formData.append('folder', cdnFolder || 'videos');

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
          console.log(`[Video Pipeline SUCCESS] Video transferred to CDN (${cdnFolder}): ${cdnData.url}`);
          return cdnData.url;
        }
      }
    } catch (cdnErr: any) {
      console.warn(`[CDN Video Transfer Warning] CDN upload failed for ${filenamePrefix}, serving via local server:`, cdnErr.message);
    }

    return localUrl;
  } catch (err: any) {
    console.warn(`[Video Pipeline Error] Failed to download video from ${videoUrl.substring(0, 60)}:`, err.message);
    return videoUrl;
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
      console.warn('Aparat official API fetch failed, trying v1 fallback:', err.message);
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

  console.log(`[Apify Pipeline] Checking Instagram URL via Apify: ${instagramUrl}`);
  if (!token) {
    console.warn(`[Apify Pipeline Notice] APIFY_API_TOKEN is not configured in process.env or settings. Falling back to multi-tier extraction.`);
    return null;
  }

  try {
    const actorEndpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${token}&timeout=60`;
    console.log(`[Apify Pipeline] Executing Apify actor ${actorId} for ${instagramUrl}...`);

    const apifyResponse = await axios.post(
      actorEndpoint,
      {
        directUrls: [instagramUrl],
        resultsType: 'posts',
        resultsLimit: 1,
        searchLimit: 1
      },
      {
        timeout: 65000,
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

  // 3. Instagram metadata extraction (Apify + multi-tier fallback)
  if (cleanUrl.includes('instagram.com')) {
    // Attempt Apify extraction first
    const apifyResult = await fetchInstagramViaApify(cleanUrl);
    if (apifyResult && apifyResult.success) {
      return apifyResult;
    }

    // Fallback extraction if Apify is not configured or failed
    let title = 'پست منتخب در اینستاگرام';
    let authorName = 'پیج اینستاگرام';
    let description = 'محتوای به اشتراک گذاشته شده در اینستاگرام. برای مشاهده تعاملی روی کارت کلیک نمایید.';
    let rawThumb = '';
    let rawVideo = '';

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

    let finalVideo = '';
    if (rawVideo) {
      finalVideo = await downloadAndCacheVideo(rawVideo, `vid_ig_${Date.now()}`);
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
      videoUrl: finalVideo || undefined,
      mediaType: finalVideo ? 'video' : 'image',
      embedUrl: cleanUrl.replace(/\/$/, '') + '/embed',
      readingOrWatchTime: cleanUrl.includes('reel') ? 'ریلز اینستاگرام' : 'پست اینستاگرام',
      tags: ['اینستاگرام', 'ریلز', 'رسانه'],
      data: {
        title,
        author_name: authorName,
        thumbnail_url: finalThumbnail,
        video_url: finalVideo
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
      item.thumbnail = meta.thumbnail.trim();
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
  const { platform, category, search, sort, includeArchived, includePending, includeDeleted } = req.query;

  // Always filter out permanently deleted IDs first
  if (db.deletedIds && Array.isArray(db.deletedIds) && db.deletedIds.length > 0) {
    const delSet = new Set(db.deletedIds);
    results = results.filter((c) => !delSet.has(c.id));
  }

  // Filter out soft-deleted items unless explicitly requested (includeDeleted === 'true')
  if (includeDeleted !== 'true') {
    results = results.filter((c) => !c.isDeleted);
  }

  // Filter out archived items by default unless explicitly requested
  if (includeArchived !== 'true') {
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
  // If not a data URL and not already on CDN, we can ensure CDN upload
  if (rawThumbnail && !rawThumbnail.startsWith('data:') && !rawThumbnail.includes('upc.geekclub.ir')) {
    try {
      finalThumbnail = await ensureCDNImage(rawThumbnail, 'contents');
    } catch {}
  }

  const db = loadDatabase();
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
    !newItem.thumbnail.includes('upc.geekclub.ir') || 
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
  let index = db.contents.findIndex((c) => c.id === id);

  if (!db.deletedIds) db.deletedIds = [];

  if (updates.isDeleted === true) {
    if (!db.deletedIds.includes(id)) {
      db.deletedIds.push(id);
    }
  } else if (updates.isDeleted === false) {
    db.deletedIds = db.deletedIds.filter((dId) => dId !== id);
  }
  
  if (index === -1) {
    // If item was not yet explicitly in database.json, add it with updates
    const newItem = { id, ...updates };
    db.contents.push(newItem);
    index = db.contents.length - 1;
  } else {
    db.contents[index] = { ...db.contents[index], ...updates };
  }
  
  saveDatabase(db);
  res.json({ success: true, data: db.contents[index] });
});

// 2.3 DELETE /api/contents/:id - Permanently delete content
app.delete('/api/contents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  db.contents = db.contents.filter((c) => c.id !== id);
  if (!db.deletedIds) db.deletedIds = [];
  if (!db.deletedIds.includes(id)) {
    db.deletedIds.push(id);
  }
  if (db.comments && db.comments[id]) {
    delete db.comments[id];
  }
  saveDatabase(db);
  res.json({ success: true, message: 'Content deleted permanently' });
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

// 7. POST /api/test-apify - Test Apify API Token & Actor configuration
app.post('/api/test-apify', async (req: Request, res: Response) => {
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
app.get('/api/site-settings', (req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, data: db.settings || {} });
});

app.post('/api/site-settings', (req: Request, res: Response) => {
  const db = loadDatabase();
  db.settings = { ...(db.settings || {}), ...req.body };
  saveDatabase(db);
  res.json({ success: true, data: db.settings });
});

// 8.1. GET & POST /api/profiles - User profiles persistence
app.get('/api/profiles', (req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, data: db.profiles || {} });
});

app.post('/api/profiles', (req: Request, res: Response) => {
  const profile = req.body;
  if (!profile || (!profile.uid && !profile.email && !profile.username)) {
    return res.status(400).json({ success: false, error: 'Valid profile object with uid, email, or username is required' });
  }

  const db = loadDatabase();
  if (!db.profiles) db.profiles = {};

  const key = profile.uid || profile.email || profile.username;
  db.profiles[key] = { ...(db.profiles[key] || {}), ...profile, updatedAt: new Date().toISOString() };
  saveDatabase(db);

  res.json({ success: true, data: db.profiles[key] });
});

// 8.2. GET /api/database/export - Export entire site database
app.get('/api/database/export', (req: Request, res: Response) => {
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

// 8.3. POST /api/database/import - Import/Restore site database snapshot
app.post('/api/database/import', (req: Request, res: Response) => {
  const importedData = req.body;
  if (!importedData || typeof importedData !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid backup JSON payload' });
  }

  const targetData = importedData.data || importedData;

  const newDb: DatabaseSchema = {
    contents: Array.isArray(targetData.contents) ? targetData.contents : [],
    comments: typeof targetData.comments === 'object' && targetData.comments ? targetData.comments : {},
    deletedIds: Array.isArray(targetData.deletedIds) ? targetData.deletedIds : [],
    settings: typeof targetData.settings === 'object' && targetData.settings ? targetData.settings : {},
    profiles: typeof targetData.profiles === 'object' && targetData.profiles ? targetData.profiles : {}
  };

  saveDatabase(newDb);
  res.json({
    success: true,
    message: 'داده‌های سایت با موفقیت بازیابی و روی دیسک قرار گرفتند.',
    summary: {
      contents: newDb.contents.length,
      profiles: Object.keys(newDb.profiles || {}).length,
      deletedIds: (newDb.deletedIds || []).length
    }
  });
});

// 8.4. POST /api/database/merge-seeds - Safely re-merge initial templates
app.post('/api/database/merge-seeds', (req: Request, res: Response) => {
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

// 8.5. POST /api/contents/:id/archive - Soft delete (archive) content
app.post('/api/contents/:id/archive', (req: Request, res: Response) => {
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

// 8.6. POST /api/contents/:id/restore - Restore soft-deleted content
app.post('/api/contents/:id/restore', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDatabase();
  const content = db.contents.find((c) => c.id === id);
  if (!content) {
    return res.status(404).json({ success: false, error: 'Content not found' });
  }
  content.isArchived = false;
  delete content.archivedAt;
  saveDatabase(db);
  res.json({ success: true, message: 'محتوا با موفقیت به حالت انتشار بازگشت.', data: content });
});

// 8.7. POST /api/profiles/:key/archive - Soft delete user profile
app.post('/api/profiles/:key/archive', (req: Request, res: Response) => {
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

// 8.8. POST /api/profiles/:key/restore - Restore user profile
app.post('/api/profiles/:key/restore', (req: Request, res: Response) => {
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

// 8.9. POST /api/profiles/:key/role - Update user access level (admin, editor, user)
app.post('/api/profiles/:key/role', (req: Request, res: Response) => {
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

// 8.10. GET /api/archive/list - List archived contents and profiles for Super Admin
app.get('/api/archive/list', (req: Request, res: Response) => {
  const db = loadDatabase();
  const archivedContents = (db.contents || []).filter((c) => c.isArchived);
  const archivedProfiles = Object.values(db.profiles || {}).filter((p: any) => p.isArchived);
  res.json({ success: true, data: { contents: archivedContents, profiles: archivedProfiles } });
});

// 8.11. GET /api/seeds/pending - List pending code seeds for Super Admin approval
app.get('/api/seeds/pending', (req: Request, res: Response) => {
  const db = loadDatabase();
  const pendingSeeds = (db.contents || []).filter((c) => c.seedStatus === 'pending_approval');
  res.json({ success: true, count: pendingSeeds.length, data: pendingSeeds });
});

// 8.12. POST /api/seeds/approve - Approve pending seed item
app.post('/api/seeds/approve', (req: Request, res: Response) => {
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

// 8.13. POST /api/seeds/reject - Reject pending seed item
app.post('/api/seeds/reject', (req: Request, res: Response) => {
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

// 8.14. POST /api/database/backup-now - Trigger 12h database backup manually
app.post('/api/database/backup-now', (req: Request, res: Response) => {
  const backupResult = createDatabaseBackup();
  res.json({
    success: backupResult.success,
    message: backupResult.success ? `پشتیبان‌گیری ۱۲ ساعته با موفقیت انجام شد: ${backupResult.filename}` : 'پشتیبان‌گیری با خطا مواجه شد.',
    data: backupResult
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

  if (key !== 'geekclub_admin_secure_key') {
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
  if (!IS_VERCEL) {
    syncPlatformCoverImages().catch((err) => console.warn('Sync cover images warning:', err));
  }

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
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 GeekClub full-stack server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
