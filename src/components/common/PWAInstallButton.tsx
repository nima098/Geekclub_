import React, { useState } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallDropdownProps {
  onCloseMenu?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallDropdownProps> = ({ onCloseMenu }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleAction = () => {
    if (onCloseMenu) onCloseMenu();
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      alert('برای نصب این برنامه، در منوی مرورگر خود گزینه «Install App» یا «Add to Home screen» را انتخاب فرمایید.');
    }
  };

  return (
    <>
      <button
        onClick={handleAction}
        className="w-full text-right px-3 py-2 text-xs text-indigo-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition cursor-pointer font-bold"
      >
        <span className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          نصب وب‌اپلیکیشن (PWA)
        </span>
        <span className="text-[10px] bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-medium">
          نصب
        </span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                راهنمای نصب در آیفون / آیپد (iOS)
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
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
              className="mt-5 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
