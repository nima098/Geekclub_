import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running standalone, don't show the prompt
  if (isInstalled) {
    return null;
  }

  // Android / Chromium / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="btn-pwa-install flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
        title="نصب اپلیکیشن روی گوشی یا دسکتاپ"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">نصب اپلیکیشن</span>
        <span className="sm:hidden">نصب</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="btn-pwa-ios-install flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>نصب روی آیفون</span>
        </button>

        {showIOSGuide && (
          <div className="gc-pwa-guide-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
            <div className="gc-pwa-guide-modal w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl text-right">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  راهنمای نصب در آیفون / آیپد (iOS)
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="btn-close-ios-guide p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ۱
                  </span>
                  <div>
                    در نوار پایین مرورگر سافاری روی آیکون <strong>اشتراک‌گذاری (Share)</strong> بزنید.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ۲
                  </span>
                  <div>
                    گزینه <strong>«افزودن به صفحه اصلی» (Add to Home Screen)</strong> را انتخاب کنید.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ۳
                  </span>
                  <div>
                    در گوشه بالا دکمه <strong>Add</strong> را بزنید. آیکون گیک کلاب روی صفحه گوشی شما قرار خواهد گرفت.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="btn-confirm-ios-guide mt-5 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback install button for other browsers / manual guide
  return (
    <button
      onClick={() => setShowIOSGuide(true)}
      className="btn-pwa-fallback-install hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700 font-medium text-xs transition cursor-pointer"
      title="راهنمای افزودن به صفحه اصلی"
    >
      <Download className="w-3.5 h-3.5 text-indigo-400" />
      <span>نصب وب‌اپ (PWA)</span>
    </button>
  );
};
