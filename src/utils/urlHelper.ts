import { Platform, Category, inferCategoryFromContent } from '../types/content';

export interface ParsedUrlResult {
  platform: Platform;
  embedUrl: string;
  sourceDomain: string;
  detectedId?: string;
}

export interface ExtractedMetadata {
  platform: Platform;
  title: string;
  description: string;
  authorName: string;
  thumbnail: string;
  embedUrl: string;
  tags: string[];
  category: Category;
  readingOrWatchTime: string;
  sourceDomain: string;
}

export function parseContentUrl(inputUrl: string): ParsedUrlResult {
  const url = inputUrl.trim();
  
  // Check YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (youtubeMatch && youtubeMatch[1]) {
    const videoId = youtubeMatch[1];
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      sourceDomain: 'youtube.com',
      detectedId: videoId
    };
  }

  // Check Instagram
  const instagramMatch = url.match(
    /(?:instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+))/i
  );
  if (instagramMatch && instagramMatch[1]) {
    const postCode = instagramMatch[1];
    return {
      platform: 'instagram',
      embedUrl: `https://www.instagram.com/p/${postCode}/embed`,
      sourceDomain: 'instagram.com',
      detectedId: postCode
    };
  }

  // Check Aparat (aparat.com/v/XXXXX)
  const aparatMatch = url.match(
    /(?:aparat\.com\/(?:v|video\/video\/embed\/videohash)\/([a-zA-Z0-9]+))/i
  );
  if (aparatMatch && aparatMatch[1]) {
    const videoId = aparatMatch[1];
    return {
      platform: 'aparat',
      embedUrl: `https://www.aparat.com/video/video/embed/videohash/${videoId}/vt/frame`,
      sourceDomain: 'aparat.com',
      detectedId: videoId
    };
  }

  // Fallback to website article
  let domain = 'web';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    domain = parsed.hostname.replace('www.', '');
  } catch {
    // keep default
  }

  return {
    platform: 'article',
    embedUrl: url.startsWith('http') ? url : `https://${url}`,
    sourceDomain: domain
  };
}

// Convert slug like 'modern-web-architecture-guide' into readable title
function slugToTitle(slug: string): string {
  if (!slug) return '';
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\.[a-z0-9]+$/i, '')
    .trim();
}

/**
 * Automatically fetches / extracts platform metadata (Title, Author, Thumbnail, Description)
 * from YouTube, Instagram, or Web Articles using oEmbed APIs and heuristic parsing.
 */
