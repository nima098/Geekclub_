import { INITIAL_CONTENT } from './data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { platform, category, search } = req.query || {};
      let result = INITIAL_CONTENT;

      if (platform && platform !== 'all') {
        result = result.filter(item => item.platform === platform);
      }
      if (category && category !== 'all') {
        result = result.filter(item => item.category === category);
      }
      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        result = result.filter(item => 
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.author?.name?.toLowerCase().includes(q)
        );
      }

      return res.status(200).json({
        success: true,
        count: result.length,
        data: result
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
        thumbnail: body.thumbnail || '',
        author: body.author || { name: 'کاربر ناشناس', avatar: '' },
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
      data: INITIAL_CONTENT
    });
  } catch (err) {
    console.error('API contents error:', err);
    return res.status(500).json({
      success: false,
      error: 'خطای سرور در دریافت محتوا',
      details: err.message
    });
  }
}
