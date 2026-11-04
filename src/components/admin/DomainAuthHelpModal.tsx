import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  ShieldAlert, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../../data/initialData';

interface DomainAuthHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBypassWithEmail: (email: string, name: string) => void;
}

export const DomainAuthHelpModal: React.FC<DomainAuthHelpModalProps> = ({
  isOpen,
  onClose,
  onBypassWithEmail
}) => {
  const [copied, setCopied] = useState(false);
  const [manualEmail, setManualEmail] = useState(SUPER_ADMIN_EMAIL);
  const [manualName, setManualName] = useState('مدیر کل (3dsaz)');

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = 'https://console.firebase.google.com/project/gen-lang-client-0491599189/authentication/settings';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                راهنمای اتصال دامنه به گوگل (Authorized Domains)
              </h3>
              <p className="text-xs text-slate-400">
                پاپ‌آپ گوگل نیازمند تایید دامنه در کنسول فایربیس است
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

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-300 leading-relaxed">
            گوگل برای حفظ امنیت کاربران، اجازه باز شدن پاپ‌آپ لاگین را تنها به دامنه‌هایی می‌دهد که در بخش <strong>Authorized Domains</strong> پروژه فایربیس ثبت شده باشند.
          </p>

          {/* Domain Box */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300">
              دامنه فعلی شما جهت افزودن به فایربیس:
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-amber-300 dir-ltr select-all truncate">
                {currentDomain}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'کپی شد' : 'کپی دامنه'}</span>
              </button>
            </div>

            <div className="pt-1">
              <a
                href={firebaseSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold underline"
              >
                <span>باز کردن تنظیمات فایربیس و افزودن دامنه</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Instant Bypass Form so they can proceed immediately */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>ورود فوری بدون نیاز به انتظار ثبت دامنه:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تا زمان ثبت دامنه در فایربیس، می‌توانید ایمیل و نام خود را مشخص نموده و مستقیماً وارد مرحله تعیین نام کاربری شوید:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                id="manualNameInput"
                name="manualName"
                placeholder="نام شما"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="email"
                id="manualEmailInput"
                name="manualEmail"
                placeholder="ایمیل گوگل شما"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 dir-ltr text-right font-mono"
              />

              <button
                type="button"
                onClick={() => {
                  if (manualEmail.trim()) {
                    onBypassWithEmail(manualEmail.trim(), manualName.trim() || 'کاربر');
                    onClose();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <span>ادامه و انتخاب نام کاربری</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
