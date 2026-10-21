import { INITIAL_CONTENT } from '../src/data/initialData';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        count: INITIAL_CONTENT.length,
        data: INITIAL_CONTENT
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
  } catch (err: any) {
    console.error('API contents error:', err);
    return res.status(500).json({
      success: false,
      error: 'خطای داخلی سرور در دریافت محتوا',
      details: err.message
    });
  }
}