export async function fetchMetadataFromUrl(rawUrl: string): Promise<ExtractedMetadata> {
  const cleanUrl = rawUrl.trim();
  const parsed = parseContentUrl(cleanUrl);

  // Default fallback values
  let title = '';
  let description = '';
  let authorName = '';
  let thumbnail = '';
  let tags: string[] = [];
  let category: Category = 'tech';
  let readingOrWatchTime = '۵ دقیقه';

  // 1. YouTube metadata extraction
  if (parsed.platform === 'youtube') {
    const videoId = parsed.detectedId;
    thumbnail = videoId 
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    
    tags = ['یوتیوب', 'ویدیو', 'تکنولوژی'];
    category = 'tech';
    readingOrWatchTime = cleanUrl.includes('shorts') ? '۶۰ ثانیه شورت' : 'ویدیو یوتیوب';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Call public oEmbed for YouTube
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) authorName = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {
      // Graceful fallback
    }

    if (!title) {
      title = cleanUrl.includes('shorts') ? 'ویدیو کوتاه یوتیوب (Shorts)' : 'ویدیو آموزشی در یوتیوب';
    }
    if (!authorName) {
      authorName = 'کانال یوتیوب';
    }
    if (!description) {
      description = `ویدیوی جذاب منتشر شده در پلتفرم یوتیوب توسط ${authorName}. جهت مشاهده کامل ویدیو روی دکمه پخش کلیک کنید.`;
    }

    const inferredCat = inferCategoryFromContent(title, description, tags);

    return {
      platform: 'youtube',
      title,
      description,
      authorName,
      thumbnail,
      embedUrl: parsed.embedUrl,
      tags,
      category: inferredCat,
      readingOrWatchTime,
      sourceDomain: 'youtube.com'
    };
  }

  // 2. Instagram metadata extraction
  if (parsed.platform === 'instagram') {
    thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80';
    tags = ['اینستاگرام', 'ریلز', 'رسانه'];
    category = 'entertainment';
    readingOrWatchTime = cleanUrl.includes('reel') ? 'ریلز اینستاگرام' : 'پست اینستاگرام';
    authorName = 'پیج اینستاگرام';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) authorName = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {
      // Graceful fallback
    }

    if (!title) {
      title = cleanUrl.includes('reel') ? 'ریلز ویدیویی در اینستاگرام' : 'پست منتخب در اینستاگرام';
    }
    if (!description) {
      description = `محتوای به اشتراک گذاشته شده در اینستاگرام توسط ${authorName}. برای مشاهده تعاملی روی کارت کلیک نمایید.`;
    }

    const inferredIgCat = inferCategoryFromContent(title, description, tags);

    return {
      platform: 'instagram',
      title,
      description,
      authorName,
      thumbnail,
      embedUrl: parsed.embedUrl,
      tags,
      category: inferredIgCat,
      readingOrWatchTime,
      sourceDomain: 'instagram.com'
    };
  }

  // 3. Aparat metadata extraction
  if (parsed.platform === 'aparat') {
    thumbnail = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80';
    tags = ['آپارات', 'ویدیو', 'فناوری'];
    category = 'tech';
    readingOrWatchTime = 'ویدیو آپارات';
    authorName = 'کانال آپارات';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`https://www.aparat.com/etc/api/oembed?url=${encodeURIComponent(cleanUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) authorName = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {
      // Graceful fallback
    }

    if (!title) {
      title = 'ویدیو آموزشی در آپارات';
    }
    if (!description) {
      description = `ویدیوی جذاب منتشر شده در پلتفرم آپارات توسط ${authorName}. برای پخش مستقیم ویدیو روی کارت کلیک کنید.`;
    }

    const inferredAparatCat = inferCategoryFromContent(title, description, tags);

    return {
      platform: 'aparat',
      title,
      description,
      authorName,
      thumbnail,
      embedUrl: parsed.embedUrl,
      tags,
      category: inferredAparatCat,
      readingOrWatchTime,
      sourceDomain: 'aparat.com'
    };
  }

  // 4. Web Article metadata extraction
  thumbnail = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80';
  tags = ['مقاله', 'وبسایت', parsed.sourceDomain];
  category = 'tech';
  readingOrWatchTime = '۶ دقیقه مطالعه';
  authorName = parsed.sourceDomain;

  // 1. Call server proxy route to bypass browser CORS and fetch real meta description, title, image
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);
    const apiRes = await fetch(`/api/extract-metadata?url=${encodeURIComponent(cleanUrl)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const metaData = await apiRes.json();
      if (metaData.title) title = metaData.title;
      if (metaData.description) description = metaData.description;
      if (metaData.image) thumbnail = metaData.image;
      if (metaData.author) authorName = metaData.author;
    }
  } catch (err) {
    console.warn('Server metadata proxy extraction fallback:', err);
  }

  // 2. Fallback to oEmbed if title or author is still missing
  if (!title || !authorName) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (!title && data.title) title = data.title;
        if (data.author_name) authorName = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {
      // Graceful fallback
    }
  }

  if (!title) {
    title = `مقاله تخصصی در ${parsed.sourceDomain}`;
  }

  if (!description) {
    description = `مقاله و بررسی تحلیلی منتشر شده در وبسایت ${parsed.sourceDomain}. برای مطالعه کامل، گزینه حالت مطالعه را انتخاب فرمایید.`;
  }

  const inferredArtCat = inferCategoryFromContent(title, description, tags);

  return {
    platform: 'article',
    title,
    description,
    authorName,
    thumbnail,
    embedUrl: parsed.embedUrl,
    tags,
    category: inferredArtCat,
    readingOrWatchTime,
    sourceDomain: parsed.sourceDomain
  };
}
