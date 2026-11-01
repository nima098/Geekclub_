import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, FileText, ArrowUpRight, Copy, Check } from 'lucide-react';
import { compressAndConvertToWebP, uploadImageToCDN, getCDNConfig } from '../services/cdnService';

interface ImageCDNUploadProps {
  currentUrl?: string;
  onUrlChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  folder?: string;
}

export const ImageCDNUpload: React.FC<ImageCDNUploadProps> = ({
  currentUrl = '',
  onUrlChange,
  label = 'تصویر کاور محتوا (CDN اختصاصی)',
  placeholder = 'https://upc.geekclub.ir/s1/contents/2026/10/...',
  folder = 'contents'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    originalKb: number;
    compressedKb: number;
    savingPercent: number;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndUpload(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processAndUpload(file);
    }
  };

  const processAndUpload = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(10);

    try {
      // 1. Convert to WebP & compress
      const compressedResult = await compressAndConvertToWebP(file);
      setUploadProgress(40);

      const origKb = Math.round(compressedResult.originalSize / 1024);
      const compKb = Math.round(compressedResult.compressedSize / 1024);
      const savingPct = origKb > 0 ? Math.round(((origKb - compKb) / origKb) * 100) : 0;

      // 2. Upload to CDN (upc.geekclub.ir) inside s1/{folder}/YYYY/MM
      const uploadResult = await uploadImageToCDN(file, folder, (pct) => {
        setUploadProgress(40 + Math.round(pct * 0.55));
      });

      setUploadProgress(100);
      onUrlChange(uploadResult.url);
      setSuccessInfo({
        originalKb: origKb,
        compressedKb: compKb,
        savingPercent: Math.max(0, savingPct)
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در آپلود عکس به CDN');
    } finally {
      setIsUploading(false);
    }
  };

  const copyUrl = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatFullCdnUrl = (raw: string): string => {
    if (!raw) return '';
    let u = raw.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('data:')) {
      if (u.startsWith('/')) {
        u = `https://upc.geekclub.ir${u}`;
      } else {
        u = `https://upc.geekclub.ir/${u}`;
      }
    }
    return u;
  };

  const displayUrl = formatFullCdnUrl(currentUrl);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-200">
          {label}
        </label>
        <span className="text-[10px] text-amber-400/90 font-mono dir-ltr bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
          https://upc.geekclub.ir
        </span>
      </div>

      {/* Manual URL Input / Current URL Display */}
      <div className="relative flex items-center">
        <input
          type="text"
          id="cdnUrlInput"
          name="cdnUrl"
          value={displayUrl}
          onChange={(e) => {
            const val = formatFullCdnUrl(e.target.value);
            onUrlChange(val);
            setSuccessInfo(null);
            setErrorMessage(null);
          }}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/80 transition dir-ltr text-left pl-9"
        />
        {displayUrl && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(displayUrl);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            title="کپی آدرس تصویر"
            className="absolute left-2 p-1 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Live Cover Preview Box */}
      {displayUrl && (
        <div className="relative aspect-video w-full max-h-48 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center shadow-lg">
          <img
            src={displayUrl}
            alt="پیش‌نمایش تصویر کاور"
            className="w-full h-full object-cover"
            onError={(e) => {
              if (!displayUrl.includes('/api/proxy-image') && !displayUrl.startsWith('data:')) {
                e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(displayUrl)}`;
              }
            }}
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-[10px] text-amber-300 font-mono flex items-center gap-1 backdrop-blur-sm border border-amber-500/30">
            <CheckCircle2 className="w-3 h-3 text-amber-400" />
            <span>{displayUrl.includes('upc.geekclub.ir') ? 'هاست شده روی CDN' : 'پیش‌نمایش تصویر'}</span>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-3 sm:p-4 text-center cursor-pointer transition-all duration-200 ${
          isUploading
            ? 'border-amber-500/50 bg-amber-500/5'
            : 'border-slate-700/80 hover:border-amber-500/60 bg-slate-900/60 hover:bg-slate-800/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-1.5">
          {isUploading ? (
            <>
              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
              <p className="text-xs font-bold text-amber-300">
                در حال فشرده‌سازی خودکار WebP و آپلود به CDN... ({uploadProgress}٪)
              </p>
              <div className="w-full max-w-xs bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                <div
                  className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-200 font-medium">
                برای آپلود مستقیم تصویر روی <span className="text-amber-400 font-bold">upc.geekclub.ir</span> کلیک کنید یا عکس را بکشید و این‌جا رها کنید
              </p>
              <p className="text-[10px] text-slate-400">
                فرمت‌ها: JPG, PNG, WebP (فشرده‌سازی خودکار و بهینه‌سازی فرمت WebP در کلاینت)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Success Compression Stats Badge */}
      {successInfo && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-bold">آپلود موفق به CDN!</span>{' '}
            حجم تصویر از <span className="font-mono dir-ltr inline-block">{successInfo.originalKb} KB</span> به{' '}
            <span className="font-mono dir-ltr inline-block font-bold text-white">{successInfo.compressedKb} KB</span> (فرمت WebP) فشرده شد ({successInfo.savingPercent}٪ صرفه‌جویی).
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="flex-1">
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
