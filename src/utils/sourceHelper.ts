import { ContentItem, UserProfile } from '../types/content';

export interface ResolvedSourceInfo {
  label: string;
  isRtl: boolean;
  url: string;
}

export const WEBSITE_PERSIAN_NAMES: Record<string, string> = {
  // Iranian tech, dev & media websites
  'zoomit.ir': 'زومیت',
  'digiato.com': 'دیجیاتو',
  'virgool.io': 'ویرگول',
  'zoomg.ir': 'زومجی',
  'vigiato.net': 'ویجیاتو',
  'gadgetnews.net': 'گجت‌نیوز',
  'techrato.com': 'تکراتو',
  'toranji.ir': 'ترنجی',
  'sakhtafzarmag.com': 'سخت‌افزارمگ',
  'shahrsakhtafzar.com': 'شهر سخت‌افزار',
  'peivast.com': 'پیوست',
  'citna.ir': 'سیتنا',
  'way2pay.ir': 'راه‌پرداخت',
  'shanbemag.com': 'شنبه‌مگ',
  'shanbepress.ir': 'شنبه‌پرس',
  'itiran.com': 'آی‌تی‌ایران',
  'geekclub.ir': 'گیک کلاب',
  'techcrunch.ir': 'تک‌کرانچ ایران',
  'sarzamindownload.com': 'سرزمین دانلود',
  'p30download.com': 'پی‌سی دانلود',
  'p30download.ir': 'پی‌سی دانلود',
  'soft98.ir': 'سافت۹۸',
  'yasdl.com': 'یاس دانلود',
  'downloadha.com': 'دانلودها',
  'roocket.ir': 'راکت',
  'sabzlearn.ir': 'سبزلرن',
  'faradars.org': 'فرادرس',
  'maktabkhooneh.org': 'مکتب‌خونه',
  '7learn.com': 'سون‌لرن',
  'sokanacademy.com': 'سکان آکادمی',
  'quera.org': 'کوئرا',
  'quera.ir': 'کوئرا',
  'motamem.org': 'متمم',
  'chetor.com': 'چطور',
  'digikala.com': 'دیجی‌کالا',
  'torob.com': 'ترب',
  'snapp.ir': 'اسنپ',
  'cafebazaar.ir': 'کافه‌بازار',
  'khabaronline.ir': 'خبرآنلاین',
  'isna.ir': 'ایسنا',
  'tasnimnews.com': 'تسنیم',
  'irna.ir': 'ایرنا',
  'mehrnews.com': 'مهرنیوز',
  'farsnews.ir': 'فارس‌نیوز',
  'tabnak.ir': 'تابناک',
  'asriran.com': 'عصر ایران',
  'entekhab.ir': 'انتخاب',
  'varzesh3.com': 'ورزش سه',
  'namnak.com': 'نمناک',
  'kojaro.com': 'کجارو',
  'lastsecond.ir': 'لست‌سکند',
  'karzar.net': 'کارزار',
  'jobinja.ir': 'جابینجا',
  'jobvision.ir': 'جاب‌ویژن',
  'mihanblockchain.com': 'میهن بلاکچین',
  'arzdigital.com': 'ارزدیجیتال',
  'donya-e-eqtesad.com': 'دنیای اقتصاد',
  'ecoiran.com': 'اکوایران',
  'sharghdaily.com': 'شرق',
  'hamshahri.ir': 'همشهری',
  'etemadonline.com': 'اعتمادآنلاین',
  'khabarvarzeshi.com': 'خبرورزشی',
  'filimo.com': 'فیلیمو',
  'namava.ir': 'نماوا',
  'aparat.com': 'آپارات',
  't.me': 'تلگرام',
  'telegram.me': 'تلگرام',
  'telegram.org': 'تلگرام',

  // International tech, dev & media websites
  'medium.com': 'مدیوم',
  'github.com': 'گیت‌هاب',
  'gitlab.com': 'گیت‌لب',
  'stackoverflow.com': 'استک‌اورفلو',
  'dev.to': 'دِو.تو',
  'hashnode.com': 'هش‌نود',
  'substack.com': 'ساب‌استک',
  'techcrunch.com': 'تک‌کرانچ',
  'theverge.com': 'دِ ورج',
  'wired.com': 'وایرد',
  'arstechnica.com': 'آرس‌تکنیکا',
  'engadget.com': 'انگجت',
  'mashable.com': 'مشبل',
  'gizmodo.com': 'گیزمودو',
  '9to5mac.com': 'ناین‌تو‌فایومک',
  '9to5google.com': 'ناین‌تو‌فایوگوگل',
  'macrumors.com': 'مک‌رومرز',
  'gsmarena.com': 'جی‌اس‌ام‌آرنا',
  'notebookcheck.net': 'نوت‌بوک‌چک',
  'tomshardware.com': 'تامز هاردور',
  'xda-developers.com': 'ایکس‌دی‌ای',
  'news.ycombinator.com': 'هکرنیوز',
  'producthunt.com': 'پروداکت هانت',
  'reddit.com': 'ردیت',
  'wikipedia.org': 'ویکی‌پدیا',
  'fa.wikipedia.org': 'ویکی‌پدیا فارسی',
  'en.wikipedia.org': 'ویکی‌پدیا',
  'openai.com': 'اوپن‌ای‌آی',
  'anthropic.com': 'آنتروپیک',
  'deepmind.google': 'دیپ‌مایند',
  'blog.google': 'وبلاگ گوگل',
  'ai.google': 'هوش مصنوعی گوگل',
  'firebase.google.com': 'فایربیس',
  'google.com': 'گوگل',
  'microsoft.com': 'مایکروسافت',
  'learn.microsoft.com': 'مایکروسافت لرن',
  'apple.com': 'اپل',
  'developer.mozilla.org': 'ام‌دی‌ان',
  'mozilla.org': 'موزیلا',
  'react.dev': 'ری‌اکت',
  'vuejs.org': 'ویو',
  'nextjs.org': 'نکست‌جی‌اس',
  'nodejs.org': 'نودجی‌اس',
  'python.org': 'پایتون',
  'typescriptlang.org': 'تایپ‌اسکریپت',
  'tailwindcss.com': 'تیلویند',
  'vercel.com': 'ورسل',
  'supabase.com': 'سوپابیس',
  'cloudflare.com': 'کلودفلر',
  'docker.com': 'داکر',
  'kubernetes.io': 'کوبرنتیز',
  'npmjs.com': 'ان‌پی‌ام',
  'huggingface.co': 'هاگینگ‌فیس',
  'kaggle.com': 'کگل',
  'arxiv.org': 'آرکایو',
  'nature.com': 'نیچر',
  'sciencedirect.com': 'ساینس‌دایرکت',
  'ieee.org': 'آی‌تریپل‌ای',
  'mit.edu': 'ام‌آی‌تی',
  'stanford.edu': 'استنفورد',
  'forbes.com': 'فوربس',
  'bloomberg.com': 'بلومبرگ',
  'reuters.com': 'رویترز',
  'bbc.com': 'بی‌بی‌سی',
  'bbc.co.uk': 'بی‌بی‌سی',
  'cnn.com': 'سی‌ان‌ان',
  'nytimes.com': 'نیویورک تایمز',
  'theguardian.com': 'گاردین',
  'coursera.org': 'کورسرا',
  'udemy.com': 'یودمی',
  'smashingmagazine.com': 'اسمشینگ مگزین',
  'css-tricks.com': 'سی‌اس‌اس تریکس',
  'freecodecamp.org': 'فری‌کدکمپ',
  'towardsdatascience.com': 'تاواردز دیتا ساینس',
  'x.com': 'ایکس',
  'twitter.com': 'توییتر',
  'linkedin.com': 'لینکدین'
};

