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
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

interface StepReport {
  step: number;
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
  warning?: string;
  details?: Record<string, any>;
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
          name: 'اجرای خط لوله',
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

  return (
    <div id="instagram-pipeline-debug-card" className="instagram-pipeline-debug-card p-5 sm:p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-slate-950 shadow-md">
            <Instagram className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
              ابزار دیباگ کامل خط لوله اینستاگرام
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 font-mono border border-pink-500/30">
                5 مراحل پیوسته
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              تست گام‌به‌گام از شناسایی لینک، استخراج Apify، دانلود در ورسل، انتقال به CDN، و پاکسازی پس از ۱۲ ساعت
            </p>
          </div>
        </div>

        <button
          type="button"
          id="instagram-pipeline-toggle-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="instagram-pipeline-toggle-advanced-btn text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5"
        >
          <span>تنظیمات توکن‌ها</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Advanced Token Override Inputs */}
      {showAdvanced && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-750 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">توکن دلخواه Apify (اختیاری):</label>
              <input
                type="password"
                value={customApifyToken}
                onChange={(e) => setCustomApifyToken(e.target.value)}
                placeholder="پیش‌فرض: خواندن از متغیرهای محیطی یا دیتابیس"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-[11px] outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">توکن CDN_SECRET دلخواه (اختیاری):</label>
              <input
                type="password"
                value={customCdnToken}
                onChange={(e) => setCustomCdnToken(e.target.value)}
                placeholder="پیش‌فرض: خواندن از متغیرهای سرور"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-[11px] outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            در صورت خالی گذاشتن فیلدها، سیستم از کلیدهای ذخیره شده در سرور استفاده کرده و در صورت نبود کلید، شبیه‌سازی تشخیصی کامل را اجرا می‌کند.
          </p>
        </div>
      )}

      {/* URL Input Form */}
      <form
        id="instagram-pipeline-debug-form"
        onSubmit={(e) => { e.preventDefault(); handleRunPipeline(); }}
        className="instagram-pipeline-debug-form space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="url"
              id="instagram-pipeline-url-input"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/XXXXX/ یا https://www.instagram.com/p/XXXXX/"
              className="instagram-pipeline-url-input w-full bg-slate-900 border border-slate-700 focus:border-pink-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono dir-ltr placeholder:text-slate-500 outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            id="run-instagram-pipeline-debug-btn"
            disabled={isRunning || !targetUrl.trim()}
            className="run-instagram-pipeline-debug-btn px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-95 shrink-0"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>در حال اجرای ۵ مرحله...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white" />
                <span>اجرای دیباگ کامل خط لوله</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>نمونه‌های آماده تست:</span>
          <button
            type="button"
            onClick={() => setTargetUrl('https://www.instagram.com/reel/DC2G5oMoQ-Y/')}
            className="text-pink-400 hover:underline font-mono"
          >
            ریلز اینستاگرام (DC2G5oMoQ-Y)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setTargetUrl('https://www.instagram.com/p/DB7lK_yInh4/')}
            className="text-pink-400 hover:underline font-mono"
          >
            پست تصویری (DB7lK_yInh4)
          </button>
        </div>
      </form>

      {/* 5-Stage Checklist */}
      <div id="instagram-pipeline-steps-container" className="instagram-pipeline-steps-container space-y-2.5 pt-2">
        <h5 className="text-xs font-bold text-slate-200 flex items-center justify-between">
          <span>وضعیت ۵ مرحله کلیدی خط لوله اینستاگرام:</span>
          {report && (
            <span className="text-[11px] text-slate-400 font-mono">
              زمان کل: {report.totalDurationMs}ms
            </span>
          )}
        </h5>

        {/* Stage 1 */}
        <StageItem
          stepNumber={1}
          title="۱. شناسایی و اعتبارسنجی لینک اینستاگرام"
          description="بررسی ساختار URL، تطابق Regex، استخراج Post Shortcode و ساخت آدرس کانونیکال"
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

      {/* Summary Box */}
      {report && (
        <div className={`p-4 rounded-xl border text-xs space-y-2 ${
          report.success 
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              {report.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              نتیجه کلی تست خط لوله: {report.success ? 'موفقیت کامل در تمامی ۵ مرحله' : 'انجام شد (همراه با هشدار یا پیام)'}
            </span>
            <span className="font-mono">{report.totalDurationMs}ms</span>
          </div>

          {report.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-700/50 text-[11px] text-slate-300">
              <div>• اکانت اینستاگرام: <span className="font-bold text-white font-mono">@{report.summary.ownerUsername || 'مشخص نشده'}</span></div>
              <div>• حجم فایل دانلود شده: <span className="font-bold text-white font-mono">{report.summary.mediaSize || 'N/A'}</span></div>
              {report.summary.cdnUrl && (
                <div className="col-span-1 sm:col-span-2 break-all">
                  • آدرس در CDN اختصاصی: <a href={report.summary.cdnUrl} target="_blank" rel="noreferrer" className="text-emerald-400 underline font-mono">{report.summary.cdnUrl}</a>
                </div>
              )}
              <div className="col-span-1 sm:col-span-2">
                • وضعیت پاکسازی ۱۲ ساعته: <span className="text-slate-200">{report.summary.cleanupStatus}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terminal Live Logs */}
      {report?.logs && report.logs.length > 0 && (
        <div className="space-y-2 pt-1">
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
              className="instagram-pipeline-log-terminal max-h-52 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 dir-ltr text-left"
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
      className={`instagram-pipeline-step-item p-3.5 rounded-xl border transition ${
        isRunning 
          ? 'bg-blue-950/20 border-blue-500/50' 
          : isDone 
            ? isSuccess
              ? hasWarning
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-rose-950/20 border-rose-500/40'
            : 'bg-slate-900/60 border-slate-750'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>در حال اجرا...</span>
            </div>
          ) : isDone ? (
            isSuccess ? (
              hasWarning ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>تأیید با هشدار</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>موفق</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                <XCircle className="w-3 h-3 text-rose-400" />
                <span>ناموفق</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
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
        <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs space-y-2 font-mono text-[11px] dir-ltr text-left">
          {stepData.error && (
            <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-sans dir-rtl text-right">
              خطا: {stepData.error}
            </div>
          )}
          {stepData.warning && (
            <div className="p-2 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-sans dir-rtl text-right">
              توجه: {stepData.warning}
            </div>
          )}
          {stepData.details && (
            <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 overflow-x-auto max-h-40">
              {JSON.stringify(stepData.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
