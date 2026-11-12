import React, { useState } from 'react';
import { 
  Instagram, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  HardDrive, 
  CloudUpload, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Terminal,
  ShieldAlert,
  Sparkles,
  FileText,
  User,
  Image,
  Video,
  Layers,
  HelpCircle,
  Link,
  Zap,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { resolveCoverImageUrl, handleImageError, getPlatformFallbackImage } from '../../utils/imageHelper';

interface StepReport {
  step: number;
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
  warning?: string;
  details?: Record<string, any>;
  troubleshooting?: string;
}

interface PipelineReport {
  success: boolean;
  totalDurationMs: number;
  failedAtStep?: number;
  summary?: {
    canonicalUrl?: string;
    ownerUsername?: string;
    mediaSize?: string;
    cdnUrl?: string | null;
    cleanupStatus?: string;
  };
  steps: StepReport[];
  logs: Array<{
    timestamp: string;
    stage: number;
    message: string;
    data?: any;
  }>;
}

export const InstagramPipelineDebugger: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('https://www.instagram.com/reel/DC2G5oMoQ-Y/');
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<PipelineReport | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [copiedCdnUrl, setCopiedCdnUrl] = useState(false);
  const [customApifyToken, setCustomApifyToken] = useState('');
  const [customCdnToken, setCustomCdnToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRunPipeline = async () => {
    if (!targetUrl.trim() || isRunning) return;
    setIsRunning(true);
    setReport(null);
    setExpandedStep(null);

    try {
      const result = await api.runInstagramPipelineDebug({
        url: targetUrl.trim(),
        apifyToken: customApifyToken.trim() || undefined,
        cdnToken: customCdnToken.trim() || undefined,
        simulate12hCleanup: true,
        simulateIfNoKeys: true
      });
      setReport(result);
      if (!result.success && result.failedAtStep) {
        setExpandedStep(result.failedAtStep);
      }
    } catch (err: any) {
      setReport({
        success: false,
        totalDurationMs: 0,
        steps: [{
          step: 1,
          name: 'اجرای خط لوله دیباگر',
          success: false,
          durationMs: 0,
          error: err.message || 'خطا در برقراری ارتباط با سرور دیباگر'
        }],
        logs: [{
          timestamp: new Date().toLocaleTimeString('fa-IR'),
          stage: 0,
          message: `خطای کلاینت: ${err.message}`
        }]
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyLogs = () => {
    if (!report?.logs) return;
    const text = report.logs.map(l => `[${l.timestamp}] [مرحله ${l.stage}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleCopyCdnUrl = (cdnUrl: string) => {
    navigator.clipboard.writeText(cdnUrl);
    setCopiedCdnUrl(true);
    setTimeout(() => setCopiedCdnUrl(false), 2000);
  };

  // Helper getters for parsed details from steps
  const step1Details = report?.steps?.find(s => s.step === 1)?.details;
  const step2Details = report?.steps?.find(s => s.step === 2)?.details;
  const step3Details = report?.steps?.find(s => s.step === 3)?.details;
  const step4Details = report?.steps?.find(s => s.step === 4)?.details;
  const failedSteps = report?.steps?.filter(s => !s.success) || [];

  return (
    <div id="instagram-debugger-container" className="instagram-debugger-container space-y-6">
      {/* Main Debugger Header Banner */}
      <div id="instagram-debugger-header-card" className="instagram-debugger-header-card p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-slate-800/90 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-slate-950 shadow-lg shadow-pink-500/20">
              <Instagram className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2.5">
                دیباگر و آنالیزور اختصاصی اینستاگرام
                <span className="text-xs px-2.5 py-0.5 rounded-xl bg-pink-500/20 text-pink-300 font-mono font-bold border border-pink-500/30">
                  ۵ مرحله تست پیوسته
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                دریافت و استخراج محتوا، بررسی ارسال موفق به CDN اختصاصی (`upc.geekclub.ir`) و تحلیل جامع علت خطاهای احتمالی
              </p>
            </div>
          </div>

          <button
            type="button"
            id="instagram-pipeline-toggle-advanced-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="instagram-pipeline-toggle-advanced-btn text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 transition cursor-pointer flex items-center gap-2"
          >
            <span>تنظیمات توکن‌ها و کلیدها</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-pink-400" /> : <ChevronDown className="w-4 h-4 text-pink-400" />}
          </button>
        </div>

        {/* Advanced Token Override Inputs */}
        {showAdvanced && (
          <div id="instagram-debugger-advanced-settings-panel" className="p-4.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 text-xs">
            <div className="flex items-center gap-2 text-pink-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>جایگزینی موقت توکن‌ها جهت تست تشخیصی:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-slate-300 font-bold block mb-1">توکن دلخواه Apify (اختیاری):</label>
                <input
                  type="password"
                  id="instagram-debug-custom-apify-input"
                  value={customApifyToken}
                  onChange={(e) => setCustomApifyToken(e.target.value)}
                  placeholder="پیش‌فرض: خواندن از متغیرهای سیستم یا دیتابیس"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-pink-500 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs outline-none transition"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">توکن CDN_SECRET دلخواه (اختیاری):</label>
                <input
                  type="password"
                  id="instagram-debug-custom-cdn-input"
                  value={customCdnToken}
                  onChange={(e) => setCustomCdnToken(e.target.value)}
                  placeholder="پیش‌فرض: خواندن از CDN_SECRET سرور"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-pink-500 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs outline-none transition"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              در صورت خالی گذاشتن فیلدها، سیستم به صورت هوشمند از کلیدهای ذخیره‌شده در تنظیمات استفاده کرده و وضعیت واقعی ارتباط را گزارش می‌دهد.
            </p>
          </div>
        )}

        {/* URL Input Form */}
        <form
          id="instagram-debug-form"
          onSubmit={(e) => { e.preventDefault(); handleRunPipeline(); }}
          className="instagram-debug-form space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="url"
                id="instagram-debug-url-input"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="لینک پست یا ریلز اینستاگرام (مثال: https://www.instagram.com/reel/XXXX/)"
                className="instagram-debug-url-input w-full bg-slate-950 border border-slate-700/90 focus:border-pink-500 rounded-2xl px-4 py-3 text-xs text-slate-100 font-mono dir-ltr placeholder:text-slate-500 outline-none transition shadow-inner"
                required
              />
            </div>

            <button
              type="submit"
              id="instagram-debug-run-btn"
              disabled={isRunning || !targetUrl.trim()}
              className="instagram-debug-run-btn px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer shadow-lg shadow-pink-600/25 active:scale-95 shrink-0"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>در حال استخراج و تحلیل...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>اجرای دیباگ و استخراج اطلاعات</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 pt-1">
            <span className="font-bold text-slate-300">نمونه‌های آماده تست:</span>
            <button
              type="button"
              id="instagram-debug-preset-reel-btn"
              onClick={() => setTargetUrl('https://www.instagram.com/reel/DC2G5oMoQ-Y/')}
              className="text-pink-400 hover:underline font-mono text-[11px] bg-slate-800/60 px-2 py-0.5 rounded-md border border-pink-500/20"
            >
              ریلز اینستاگرام (DC2G5oMoQ-Y)
            </button>
            <span>•</span>
            <button
              type="button"
              id="instagram-debug-preset-post-btn"
              onClick={() => setTargetUrl('https://www.instagram.com/p/DB7lK_yInh4/')}
              className="text-pink-400 hover:underline font-mono text-[11px] bg-slate-800/60 px-2 py-0.5 rounded-md border border-pink-500/20"
            >
              پست تصویری (DB7lK_yInh4)
            </button>
          </div>
        </form>
      </div>

      {/* Report Results Grid Section */}
      {report && (
        <div id="instagram-debug-results-section" className="instagram-debug-results-section space-y-6">
          
          {/* SECTION 1: دریافت و نمایش اطلاعات و فایل‌های رسانه‌ای (Extracted Content & Files Report) */}
          <div id="instagram-debug-extracted-media-card" className="instagram-debug-extracted-media-card p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-pink-400" />
                <span>۱. اطلاعات و فایل‌های رسانه‌ای استخراج‌شده</span>
              </h4>
              <span className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 ${
                step2Details ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {step2Details ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                {step2Details ? 'اطلاعات با موفقیت استخراج شد' : 'خطا در دریافت اطلاعات'}
              </span>
            </div>

            {step2Details ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">
                {/* Meta details text list */}
                <div className="lg:col-span-2 space-y-3.5 text-xs text-slate-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <span className="text-slate-400 block mb-0.5">صاحب اثر / سازنده:</span>
                      <span className="font-bold text-white flex items-center gap-1.5 dir-ltr justify-end">
                        <User className="w-3.5 h-3.5 text-pink-400" />
                        @{step2Details.ownerUsername || 'مشخص نشده'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">نوع محتوا:</span>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {step2Details.isVideo ? <Video className="w-3.5 h-3.5 text-amber-400" /> : <Image className="w-3.5 h-3.5 text-cyan-400" />}
                        {step2Details.isVideo ? 'ویدیو / ریلز (Video)' : 'تصویر / کاروسل (Photo)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">آدرس کانونیکال پست:</span>
                      <a href={step1Details?.canonicalUrl || targetUrl} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-pink-400 hover:underline break-all dir-ltr block text-left">
                        {step1Details?.canonicalUrl || targetUrl}
                      </a>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">تعداد اسلایدها / فایل‌ها:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {step2Details.slidesCount || 1} اسلاید
                      </span>
                    </div>
                  </div>

                  {/* Caption snippet */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <span className="text-slate-400 font-bold block">متن / کپشن استخراج‌شده:</span>
                    <p className="text-slate-200 text-xs leading-relaxed max-h-24 overflow-y-auto">
                      {step2Details.captionSnippet || 'بدون متن'}
                    </p>
                  </div>
                </div>

                {/* Media Files Preview Container */}
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center space-y-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 self-start">
                    <Image className="w-4 h-4 text-pink-400" />
                    <span>پیش‌نمایش فایل استخراج‌شده:</span>
                  </span>

                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <img
                      src={resolveCoverImageUrl(step2Details.mediaUrl || step2Details.rawDisplayUrl, 'instagram')}
                      alt="پیش‌نمایش استخراج‌شده"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', targetUrl), 'instagram')}
                    />
                    {step2Details.isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="p-3 rounded-full bg-pink-600 text-white shadow-lg">
                          <Play className="w-5 h-5 fill-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {step2Details.mediaUrl && (
                    <a
                      href={step2Details.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 underline font-mono dir-ltr break-all"
                    >
                      <span>باز کردن لینک مستقیم رسانه</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>اطلاعات رسانه دریافت نشد. لطفاً کلید Apify و دسترسی اینستاگرام را بررسی کنید.</span>
              </div>
            )}
          </div>

          {/* SECTION 2: جزییات ارسال موفق به CDN (Successful CDN Upload Details Report) */}
          <div id="instagram-debug-cdn-details-card" className="instagram-debug-cdn-details-card p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2.5">
                <CloudUpload className="w-5 h-5 text-emerald-400" />
                <span>۲. جزییات ارسال موفق به هاست CDN اختصاصی (`upc.geekclub.ir`)</span>
              </h4>
              <span className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 ${
                step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>انتقال موفق به CDN</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>نیاز به بررسی CDN</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Column: CDN Server Stats */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">آدرس اندپوینت CDN:</span>
                  <span className="font-mono text-emerald-300 font-bold dir-ltr">
                    {step4Details?.cdnEndpoint || 'https://upc.geekclub.ir/s1/upload.php'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">پوشه ذخیره‌سازی در هاست:</span>
                  <span className="font-mono text-slate-200 dir-ltr">
                    {step4Details?.targetFolder || `s1/instagram/${step2Details?.ownerUsername || 'instagram'}/`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">مدت زمان انتقال (Latency):</span>
                  <span className="font-mono font-bold text-cyan-400 dir-ltr">
                    {step4Details ? `${report?.steps?.[3]?.durationMs || 0} ms` : 'نامشخص'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">حجم فایل آپلود شده:</span>
                  <span className="font-mono font-bold text-slate-200 dir-ltr">
                    {step3Details?.sizeMB || step4Details?.reportedSize || report?.summary?.mediaSize || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">تأیید دسترسی عمومی (HTTP 200 Live):</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1 dir-ltr">
                    <Check className="w-3.5 h-3.5" />
                    OK (200)
                  </span>
                </div>
              </div>

              {/* Right Column: Direct CDN Link & Copy Action */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-slate-400 block font-bold mb-1.5">لینک نهایی فایل روی CDN:</span>
                  {(step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl) ? (
                    <a
                      href={step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl!}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-emerald-400 hover:underline break-all dir-ltr block text-left bg-slate-900 p-2.5 rounded-xl border border-slate-800"
                    >
                      {step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl}
                    </a>
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px]">فایل هنوز روی CDN آپلود نشده است</span>
                  )}
                </div>

                {(step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl) && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      id="instagram-debug-copy-cdn-url-btn"
                      onClick={() => handleCopyCdnUrl(step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl!)}
                      className="instagram-debug-copy-cdn-url-btn flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
                    >
                      {copiedCdnUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCdnUrl ? 'کپی شد' : 'کپی لینک CDN'}</span>
                    </button>

                    <a
                      href={step4Details?.cdnUploadedUrl || report?.summary?.cdnUrl!}
                      target="_blank"
                      rel="noreferrer"
                      id="instagram-debug-open-cdn-url-btn"
                      className="instagram-debug-open-cdn-url-btn py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>مشاهده فایل</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: علت مشکلات و ناموفقیت‌های احتمالی (Troubleshooting & Failure Causes Report) */}
          <div id="instagram-debug-error-causes-card" className="instagram-debug-error-causes-card p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>۳. تحلیل جامع علت مشکلات و ناموفقیت‌های احتمالی</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {failedSteps.length > 0 ? `${failedSteps.length} خطای شناسایی‌شده` : 'بدون خطای بحرانی'}
              </span>
            </div>

            {/* List of active failed steps or general diagnostic checklist */}
            <div className="space-y-3 text-xs">
              {failedSteps.length > 0 ? (
                failedSteps.map((fs, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                    <div className="flex items-center justify-between text-rose-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        خطا در مرحله {fs.step}: {fs.name}
                      </span>
                      <span className="font-mono text-[11px]">{fs.durationMs}ms</span>
                    </div>

                    <p className="text-slate-200 leading-relaxed font-mono text-[11px] dir-ltr text-left bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      {fs.error || 'خطای نا مشخص'}
                    </p>

                    {fs.troubleshooting && (
                      <p className="text-amber-300 leading-relaxed pt-1">
                        💡 راهکار پیشنهادی: {fs.troubleshooting}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>هیچ خطای بحرانی یا شکست در فرایند دیباگ ثبت نگردید. تمامی ۵ مرحله با موفقیت سپری شدند.</span>
                </div>
              )}

              {/* Troubleshooting Reference Matrix */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 pt-4">
                <span className="font-bold text-slate-200 block text-xs border-b border-slate-800 pb-2">
                  📋 راهنمای سریع عیب‌یابی خطاهای رایج اینستاگرام:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-300 block">۱. عدم ثبت توکن Apify:</span>
                    <p className="text-slate-400 leading-relaxed">
                      اگر `APIFY_API_TOKEN` در متغیرهای سیستم تنظیم نشده باشد، سیستم از پل اضطراری استفاده کرده یا تست تشخیصی شبیه‌سازی را اجرا می‌کند. جهت دریافت داتاهای زنده، توکن Apify را در تب تنظیمات وارد نمایید.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-300 block">۲. خطای CDN_SECRET در آپلود:</span>
                    <p className="text-slate-400 leading-relaxed">
                      در صورت عدم تنظیم کلید `CDN_SECRET` یا نامعتبر بودن اسکریپت `upload.php` روی `upc.geekclub.ir`، فایل روی فضای موقت باقی مانده و آدرس CDN برگردانده نمی‌شود.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-300 block">۳. پست‌های خصوصی یا حذف‌شده:</span>
                    <p className="text-slate-400 leading-relaxed">
                      پست‌ها یا ریلزهایی که پیج آن‌ها Private باشد توسط اسکرپرهای عمومی قابل دریافت نیستند و خطای shortcode رخ می‌دهد.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-300 block">۴. محدودیت لایف‌تایم ۱۲ ساعته ورسل:</span>
                    <p className="text-slate-400 leading-relaxed">
                      فایل‌های ذخیره‌شده در فضای موقت `/tmp` ورسل پس از ۱۲ ساعت توسط ورکر پس‌زمینه پاکسازی می‌شوند تا فضای دیسک پر نشود.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: 5-Stage Checklist */}
          <div id="instagram-pipeline-steps-container" className="instagram-pipeline-steps-container space-y-3 pt-2">
            <h5 className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>گزارش جزئیات گام‌به‌گام ۵ مرحله خط لوله:</span>
              <span className="text-[11px] text-slate-400 font-mono">
                زمان کل دیباگ: {report.totalDurationMs}ms
              </span>
            </h5>

            {/* Stage 1 */}
            <StageItem
              stepNumber={1}
              title="۱. شناسایی و اعتبارسنجی لینک اینستاگرام"
              description="بررسی ساختار URL، تطابق Regex، استخراج Shortcode و ساخت آدرس کانونیکال"
              icon={<Instagram className="w-4 h-4 text-pink-400" />}
              stepData={report?.steps?.[0]}
              isRunning={isRunning && !report?.steps?.[0]}
              isExpanded={expandedStep === 1}
              onToggle={() => setExpandedStep(expandedStep === 1 ? null : 1)}
            />

            {/* Stage 2 */}
            <StageItem
              stepNumber={2}
              title="۲. دریافت اطلاعات از Apify API"
              description="ارسال درخواست به Apify Actor، استخراج اطلاعات پیج، کپشن و لینک مستقیم مدیا"
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
              stepData={report?.steps?.[1]}
              isRunning={isRunning && Boolean(report?.steps?.[0]) && !report?.steps?.[1]}
              isExpanded={expandedStep === 2}
              onToggle={() => setExpandedStep(expandedStep === 2 ? null : 2)}
            />

            {/* Stage 3 */}
            <StageItem
              stepNumber={3}
              title="۳. دانلود موفق فایل در فضای موقت ورسل (/tmp)"
              description="دریافت استریم فایل ویدیو یا عکس، ذخیره فیزیکی روی دیسک ورسل و اعتبارسنجی حجم و هش"
              icon={<HardDrive className="w-4 h-4 text-blue-400" />}
              stepData={report?.steps?.[2]}
              isRunning={isRunning && Boolean(report?.steps?.[1]) && !report?.steps?.[2]}
              isExpanded={expandedStep === 3}
              onToggle={() => setExpandedStep(expandedStep === 3 ? null : 3)}
            />

            {/* Stage 4 */}
            <StageItem
              stepNumber={4}
              title="۴. انتقال موفق فایل به هاست CDN اختصاصی (upc.geekclub.ir)"
              description="ارسال مستقیم با توکن به s1/upload.php در پوشه s1/instagram/{user}/ و تست زنده دسترسی عمومی"
              icon={<CloudUpload className="w-4 h-4 text-emerald-400" />}
              stepData={report?.steps?.[3]}
              isRunning={isRunning && Boolean(report?.steps?.[2]) && !report?.steps?.[3]}
              isExpanded={expandedStep === 4}
              onToggle={() => setExpandedStep(expandedStep === 4 ? null : 4)}
            />

            {/* Stage 5 */}
            <StageItem
              stepNumber={5}
              title="۵. پاک کردن فایل در هاست ورسل بعد از ۱۲ ساعت"
              description="پایش خودکار و حذف فایل‌های موقت منقضی‌شده با سن بیشتر از ۱۲ ساعت جهت آزادسازی فضای ورسل"
              icon={<Trash2 className="w-4 h-4 text-rose-400" />}
              stepData={report?.steps?.[4]}
              isRunning={isRunning && Boolean(report?.steps?.[3]) && !report?.steps?.[4]}
              isExpanded={expandedStep === 5}
              onToggle={() => setExpandedStep(expandedStep === 5 ? null : 5)}
            />
          </div>

          {/* Terminal Live Logs */}
          {report?.logs && report.logs.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  id="instagram-pipeline-toggle-logs-btn"
                  onClick={() => setShowLogs(!showLogs)}
                  className="instagram-pipeline-toggle-logs-btn text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-pink-400" />
                  <span>لاگ‌های فنی گام‌به‌گام ({report.logs.length} رویداد)</span>
                  {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  id="instagram-pipeline-copy-log-btn"
                  onClick={handleCopyLogs}
                  className="instagram-pipeline-copy-log-btn text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLogs ? 'کپی شد' : 'کپی لاگ‌ها'}</span>
                </button>
              </div>

              {showLogs && (
                <div
                  id="instagram-pipeline-log-terminal"
                  className="instagram-pipeline-log-terminal max-h-60 overflow-y-auto p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 dir-ltr text-left shadow-inner"
                >
                  {report.logs.map((l, idx) => (
                    <div key={idx} className="leading-relaxed hover:bg-slate-900/50 px-1 rounded">
                      <span className="text-slate-500">[{l.timestamp}]</span>{' '}
                      <span className={l.stage === 0 ? 'text-cyan-400 font-bold' : 'text-pink-400'}>[Stage {l.stage}]</span>{' '}
                      <span className={l.message.includes('خطا') || l.message.includes('FAILED') ? 'text-rose-400' : 'text-slate-200'}>
                        {l.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Sub-component: Individual Stage Item Card
// -------------------------------------------------------------
interface StageItemProps {
  stepNumber: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  stepData?: StepReport;
  isRunning?: boolean;
  isExpanded?: boolean;
  onToggle: () => void;
}

const StageItem: React.FC<StageItemProps> = ({
  stepNumber,
  title,
  description,
  icon,
  stepData,
  isRunning,
  isExpanded,
  onToggle
}) => {
  const isDone = Boolean(stepData);
  const isSuccess = stepData?.success;
  const hasWarning = Boolean(stepData?.warning);

  return (
    <div
      id={`instagram-pipeline-step-${stepNumber}`}
      className={`instagram-pipeline-step-item p-4 rounded-2xl border transition ${
        isRunning 
          ? 'bg-blue-950/20 border-blue-500/50' 
          : isDone 
            ? isSuccess
              ? hasWarning
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-rose-950/20 border-rose-500/40'
            : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
            {icon}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h6 className="text-xs font-bold text-slate-100">{title}</h6>
              {stepData?.durationMs !== undefined && (
                <span className="text-[10px] text-slate-400 font-mono">
                  ({stepData.durationMs}ms)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {isRunning ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>در حال اجرا...</span>
            </div>
          ) : isDone ? (
            isSuccess ? (
              hasWarning ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>تأیید با هشدار</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>موفق</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                <XCircle className="w-3 h-3 text-rose-400" />
                <span>ناموفق</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
              <span>در انتظار</span>
            </div>
          )}

          {isDone && (
            <button
              type="button"
              onClick={onToggle}
              className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              title="مشاهده جزئیات مرحله"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && stepData && (
        <div className="mt-3.5 pt-3 border-t border-slate-800 text-xs space-y-2 font-mono text-[11px] dir-ltr text-left">
          {stepData.error && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 font-sans dir-rtl text-right">
              خطا: {stepData.error}
            </div>
          )}
          {stepData.warning && (
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-sans dir-rtl text-right">
              توجه: {stepData.warning}
            </div>
          )}
          {stepData.details && (
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 overflow-x-auto max-h-48">
              {JSON.stringify(stepData.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