const GENERIC_TAGS_SET = new Set([
  'instagram', 'reels', 'reel', 'video', 'image', 'photo', 'carousel', 'post',
  'media', 'tech', 'technology', 'ai', 'programming', 'coding', 'developer',
  'javascript', 'typescript', 'react', 'python', 'design', 'ui', 'ux',
  'youtube', 'aparat', 'article', 'web', 'blog', 'news', 'content', 'geekclub', 'geek'
]);

const GENERIC_HANDLE_SET = new Set([
  'admin', '3dsaz', 'geek', 'user', 'instagram', 'youtube', 'aparat', 'general', 'web', 'post', 'reel', 'reels', 'p', 'tv'
]);

export function hasPersianCharacters(value?: string | null): boolean {
  return Boolean(value && /[\u0600-\u06FF]/.test(value.trim()));
}

function cleanAsciiHandle(raw?: string | null): string {
  if (!raw) return '';
  const stripped = raw.trim().replace(/^@+/, '');
  if (!/^[a-zA-Z0-9._-]{2,40}$/.test(stripped)) return '';
  return stripped;
}

function extractHostnameAndPath(rawUrl?: string, sourceDomain?: string): { host: string; path: string } {
  let host = (sourceDomain || '').toLowerCase().trim().replace(/^www\./, '');
  let path = '';
  if (rawUrl) {
    try {
      const normalized = rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`;
      const u = new URL(normalized);
      host = u.hostname.toLowerCase().replace(/^www\./, '');
      path = u.pathname.toLowerCase();
    } catch {
      // ignore malformed url
    }
  }
  return { host, path };
}

export function getPersianWebsiteName(rawUrl?: string, sourceDomain?: string, sourceName?: string): string {
  const { host, path } = extractHostnameAndPath(rawUrl, sourceDomain);

  // Special URL path variants
  if (host.includes('bbc.com') || host.includes('bbc.co.uk')) {
    return path.startsWith('/persian') ? 'بی‌بی‌سی فارسی' : 'بی‌بی‌سی';
  }
  if (host.includes('digikala.com') && path.startsWith('/mag')) {
    return 'دیجی‌کالا مگ';
  }
  if (host.includes('zoomit.ir')) return 'زومیت';
  if (host.includes('digiato.com')) return 'دیجیاتو';

  // Exact match
  if (host && WEBSITE_PERSIAN_NAMES[host]) {
    return WEBSITE_PERSIAN_NAMES[host];
  }

  // Subdomain / domain-suffix match (e.g. blog.zoomit.ir -> zoomit.ir)
  if (host) {
    for (const [domain, faName] of Object.entries(WEBSITE_PERSIAN_NAMES)) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        return faName;
      }
    }
  }

  // Extracted Persian site name (e.g. og:site_name)
  if (sourceName && hasPersianCharacters(sourceName)) {
    return sourceName.trim();
  }

  // Check if sourceName itself matches a known brand
  if (sourceName && sourceName.trim()) {
    const cleanSource = sourceName.trim().toLowerCase();
    for (const [domain, faName] of Object.entries(WEBSITE_PERSIAN_NAMES)) {
      const domainRoot = domain.split('.')[0];
      if (cleanSource === domain || cleanSource === domainRoot || cleanSource.includes(domainRoot)) {
        return faName;
      }
    }
    return `وبسایت ${sourceName.trim()}`;
  }

  if (host && host !== 'web') {
    const rootPart = host.split('.')[0];
    return `وبسایت ${rootPart}`;
  }

  return 'وبسایت';
}

function resolveArticleSourceUrl(rawUrl?: string, sourceDomain?: string): string {
  const { host, path } = extractHostnameAndPath(rawUrl, sourceDomain);
  if (rawUrl) {
    try {
      const normalized = rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`;
      const u = new URL(normalized);
      if (host.includes('bbc.') && path.startsWith('/persian')) {
        return `${u.origin}/persian`;
      }
      if (host === 't.me' || host === 'telegram.me') {
        const channel = path.split('/').filter(Boolean)[0];
        if (channel && channel !== 's') return `https://t.me/${channel}`;
      }
      return u.origin;
    } catch {
      // fall through
    }
  }
  if (host && host !== 'web') return `https://${host}`;
  return rawUrl || '#';
}

