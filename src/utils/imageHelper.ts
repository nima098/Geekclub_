import { Platform } from '../types/content';

/**
 * Highly reliable, 100% offline-compatible SVG Data URIs for platform fallbacks.
 * These data URIs contain zero external network requests and never fail or expire.
 */
export const FALLBACK_IMAGES = {
  youtube: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="ytbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="ytred" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#ytbg)"/>
  <circle cx="400" cy="200" r="120" fill="#ffffff" fill-opacity="0.04"/>
  <rect x="330" y="152" width="140" height="96" rx="24" fill="url(#ytred)"/>
  <polygon points="388,180 424,200 388,220" fill="#ffffff"/>
  <text x="400" y="310" font-family="Tahoma, Arial, sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">ویدیوی یوتیوب | GeekClub</text>
  <text x="400" y="345" font-family="Tahoma, Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">upc.geekclub.ir CDN</text>
</svg>
`.trim())}`,

  instagram: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="igbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#833ab4"/>
      <stop offset="50%" stop-color="#fd1d1d"/>
      <stop offset="100%" stop-color="#fcb045"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="#0f172a"/>
  <circle cx="400" cy="190" r="110" fill="url(#igbg)" fill-opacity="0.15"/>
  <rect x="340" y="130" width="120" height="120" rx="30" fill="none" stroke="url(#igbg)" stroke-width="9"/>
  <circle cx="400" cy="190" r="35" fill="none" stroke="url(#igbg)" stroke-width="9"/>
  <circle cx="435" cy="155" r="8" fill="#fd1d1d"/>
  <text x="400" y="310" font-family="Tahoma, Arial, sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">محتوای اینستاگرام | GeekClub</text>
  <text x="400" y="345" font-family="Tahoma, Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">upc.geekclub.ir CDN</text>
</svg>
`.trim())}`,

  aparat: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="apbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ed145b"/>
      <stop offset="100%" stop-color="#880e4f"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="#0f172a"/>
  <circle cx="400" cy="190" r="65" fill="url(#apbg)"/>
  <polygon points="390,170 422,190 390,210" fill="#ffffff"/>
  <text x="400" y="305" font-family="Tahoma, Arial, sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">ویدیوی آپارات | GeekClub</text>
  <text x="400" y="340" font-family="Tahoma, Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">upc.geekclub.ir CDN</text>
</svg>
`.trim())}`,

  article: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="artbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#artbg)"/>
  <rect x="330" y="110" width="140" height="150" rx="12" fill="#334155"/>
  <rect x="350" y="135" width="100" height="12" rx="4" fill="url(#accent)"/>
  <rect x="350" y="160" width="80" height="8" rx="3" fill="#94a3b8"/>
  <rect x="350" y="180" width="100" height="8" rx="3" fill="#64748b"/>
  <rect x="350" y="200" width="60" height="8" rx="3" fill="#64748b"/>
  <text x="400" y="315" font-family="Tahoma, Arial, sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">مقاله تخصصی گیک کلاب</text>
  <text x="400" y="350" font-family="Tahoma, Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">upc.geekclub.ir CDN</text>
</svg>
`.trim())}`,

  avatar: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="avbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="#1e293b"/>
  <circle cx="100" cy="75" r="38" fill="url(#avbg)"/>
  <path d="M 35 175 C 35 130, 165 130, 165 175 Z" fill="url(#avbg)"/>
</svg>
`.trim())}`
};

/**
 * Generates a colorful, deterministic, 100% reliable SVG avatar with the author's initial letter.
 * Zero external network requests, works everywhere offline and online without 404s.
 */
export const getAuthorAvatar = (name: string = 'کاربر'): string => {
  const cleanName = (name || 'کاربر').trim();
  const initial = cleanName.charAt(0) || 'گ';
  const colors = [
    ['#3b82f6', '#1d4ed8'],
    ['#8b5cf6', '#6d28d9'],
    ['#ec4899', '#be185d'],
    ['#10b981', '#047857'],
    ['#f59e0b', '#b45309'],
    ['#06b6d4', '#0e7490']
  ];
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorPair = colors[Math.abs(hash) % colors.length];

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g_${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colorPair[0]}"/>
      <stop offset="100%" stop-color="${colorPair[1]}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#g_${Math.abs(hash)})"/>
  <text x="50" y="63" font-family="Tahoma, Arial, sans-serif" font-size="42" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>
`.trim())}`;
};

