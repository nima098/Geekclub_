# تغییرات امنیتی و رفع باگ

## قبل از اجرا حتماً انجام بدهید
1. متغیرهای محیطی را تنظیم کنید (نمونه در `.env.example`): `ADMIN_SECRET_KEY`، `CDN_SECRET`، `RSS_FEED_KEY`.
2. توکن CDN قدیمی (`geekclub_cdn_secret_2026`) و رمز `3dsaz2026` قبلاً روی گیت‌هاب بوده‌اند؛ هر دو را عوض کنید
   (روی `upload.php` سرور CDN هم توکن جدید را بگذارید و آن فایل را با نسخه‌ی جدید داخل `src/services/cdnService.ts` جایگزین کنید).
3. فایل `firestore.rules` را در Firebase Console → Firestore → Rules منتشر (Publish) کنید.
4. اگر روی Vercel هستید: `ADMIN_SECRET_KEY`، `RSS_FEED_KEY` را در Environment Variables بگذارید.

## باگ «بازگشت خودکار محتوای حذف‌شده»
- `src/App.tsx`: پاسخ polling هر ۴ ثانیه state محلی را بازنویسی می‌کرد. حالا حذف/بازیابی محلی تا تأیید سرور روی نتیجه‌ی polling اعمال می‌شود
  و اگر سرور تغییر را نپذیرد، پیام خطا نشان داده می‌شود.
- لیست خالی از سرور دیگر نادیده گرفته نمی‌شود.
- `server.ts` / `api/contents.js`: آپدیت، enrich و ساخت محتوا دیگر آیتم حذف‌شده را دوباره نمی‌سازند.
- `vercel.json` + `api/contents.js`: مسیرهای `/api/contents/:id/soft-delete|restore|permanent-delete` روی Vercel اصلاً وجود نداشتند.

## نسخه‌ی ۲: ذخیره‌نشدن حذف‌ها
- دیتابیس و تغییرات ظاهری شما (data/database.json، initialData.ts، ContentCard، AdminPanelModal) حفظ شد.
- روی Vercel نوشتن فایل پایدار نیست؛ `api/contents.js` حالا به‌جای «موفقیت دروغین» خطای 503 می‌دهد
  و پنل پیام «تغییر روی سرور ذخیره نشد» نشان می‌دهد. برای ذخیره‌ی واقعی باید `server.ts` روی VPS اجرا شود.
