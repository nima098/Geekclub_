import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  Check, 
  ShieldCheck, 
  User as UserIcon, 
  Sparkles,
  LogOut
} from 'lucide-react';
import { UserProfile } from '../types/content';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

const SAMPLE_GOOGLE_ACCOUNTS: UserProfile[] = [
  {
    uid: 'google-usr-1',
    displayName: 'احسان محمدی (توسعه‌دهنده)',
    username: 'ehsan_dev',
    email: 'ehsan.dev@gmail.com',
    hideEmail: false,
    allowProfileComments: true,
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
  },
  {
    uid: 'google-usr-2',
    displayName: 'سارا ناصری (طراح محصول)',
    username: 'sara_ux',
    email: 'sara.ux@gmail.com',
    hideEmail: true,
    allowProfileComments: true,
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  },
  {
    uid: 'google-usr-3',
    displayName: 'کامران بهرامی (علاقه‌مند به هوش مصنوعی)',
    username: 'kamran_ai',
    email: 'kamran.ai@gmail.com',
    hideEmail: false,
    allowProfileComments: false,
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80'
  }
];

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout
}) => {
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) return;

    const baseUsername = customEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';

    onLogin({
      uid: `google-${Date.now()}`,
      displayName: customName.trim(),
      username: baseUsername,
      email: customEmail.trim(),
      hideEmail: false,
      allowProfileComments: true,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customName)}`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            {/* Google Icon */}
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                ورود با حساب گوگل
              </h3>
              <p className="text-xs text-slate-400">
                Sign in with Google
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
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-3.5">
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/50"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-100">
                      {currentUser.displayName}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="text-xs text-slate-400 dir-ltr text-right block font-mono">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed bg-slate-800/30 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>شما در حال حاضر با این حساب لاگین هستید و می‌توانید نظرات و لایک‌های خود را ثبت کنید.</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  خروج از حساب
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition"
                >
                  بستن
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-slate-300 mb-3 font-semibold">
                  انتخاب یکی از حساب‌های گوگل ذخیره شده:
                </p>

                <div className="space-y-2">
                  {SAMPLE_GOOGLE_ACCOUNTS.map((account) => (
                    <button
                      key={account.uid}
                      onClick={() => {
                        onLogin(account);
                        onClose();
                      }}
                      className="w-full p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 flex items-center justify-between text-right transition group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={account.photoURL}
                          alt={account.displayName}
                          className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-600 group-hover:ring-indigo-500 transition"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition">
                            {account.displayName}
                          </div>
                          <div className="text-[11px] text-slate-400 dir-ltr text-right font-mono">
                            {account.email}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-indigo-400 group-hover:translate-x-[-2px] transition">
                        ورود ←
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Or custom email entry */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-400 mb-3 font-medium">
                  یا با ایمیل گوگل دلخواه خود وارد شوید:
                </p>

                <form onSubmit={handleCustomLogin} className="space-y-2.5">
                  <input
                    type="text"
                    required
                    placeholder="نام نمایشی شما"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <input
                    type="email"
                    required
                    placeholder="ایمیل گوگل (yourname@gmail.com)"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dir-ltr text-left font-mono"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
                  >
                    تایید و ورود با این حساب
                  </button>
                </form>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                اتصال امن از طریق هویت و پروتکل Google OAuth
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
