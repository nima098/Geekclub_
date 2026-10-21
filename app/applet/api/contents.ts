export const FALLBACK_CONTENTS = [
  {
    id: 'ig-da7z2zvjklL',
    title: 'پست آلبومی و چند اسلایدی اینستاگرام',
    description: 'پست چند اسلایدی اینستاگرام شامل عکس‌ها و ویدیوهای دریافت شده از طریق Apify و آپلود شده روی CDN اختصاصی upc.geekclub.ir.',
    url: 'https://www.instagram.com/p/Da7Z2zvjklL/',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/p/Da7Z2zvjklL/embed',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
    mediaType: 'carousel',
    slides: [
      { type: 'image', url: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg' },
      { type: 'image', url: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_9b7ad12d.jpg' },
      { type: 'image', url: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_af47b80a.jpg' }
    ],
    author: {
      name: 'پیج اینستاگرام گیک',
      avatar: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
      handle: '@geek_instagram',
      isVerified: true
    },
    category: 'tech',
    tags: ['اینستاگرام', 'آلبوم', 'اسلایدر', 'CDN'],
    publishedAt: 'همین الان',
    readingOrWatchTime: '۳ اسلاید چندرسانه‌ای',
    likesCount: 15,
    dislikesCount: 0,
    commentsCount: 2,
    userReaction: 'like',
    sourceDomain: 'instagram.com',
    approvalStatus: 'approved'
  },
  {
    id: 'yt-pending-1',
    title: 'بررسی فریم‌ورک جدید Astro 5 و بهینه‌سازی سرعت بارگذاری صفحات وب',
    description: 'در این ویدیو به بررسی قابلیت‌های معماری جزیره‌ای (Islands Architecture) و رندرینگ هیبریدی در نسخه جدید استرو پرداخته می‌شود.',
    url: 'https://www.youtube.com/watch?v=i7gxLKpn1h0',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/i7gxLKpn1h0',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230334_29545f1c.jpg',
    author: {
      name: 'سارا ناصری',
      avatar: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230334_29545f1c.jpg',
      handle: '@sara_ux',
      isVerified: false
    },
    category: 'programming',
    tags: ['Astro', 'فرانت‌اند', 'بهینه‌سازی'],
    publishedAt: '۱۰ دقیقه پیش',
    readingOrWatchTime: '۱۴ دقیقه',
    likesCount: 42,
    dislikesCount: 1,
    commentsCount: 5,
    sourceDomain: 'youtube.com',
    approvalStatus: 'approved'
  },
  {
    id: 'yt-1',
    title: 'آموزش جامع React 19 و هوش مصنوعی در توسعه فرانت‌اند',
    description: 'نکات پیشرفته ری اکت ۱۹ و نحوه ادغام قابلیت‌های هوش مصنوعی مدرن در برنامه‌های وب تک‌صفحه‌ای.',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_9b7ad12d.jpg',
    author: {
      name: 'علی رضایی',
      avatar: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_9b7ad12d.jpg',
      handle: '@ali_dev',
      isVerified: true
    },
    category: 'programming',
    tags: ['React', 'JavaScript', 'AI'],
    publishedAt: '۲ ساعت پیش',
    readingOrWatchTime: '۲۲ دقیقه',
    likesCount: 88,
    dislikesCount: 2,
    commentsCount: 12,
    sourceDomain: 'youtube.com',
    approvalStatus: 'approved'
  },
  {
    id: 'aparat-1',
    title: 'بررسی تخصصی معماری میکروسرویس‌ها در مقیاس وب بزرگ',
    description: 'چگونه سیستم‌های توزیع‌شده با ترافیک بالا را طراحی و مدیریت کنیم تا بالاترین پایداری را داشته باشند.',
    url: 'https://www.aparat.com/v/kJQP7kiw5Fk',
    platform: 'aparat',
    embedUrl: 'https://www.aparat.com/video/video/embed/videohash/kJQP7kiw5Fk/vt/frame',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230336_d9a4e772.jpg',
    author: {
      name: 'محمد مهدیان',
      avatar: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230336_d9a4e772.jpg',
      handle: '@m_mahdyan',
      isVerified: false
    },
    category: 'ai',
    tags: ['Microservices', 'Backend', 'Architecture'],
    publishedAt: 'دیروز',
    readingOrWatchTime: '۳۵ دقیقه',
    likesCount: 31,
    dislikesCount: 0,
    commentsCount: 4,
    sourceDomain: 'aparat.com',
    approvalStatus: 'approved'
  }
];

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { platform, category, search, sort } = req.query || {};
    let results = [...FALLBACK_CONTENTS];

    if (platform && platform !== 'all') {
      results = results.filter((c: any) => c.platform === platform);
    }
    if (category && category !== 'all') {
      results = results.filter((c: any) => c.category === category);
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      results = results.filter((c: any) => {
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchAuthor = c.author?.name?.toLowerCase().includes(q);
        const matchTags = c.tags?.some((t: string) => t.toLowerCase().includes(q));
        return matchTitle || matchDesc || matchAuthor || matchTags;
      });
    }

    if (sort === 'most_liked') {
      results.sort((a: any, b: any) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sort === 'most_comments') {
      results.sort((a: any, b: any) => (b.commentsCount || 0) - (b.commentsCount || 0));
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const newContent = {
        id: `content-${Date.now()}`,
        title: body.title || 'بدون عنوان',
        description: body.description || '',
        url: body.url || '',
        platform: body.platform || 'article',
        embedUrl: body.embedUrl || body.url || '',
        thumbnail: body.thumbnail || 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
        author: body.author || { name: 'کاربر', avatar: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg' },
        category: body.category || 'tech',
        tags: body.tags || [],
        publishedAt: 'همین الان',
        readingOrWatchTime: body.readingOrWatchTime || '۱ دقیقه',
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        approvalStatus: 'approved'
      };
      return res.status(201).json({
        success: true,
        message: 'محتوا با موفقیت ثبت شد',
        data: newContent
      });
    }

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (err: any) {
    console.error('API contents error:', err);
    return res.status(500).json({
      success: false,
      error: 'خطای داخلی سرور در دریافت محتوا',
      details: err?.message || 'Unknown error'
    });
  }
}
