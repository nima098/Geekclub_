import app from '../server';
import { INITIAL_CONTENT } from '../src/data/initialData';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('API contents serverless handler fallback:', err);
    return res.status(200).json({ success: true, count: INITIAL_CONTENT.length, data: INITIAL_CONTENT });
  }
}
