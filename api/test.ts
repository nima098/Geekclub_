export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    success: true,
    status: 'online',
    message: 'سرویس‌دهنده بدون سرور Vercel گیک کلاب فعال و آماده به کار است!',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless'
  });
}
