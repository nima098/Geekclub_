import { INITIAL_CONTENT } from './data.js';
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
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

  let items = INITIAL_CONTENT;
  try {
    const dbPath = path.resolve(process.cwd(), 'data', 'database.json');
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (data && Array.isArray(data.contents) && data.contents.length > 0) {
        items = data.contents;
      }
    }
  } catch {}

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
}
