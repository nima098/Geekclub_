import { isAdminRequest } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (await isAdminRequest(req)) return res.status(200).json({ success: true });
  return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
}