export function resolveContentSource(
  item: ContentItem,
  matchedSharer?: UserProfile | null
): ResolvedSourceInfo {
  const sharerHandles = new Set<string>();
  if (matchedSharer?.username) sharerHandles.add(matchedSharer.username.replace(/^@+/, '').toLowerCase());
  if (item.sharedBy?.username) sharerHandles.add(item.sharedBy.username.replace(/^@+/, '').toLowerCase());
  const sharerIsAdmin = Boolean(
    matchedSharer?.isAdmin ||
    sharerHandles.has('admin') ||
    sharerHandles.has('3dsaz')
  );

  const isCollidingSharerHandle = (handle: string): boolean => {
    const lower = handle.toLowerCase();
    if (GENERIC_HANDLE_SET.has(lower)) return true;
    if (sharerIsAdmin && sharerHandles.has(lower)) return true;
    // If author.name matches sharer's name or is generic while handle equals sharer's handle, it was copied from sharer
    if (sharerHandles.has(lower)) {
      const authorName = (item.author?.name || '').trim();
      const sharerName = (matchedSharer?.displayName || item.sharedBy?.name || '').trim();
      if (!authorName || authorName === sharerName || authorName === 'کاربر گیک کلاب') {
        return true;
      }
    }
    return false;
  };

  const resolveLabelAndRtl = (): { label: string; isRtl: boolean } => {
    // 1. Website Articles -> Persian Name of Website
    if (item.platform === 'article') {
      return {
        label: getPersianWebsiteName(item.url, item.sourceDomain, item.sourceName),
        isRtl: true
      };
    }

    // 2. Instagram -> @instagram_username
    if (item.platform === 'instagram') {
      const explicitHandle = cleanAsciiHandle(item.sourceHandle);
      if (explicitHandle && !GENERIC_HANDLE_SET.has(explicitHandle.toLowerCase())) {
        return { label: `@${explicitHandle}`, isRtl: false };
      }

      const apifyOwner = cleanAsciiHandle(item.data?.ownerUsername);
      if (apifyOwner && !GENERIC_HANDLE_SET.has(apifyOwner.toLowerCase())) {
        return { label: `@${apifyOwner}`, isRtl: false };
      }

      if (item.url) {
        const urlUserMatch = item.url.match(
          /(?:instagram\.com|instagr\.am)\/(?!p\/|reel\/|reels\/|tv\/|share\/|stories\/|explore\/)([a-zA-Z0-9_.]{2,})\/(?:p|reel|reels|tv)\//i
        );
        if (urlUserMatch?.[1]) {
          const u = cleanAsciiHandle(urlUserMatch[1]);
          if (u && !GENERIC_HANDLE_SET.has(u.toLowerCase())) {
            return { label: `@${u}`, isRtl: false };
          }
        }
      }

      const mediaUrls = [
        item.thumbnail,
        item.videoUrl,
        ...(item.images || []),
        ...(item.slides?.map((s) => s.url) || []),
        ...(item.slides?.map((s) => s.thumbnail) || [])
      ].filter(Boolean) as string[];
      for (const mUrl of mediaUrls) {
        const pathMatch = mUrl.match(/\/instagram\/([a-zA-Z0-9_.-]+)\//i);
        if (pathMatch?.[1] && pathMatch[1].toLowerCase() !== 'general') {
          const u = cleanAsciiHandle(pathMatch[1]);
          if (u && !GENERIC_HANDLE_SET.has(u.toLowerCase())) {
            return { label: `@${u}`, isRtl: false };
          }
        }
      }

      const textCorpus = `${item.title || ''} ${item.description || ''}`;
      const textHandleMatch =
        textCorpus.match(/(?:از|صفحه)\s+@([a-zA-Z0-9_.]{2,})/i) ||
        textCorpus.match(/@([a-zA-Z0-9_.]{3,})/);
      if (textHandleMatch?.[1]) {
        const u = cleanAsciiHandle(textHandleMatch[1]);
        if (u && !GENERIC_HANDLE_SET.has(u.toLowerCase())) {
          return { label: `@${u}`, isRtl: false };
        }
      }

      if (item.author?.name) {
        const nameClean = cleanAsciiHandle(item.author.name);
        if (nameClean && !GENERIC_HANDLE_SET.has(nameClean.toLowerCase())) {
          return { label: `@${nameClean}`, isRtl: false };
        }
      }

      const authorHandle = cleanAsciiHandle(item.author?.handle);
      if (authorHandle && !isCollidingSharerHandle(authorHandle)) {
        return { label: `@${authorHandle}`, isRtl: false };
      }

      if (Array.isArray(item.tags) && item.tags.length > 0) {
        for (let i = item.tags.length - 1; i >= 0; i--) {
          const tClean = cleanAsciiHandle(item.tags[i]);
          if (
            tClean &&
            !GENERIC_TAGS_SET.has(tClean.toLowerCase()) &&
            !isCollidingSharerHandle(tClean)
          ) {
            return { label: `@${tClean}`, isRtl: false };
          }
        }
      }

      return { label: '@instagram', isRtl: false };
    }

    // 3. Aparat -> @aparat_username or channel name
    if (item.platform === 'aparat') {
      const explicitHandle = cleanAsciiHandle(item.sourceHandle);
      if (explicitHandle && !GENERIC_HANDLE_SET.has(explicitHandle.toLowerCase())) {
        return { label: `@${explicitHandle}`, isRtl: false };
      }
      if (item.sourceHandle && hasPersianCharacters(item.sourceHandle)) {
        return { label: item.sourceHandle.trim(), isRtl: true };
      }

      if (item.url) {
        const apUserMatch = item.url.match(
          /aparat\.com\/(?!v\/|video\/|playlist\/|live\/|search|result|etc|api)([a-zA-Z0-9_.-]{2,})/i
        );
        if (apUserMatch?.[1]) {
          const u = cleanAsciiHandle(apUserMatch[1]);
          if (u && !GENERIC_HANDLE_SET.has(u.toLowerCase())) {
            return { label: `@${u}`, isRtl: false };
          }
        }
      }

      const authorHandle = cleanAsciiHandle(item.author?.handle);
      if (authorHandle && !isCollidingSharerHandle(authorHandle)) {
        return { label: `@${authorHandle}`, isRtl: false };
      }

      const candidateName = (item.sourceName || item.author?.name || '').trim();
      const sharerDisplay = (matchedSharer?.displayName || item.sharedBy?.name || '').trim();
      if (
        candidateName &&
        candidateName !== 'کانال آپارات' &&
        candidateName !== 'کاربر گیک کلاب' &&
        candidateName !== sharerDisplay
      ) {
        const asciiCandidate = cleanAsciiHandle(candidateName);
        if (asciiCandidate) {
          return { label: `@${asciiCandidate}`, isRtl: false };
        }
        return { label: candidateName, isRtl: hasPersianCharacters(candidateName) };
      }

      return { label: '@aparat', isRtl: false };
    }

    // 4. YouTube -> @youtube_username or channel name
    if (item.platform === 'youtube') {
      const explicitHandle = cleanAsciiHandle(item.sourceHandle);
      if (explicitHandle && !GENERIC_HANDLE_SET.has(explicitHandle.toLowerCase())) {
        return { label: `@${explicitHandle}`, isRtl: false };
      }

      if (item.url) {
        const ytHandleMatch =
          item.url.match(/youtube\.com\/@([a-zA-Z0-9_.-]{2,})/i) ||
          item.url.match(/youtube\.com\/(?:user|c)\/([a-zA-Z0-9_.-]{2,})/i);
        if (ytHandleMatch?.[1]) {
          const u = cleanAsciiHandle(ytHandleMatch[1]);
          if (u && !GENERIC_HANDLE_SET.has(u.toLowerCase())) {
            return { label: `@${u}`, isRtl: false };
          }
        }
      }

      const authorHandle = cleanAsciiHandle(item.author?.handle);
      if (authorHandle && !isCollidingSharerHandle(authorHandle)) {
        return { label: `@${authorHandle}`, isRtl: false };
      }

      const candidateName = (item.sourceName || item.author?.name || '').trim();
      const sharerDisplay = (matchedSharer?.displayName || item.sharedBy?.name || '').trim();
      if (
        candidateName &&
        candidateName !== 'کانال یوتیوب' &&
        candidateName !== 'کاربر گیک کلاب' &&
        candidateName !== sharerDisplay
      ) {
        const asciiCandidate = cleanAsciiHandle(candidateName);
        if (asciiCandidate) {
          return { label: `@${asciiCandidate}`, isRtl: false };
        }
        return { label: candidateName, isRtl: hasPersianCharacters(candidateName) };
      }

      return { label: '@youtube', isRtl: false };
    }

    // 5. Telegram -> @channel_username
    if (item.platform === 'telegram') {
      const explicitHandle = cleanAsciiHandle(item.sourceHandle);
      if (explicitHandle && !GENERIC_HANDLE_SET.has(explicitHandle.toLowerCase())) {
        return { label: `@${explicitHandle}`, isRtl: false };
      }

      if (item.url) {
        const tgMatch = item.url.match(/(?:t\.me|telegram\.me|telegram\.dog)\/(?:s\/)?([a-zA-Z0-9_]{3,})/i);
        if (tgMatch?.[1]) {
          const u = cleanAsciiHandle(tgMatch[1]);
          if (u && !GENERIC_HANDLE_SET.has(u.toLowerCase())) {
            return { label: `@${u}`, isRtl: false };
          }
        }
      }

      const authorHandle = cleanAsciiHandle(item.author?.handle);
      if (authorHandle && !isCollidingSharerHandle(authorHandle)) {
        return { label: `@${authorHandle}`, isRtl: false };
      }

      const candidateName = (item.sourceName || item.author?.name || '').trim();
      if (candidateName && candidateName !== 'کانال تلگرام' && candidateName !== 'تلگرام') {
        const asciiCandidate = cleanAsciiHandle(candidateName);
        if (asciiCandidate) {
          return { label: `@${asciiCandidate}`, isRtl: false };
        }
        return { label: candidateName, isRtl: hasPersianCharacters(candidateName) };
      }

      return { label: '@telegram', isRtl: false };
    }

    return { label: 'منبع وب', isRtl: true };
  };

  const { label, isRtl } = resolveLabelAndRtl();

  let url = item.url || '#';
  if (item.platform === 'article') {
    url = resolveArticleSourceUrl(item.url, item.sourceDomain);
  } else if (item.platform === 'instagram') {
    if (label.startsWith('@') && label !== '@instagram') {
      url = `https://www.instagram.com/${label.slice(1)}/`;
    } else {
      url = item.url || 'https://www.instagram.com/';
    }
  } else if (item.platform === 'aparat') {
    if (label.startsWith('@') && label !== '@aparat') {
      url = `https://www.aparat.com/${label.slice(1)}`;
    } else {
      url = item.url || 'https://www.aparat.com/';
    }
  } else if (item.platform === 'youtube') {
    if (label.startsWith('@') && label !== '@youtube') {
      url = `https://www.youtube.com/@${label.slice(1)}`;
    } else {
      url = item.url || 'https://www.youtube.com/';
    }
  } else if (item.platform === 'telegram') {
    if (label.startsWith('@') && label !== '@telegram') {
      url = `https://t.me/${label.slice(1)}`;
    } else {
      url = item.url || 'https://t.me/';
    }
  }

  return { label, isRtl, url };
}
