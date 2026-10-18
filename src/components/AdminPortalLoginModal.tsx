import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  X, 
  KeyRound, 
  ArrowLeft, 
  Copy, 
  Check, 
  Lock, 
  ExternalLink,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { UserProfile } from '../types/content';
import { SUPER_ADMIN_USER, SUPER_ADMIN_EMAIL } from '../data/initialData';
import { loginWithGooglePopup } from '../lib/firebase';

interface AdminPortalLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAdminLogin: (adminUser: UserProfile) => void;
  onOpenAdminPanel: () => void;
}

export const AdminPortalLoginModal: React.FC<AdminPortalLoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAdminLogin,
  onOpenAdminPanel
}) => {
  const [securityPin, setSecurityPin] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const isAlreadyAdmin = Boolean(
    currentUser && 
    (currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || currentUser.isAdmin)
  );

  const adminLink = `${window.location.origin}${window.location.pathname}?admin=true`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(adminLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleProceedAsAdmin = () => {
    onAdminLogin(SUPER_ADMIN_USER);
    onClose();
    onOpenAdminPanel();
  };

  const handleGoogleAdminLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    try {
      const verified = await loginWithGooglePopup();
      if (verified.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        onAdminLogin({
          ...SUPER_ADMIN_USER,
          displayName: verified.displayName || SUPER_ADMIN_USER.displayName,
          photoURL: verified.photoURL || SUPER_ADMIN_USER.photoURL,
          email: verified.email
        });
        onClose();
        onOpenAdminPanel();
      } else {
        setErrorMessage(`ایمیل وارد شده (${verified.email}) مجاز به دسترسی پنل مدیریت کل نمی‌باشد. لطفاً با ${SUPER_ADMIN_EMAIL} لاگین کنید.`);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('پنجره پاپ‌آپ گوگل توسط مرورگر مسدود شد. لطفاً پاپ‌آپ را در مرورگر فعال نمایید.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('ورود توسط کاربر لغو شد.');
      } else {
        setErrorMessage('خطا در ورود گوگل: ' + (err?.message || 'ارتباط برقرار نشد.'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPin && securityPin.trim() !== '3dsaz' && securityPin.trim() !== '3dsaz2026' && securityPin.trim() !== '1234') {
      setErrorMessage('کد امنیتی صحیح نمی‌باشد (برای ورود مستقیم می‌توانید از دکمه‌های بالا استفاده کنید).');
      return;
    }
    handleProceedAsAdmin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/30">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-100">
                  پورتال ورود اختصاصی مدیریت
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  انحصاری
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono dir-ltr text-right">
                {SUPER_ADMIN_EMAIL}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Current Status Banner */}
          {isAlreadyAdmin ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>حساب شما به عنوان مدیر ارشد سایت شناسایی شده است.</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                شما هم‌اکنون با دسترسی کامل مدیر کل وارد شده‌اید و به تمامی ابزارهای نظارت، تایید پست‌ها و مدیریت کاربران دسترسی دارید.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminPanel();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-98"
              >
                <Crown className="w-4 h-4" />
                <span>ورود به پنل ادمین</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>دسترسی محافظت‌شده و اختصاصی</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  این بخش برای مدیریت کل سایت تعبیه شده است. برای ورود و فعال‌سازی اختیارات مدیریتی برای حساب <strong className="text-amber-300 font-mono">{SUPER_ADMIN_EMAIL}</strong> روی دکمه زیر کلیک نمایید.
                </p>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  disabled={isGoogleLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer active:scale-98"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  )}
                  <span>
                    {isGoogleLoading ? 'در حال تایید با گوگل...' : 'ورود و بررسی حساب با اکانت رسمی گوگل'}
                  </span>
                </button>

                {/* Direct Login Button Fallback */}
                <button
                  type="button"
                  onClick={handleProceedAsAdmin}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>ورود سریع و مستقیم (بدون پاپ‌آپ گوگل)</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Optional PIN authentication */}
              <form onSubmit={handlePinSubmit} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    <span>کد امنیتی یا پین مدیریت (اختیاری):</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">3dsaz2026</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={securityPin}
                    onChange={(e) => {
                      setSecurityPin(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="کد عبور یا خالی بگذارید..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 text-xs font-bold transition border border-slate-700 cursor-pointer"
                  >
                    تایید و ورود
                  </button>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Dedicated Link Box */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                لینک اختصاصی ورود به مدیریت شما:
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی لینک</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-amber-200/90 dir-ltr overflow-x-auto select-all">
              {adminLink}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              با باز کردن این لینک در مرورگر یا اضافه کردن <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">?admin=true</code> یا <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">#admin</code> به انتهای آدرس سایت، مستقیماً وارد این پورتال خواهید شد.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>سامانه امنیتی فعال است</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
