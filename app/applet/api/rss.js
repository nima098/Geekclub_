import { INITIAL_CONTENT } from './data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Restrict RSS feed access to admin only via secret key parameter or header
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== 'geekclub_admin_secure_key') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(403).json({
      success: false,
      error: 'دسترسی غیرمجاز: فید RSS فقط برای مدیران سیستم قابل دسترسی است.'
    });
  }

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');

  const { platform, category } = req.query || {};
  let items = INITIAL_CONTENT;

  if (platform && platform !== 'all') {
    items = items.filter(i => i.platform === platform);
  }
  if (category && category !== 'all') {
    items = items.filter(i => i.category === category);
  }

  const buildDate = new Date().toUTCString();
  const siteUrl = 'https://geekclub.ir';

  const itemsXml = items.map(item => {
    const itemUrl = item.url || `${siteUrl}/#${item.id}`;
    const cleanDesc = (item.description || item.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const thumbTag = item.thumbnail ? `\n      <enclosure url="${item.thumbnail}" type="image/jpeg" length="1024" />` : '';
    return `    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${itemUrl}</link>
      <guid isPermaLink="false">${item.id}</guid>
      <description><![CDATA[${cleanDesc}]]></description>
      <author>${item.author?.name || 'گیک‌کلاب'}</author>
      <category>${item.category || 'tech'}</category>
      <pubDate>${buildDate}</pubDate>${thumbTag}
    </item>`;
  }).join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[گیک‌کلاب | GeekClub - مرجع محتوای گلچین شده (مدیریت)]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[فید اختصاصی RSS مدیران گیک‌کلاب]]></description>
    <language>fa-ir</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss?key=geekclub_admin_secure_key" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return res.status(200).send(rssXml);
}
