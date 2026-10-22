export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const imageUrl = req.query?.url || (req.url ? new URL(req.url, 'http://localhost').searchParams.get('url') : null);

  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#0f172a"/><path d="M360 200 H440 V250 H360 Z" fill="#3b82f6"/><text x="400" y="225" font-family="sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">GeekClub Media</text></svg>`;

  if (!imageUrl || typeof imageUrl !== 'string') {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(fallbackSvg);
  }

  // SSRF Validation
  try {
    const parsed = new URL(imageUrl.trim().startsWith('http') ? imageUrl.trim() : `https://${imageUrl.trim()}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(400).send(fallbackSvg);
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(400).send(fallbackSvg);
    }

    const fetchResponse = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch image: status ${fetchResponse.status}`);
    }

    const contentType = fetchResponse.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await fetchResponse.arrayBuffer());

    if (contentType.includes('svg')) {
      const text = buffer.toString('utf-8').toLowerCase();
      if (
        text.includes('<script') ||
        text.includes('javascript:') ||
        text.includes('onload=') ||
        text.includes('onerror=') ||
        text.includes('onclick=')
      ) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(400).send(fallbackSvg);
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(buffer);
  } catch (err) {
    console.warn('Proxy image fetch failed:', err.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(fallbackSvg);
  }
}
