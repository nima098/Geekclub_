export default async function handler(req: any, res: any) {
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

  try {
    const fetchResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch image: status ${fetchResponse.status}`);
    }

    const contentType = fetchResponse.headers.get('content-type') || 'image/jpeg';
    const buffer = await fetchResponse.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(Buffer.from(buffer));
  } catch (err: any) {
    console.warn('Proxy image fetch failed:', err.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(fallbackSvg);
  }
}