/**
 * Returns a reliable fallback image URL based on platform or URL content.
 */
export const getPlatformFallbackImage = (platform?: Platform | string, rawUrl?: string): string => {
  if (platform === 'avatar') {
    return FALLBACK_IMAGES.avatar;
  }

  if (platform === 'youtube' || (rawUrl && (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')))) {
    return FALLBACK_IMAGES.youtube;
  }

  if (platform === 'instagram' || (rawUrl && rawUrl.includes('instagram.com'))) {
    return FALLBACK_IMAGES.instagram;
  }

  if (platform === 'aparat' || (rawUrl && rawUrl.includes('aparat.com'))) {
    return FALLBACK_IMAGES.aparat;
  }

  return FALLBACK_IMAGES.article;
};

/**
 * Resolves cover image URL to ensure broken host prefixes like upc.geekclub.ir/uploads/
 * are converted into reliable local /uploads/ URLs or proxied if external.
 */
export const resolveCoverImageUrl = (url?: string | null, platform?: Platform | string): string => {
  if (!url || typeof url !== 'string' || !url.trim() || url === 'null' || url === 'undefined') {
    return getPlatformFallbackImage(platform);
  }
  let clean = url.trim();

  if (clean.includes('upc.geekclub.ir/uploads/')) {
    clean = clean.substring(clean.indexOf('/uploads/'));
  }

  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:')) {
    if (clean.startsWith('uploads/')) {
      clean = '/' + clean;
    } else if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    return clean;
  }

  return getProxiedImageUrl(clean);
};

/**
 * Image onError handler to replace broken or unreachable image URLs with reliable local file, proxy or SVG.
 * Guaranteed never to throw infinite loops or 404 proxy cascades.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string,
  platform?: Platform | string,
  itemId?: string
) => {
  const target = e.currentTarget;
  const currentSrc = target.src;

  // 1. Stop if already an inline SVG Data URI
  if (currentSrc.startsWith('data:image')) {
    return;
  }

  // 2. If it's an avatar that failed, immediately replace with safe SVG avatar
  if (platform === 'avatar' || currentSrc.includes('avatar')) {
    target.src = FALLBACK_IMAGES.avatar;
    return;
  }

  // 3. If failed on upc.geekclub.ir/uploads/, the file exists locally on the website!
  // Strip the domain and retry with local /uploads/
  if (currentSrc.includes('upc.geekclub.ir/uploads/')) {
    const localRel = currentSrc.substring(currentSrc.indexOf('/uploads/'));
    target.src = localRel;
    return;
  }

  // 4. If failed on local /uploads/ (already retried or direct local path), immediately fallback to offline SVG
  if (currentSrc.includes('/uploads/')) {
    const safeSvg = fallbackUrl || getPlatformFallbackImage(platform);
    target.src = safeSvg;
    return;
  }

  // 5. If failed on upc.geekclub.ir CDN (e.g. broken s1 link), fallback to safe SVG
  if (currentSrc.includes('upc.geekclub.ir')) {
    const safeSvg = fallbackUrl || getPlatformFallbackImage(platform);
    target.src = safeSvg;
    return;
  }

  // 6. If failed on external URL, fallback directly to offline SVG Data URI
  const safeSvg = (fallbackUrl && fallbackUrl.startsWith('data:')) 
    ? fallbackUrl 
    : getPlatformFallbackImage(platform);

  if (target.src !== safeSvg) {
    target.src = safeSvg;
  }
};

/**
 * Automatically proxies Google user profile pictures and external blocked images (Instagram, Facebook, etc.)
 * through /api/proxy-image so they load properly without CORS or referrer filtering.
 */
export const getProxiedImageUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const clean = url.trim();
  if (clean.startsWith('data:') || clean.startsWith('blob:') || clean.startsWith('/')) {
    return clean;
  }

  if (
    clean.includes('googleusercontent.com') ||
    clean.includes('ggpht.com') ||
    clean.includes('cdninstagram.com') ||
    clean.includes('fbcdn.net') ||
    clean.includes('instagram.com') ||
    clean.includes('twimg.com')
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(clean)}`;
  }

  return clean;
};
