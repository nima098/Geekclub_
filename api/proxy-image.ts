import app from '../server';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.warn('API proxy-image serverless handler fallback:', err);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#1e293b"/><text x="400" y="235" font-family="sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">GeekClub Media</text></svg>');
  }
}
