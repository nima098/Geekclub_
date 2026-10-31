import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Mail, 
  User as UserIcon, 
  AtSign, 
  Crown, 
  ShieldCheck, 
  ArrowLeft,
  KeyRound,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../types/content';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_USER } from '../data/initialData';
import { getAuthorAvatar } from '../utils/imageHelper';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingUsers: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onStartGoogleLogin?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  existingUsers,
  onLogin,
  onStartGoogleLogin
}) => {
  const [activeTab, setActiveTab] = useState<'gmail' | 'register'>('gmail');
  
  // Gmail / Email form state
  const [gmailAddress, setGmailAddress] = useState('');
  
  // Register form state
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Handle direct Gmail / Email login (Bypasses Google OAuth origin_mismatch)
  const handleGmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanInput = gmailAddress.trim().toLowerCase().replace(/^@/, '');
    if (!cleanInput) {
      setError('لطفاً آدرس جمیل یا نام کاربری خود را وارد نمایید.');
      return;
    }

    const isSuperAdminEmail = cleanInput === SUPER_ADMIN_EMAIL.toLowerCase();
    const isSuperAdminUsername = cleanInput === '3dsaz' || cleanInput === '3dsaz1990' || cleanInput === 'admin';

    if (isSuperAdminEmail || isSuperAdminUsername) {
      const adminProfile: UserProfile = {
        ...SUPER_ADMIN_USER,
        email: SUPER_ADMIN_EMAIL,
        isAdmin: true,
        autoApproveContent: true,
        role: 'مدیر کل سایت (Super Admin)',
        hasCompletedRegistration: true
      };
      onLogin(adminProfile);
      onClose();
      return;
    }

    // Search in existing registered users
    const found = existingUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanInput) ||
        (u.username && u.username.toLowerCase() === cleanInput)
    );

    if (found) {
      onLogin(found);
      onClose();
      return;
    }

    // Auto-create user profile for valid Gmail / Email addresses
    const emailToUse = cleanInput.includes('@') ? cleanInput : `${cleanInput}@gmail.com`;
    const usernamePrefix = emailToUse.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const newProfile: UserProfile = {
      uid: `usr-${Date.now()}`,
      displayName: usernamePrefix,
      username: usernamePrefix,
      email: emailToUse,
      photoURL: getAuthorAvatar(usernamePrefix),
      isAdmin: false,
      autoApproveContent: true,
      role: 'کاربر عضو',
      joinedAt: 'آبان ۱۴۰۵',
      hasCompletedRegistration: true
    };

    onLogin(newProfile);
    onClose();
  };

  // Handle direct local registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = regDisplayName.trim();
    const cleanUser = regUsername.trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanName) {
      setError('لطفاً نام نمایشی خود را وارد کنید.');
      return;
    }

    if (!cleanUser || cleanUser.length < 3) {
      setError('نام کاربری باید حداقل ۳ کاراکتر انگلیسی باشد.');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUser)) {
      setError('نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط (_) باشد.');
      return;
    }

    const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    const newProfile: UserProfile = {
      uid: isSuperAdmin ? 'admin-super-3dsaz' : `usr-${Date.now()}`,
      displayName: cleanName,
      username: cleanUser,
      email: cleanEmail || `${cleanUser}@gmail.com`,
      photoURL: getAuthorAvatar(cleanName),
      isAdmin: isSuperAdmin,
      autoApproveContent: true,
      role: isSuperAdmin ? 'مدیر کل سایت (Super Admin)' : 'کاربر عضو',
      joinedAt: 'آبان ۱۴۰۵',
      hasCompletedRegistration: true
    };

    onLogin(newProfile);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0077d9] text-white flex items-center justify-center shadow-lg shadow-[#0077d9]/20 shrink-0">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">
                ورود به حساب کاربری
              </h3>
              <p className="text-xs text-slate-400">
                احراز هویت مستقیم با جمیل بدون تحریم فایربیس و گوگل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5 mx-5 mt-4 rounded-2xl border">
          <button
            type="button"
            onClick={() => { setActiveTab('gmail'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'gmail'
                ? 'bg-[#0077d9] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>ورود مستقیم با جمیل</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-[#0077d9] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ثبت‌نام جدید</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'gmail' ? (
            <form onSubmit={handleGmailSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>احراز هویت بدون محدودیت دامنه گوگل و فایربیس</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  آدرس جمیل خود را وارد کنید تا بدون برخورد با خطای OAuth و تحریم‌ها وارد شوید:
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#0077d9]" />
                  <span>آدرس جمیل شما (Gmail):</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={gmailAddress}
                  onChange={(e) => setGmailAddress(e.target.value)}
                  placeholder="3dsaz1990@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0077d9]/50 dir-ltr text-right font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-2xl bg-[#0077d9] hover:bg-[#0066bd] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0077d9]/30 transition cursor-pointer active:scale-98"
              >
                <span>ورود مستقیم به حساب</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Popup Option (If origin is whitelisted in Cloud Console) */}
              {onStartGoogleLogin && (
                <div className="pt-3 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => { onClose(); onStartGoogleLogin(); }}
                    className="w-full py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 opacity-70" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>تست باز کردن پاپ‌آپ گوگل (گوگل کلاد)</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#0077d9]" />
                  <span>نام و نام خانوادگی:</span>
                </label>
                <input
                  type="text"
                  required
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="مثال: علی رضایی"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0077d9]/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-[#0077d9]" />
                  <span>نام کاربری (انگلیسی):</span>
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0077d9]/50 font-mono dir-ltr text-right"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>ایمیل یا جمیل:</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0077d9]/50 font-mono dir-ltr text-right"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-2xl bg-[#0077d9] hover:bg-[#0066bd] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0077d9]/30 transition cursor-pointer active:scale-98"
              >
                <span>ثبت‌نام و ورود به گیک‌کلاب</span>
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
