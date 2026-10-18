import { GoogleGenAI } from '@google/genai';
import axios from 'axios';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.body;
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Instagram URL is required' });
  }

  try {
    // ۱. استخراج اطلاعات و لینک دانلود خام از اینستاگرام از طریق Apify
    const apifyResponse = await axios.post(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`,
      {
        directUrls: [url],
        resultsType: 'posts',
        resultsLimit: 1,
      },
      { timeout: 60000 }
    );

    const postData = apifyResponse.data?.[0];
    const mediaUrl = postData?.videoUrl || postData?.displayUrl;
    const caption = postData?.caption || 'محتوای بدون متن';

    if (!mediaUrl) {
      return res.status(404).json({ error: 'Media URL not found in post' });
    }

    // ۲. اعتبارسنجی دانلود فایل بدون ذخیره روی دیسک (بررسی سلامت استریم)
    const mediaHeadResponse = await axios({
      method: 'get',
      url: mediaUrl,
      responseType: 'stream',
      timeout: 15000,
    });

    const contentType = mediaHeadResponse.headers['content-type'] || '';
    const contentLength = mediaHeadResponse.headers['content-length']
      ? `${(parseInt(mediaHeadResponse.headers['content-length'], 10) / (1024 * 1024)).toFixed(2)} MB`
      : 'Unknown';

    // ۳. تحلیل کپشن و تولید پاسخ با Gemini 3.5 Flash Lite
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `این متن کپشن یک پست اینستاگرام است. خیلی خلاصه، صمیمی و در ۲ جمله به زبان فارسی بگو موضوع ویدیو چیه و چه نکته مهمی داره:\n\n${caption}`,
    });

    // ۴. پاسخ نهایی شامل اطلاعات دانلود موفق و متن جمینای
    return res.status(200).json({
      success: true,
      status: 'Download verified successfully',
      mediaType: postData?.videoUrl ? 'video/mp4' : 'image/jpeg',
      fileSize: contentLength,
      contentType: contentType,
      captionSummary: geminiResponse.text,
      originalCaption: caption.slice(0, 150) + (caption.length > 150 ? '...' : ''),
      directMediaUrl: mediaUrl,
    });
  } catch (error) {
    console.error('Download verification error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null,
    });
  }
}