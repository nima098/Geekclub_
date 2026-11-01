import React, { useState } from 'react';
import { 
  Sparkles, 
  Share2, 
  PlusCircle, 
  X, 
  Compass, 
  Code2, 
  Zap, 
  Users 
} from 'lucide-react';

interface WelcomeBannerProps {
  onStartGoogleLogin: () => void;
  onOpenAddModal: () => void;
  isLoggingIn?: boolean;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onStartGoogleLogin,
  onOpenAddModal,
  isLoggingIn = false
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-right">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close / Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700/50"
          title="بستن پیام خوش‌آمدگویی"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Main Info Section */}
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>پلتفرم تخصصی جامعه توسعه‌دهندگان و گیک‌ها</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
              به <span className="text-indigo-300">گیک‌کلاب</span> خوش آمدید!
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              مرجع گلچین و اشتراک‌گذاری برترین ویدیوهای یوتیوب، آپارات، اینستاگرام و مقالات تخصصی برنامه‌نویسی، هوش مصنوعی و فناوری.
            </p>

            {/* Quick Highlights */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-[11px] font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                محتوای دست‌چین شده روزانه
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-[11px] font-medium">
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                هوش مصنوعی و برنامه‌نویسی
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-[11px] font-medium">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                جامعه آزاد اشتراک دانش
              </span>
            </div>
          </div>

          {/* Call to Action Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
            <button
              onClick={onStartGoogleLogin}
              disabled={isLoggingIn}
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-75 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-white/10 transition-all cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin shrink-0" />
                  <span>در حال اتصال...</span>
                </>
              ) : (
                <>
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>ورود سریع با گوگل</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-indigo-300" />
              <span>اشتراک‌گذاری محتوا</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
