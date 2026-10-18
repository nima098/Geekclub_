import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  AtSign, 
  User as UserIcon, 
  ArrowLeft, 
  ShieldCheck, 
  Crown,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types/content';
import { SUPER_ADMIN_EMAIL } from '../data/initialData';

interface GoogleTempUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

interface UsernameSetupModalProps {
  isOpen: boolean;
  googleUser: GoogleTempUser | null;
  existingUsers: UserProfile[];
  onComplete: (user: UserProfile) => void;
  onCancel: () => void;
}

export const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({
  isOpen,
  googleUser,
  existingUsers,
  onComplete,
  onCancel
}) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (googleUser) {
      const existing = existingUsers.find(
        (u) =>
          (u.email && u.email.toLowerCase() === googleUser.email.toLowerCase()) ||
          u.uid === googleUser.uid
      );

      if (existing) {
        setDisplayName(existing.displayName || googleUser.displayName || 'کاربر گیک');
        setUsername(existing.username || googleUser.email.split('@')[0] || 'user');
      } else {
        setDisplayName(googleUser.displayName || 'کاربر گیک');
        // Generate initial suggested username from email prefix
        const emailPrefix = googleUser.email.split('@')[0] || '';
        const cleanPrefix = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        setUsername(cleanPrefix || 'user_' + Math.floor(Math.random() * 1000));
      }
      setError('');
    }
  }, [googleUser, existingUsers]);

  if (!isOpen || !googleUser) return null;

  const isSuperAdmin = googleUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase();

    if (!cleanUsername) {
      setError('لطفاً یک نام کاربری وارد نمایید.');
      return;
    }

    if (cleanUsername.length < 3) {
      setError('نام کاربری باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setError('نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط (_) باشد.');
      return;
    }

    // Check if username is taken by another user (excluding current uid / email)
    const isTaken = existingUsers.some(
      (u) =>
        u.username?.toLowerCase() === cleanUsername &&
        u.uid !== googleUser.uid &&
        u.email?.toLowerCase() !== googleUser.email.toLowerCase()
    );

    if (isTaken) {
      setError('این نام کاربری قبلاً توسط کاربر دیگری انتخاب شده است. لطفاً نام دیگری برگزینید.');
      return;
    }

    const existing = existingUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === googleUser.email.toLowerCase()) ||
        u.uid === googleUser.uid
    );

    const finalProfile: UserProfile = {
      ...(existing || {}),
      uid: isSuperAdmin ? 'admin-super-3dsaz' : (existing?.uid || googleUser.uid),
      displayName: displayName.trim() || googleUser.displayName || 'کاربر گیک',
      username: cleanUsername,
      email: googleUser.email,
      photoURL: googleUser.photoURL || existing?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      hideEmail: existing?.hideEmail ?? false,
      allowProfileComments: existing?.allowProfileComments ?? true,
      isAdmin: isSuperAdmin ? true : Boolean(existing?.isAdmin),
      autoApproveContent: isSuperAdmin ? true : Boolean(existing?.autoApproveContent),
      role: isSuperAdmin ? 'مدیر کل سایت (Super Admin)' : (existing?.role || 'کاربر عضو'),
      bio: existing?.bio || (isSuperAdmin ? 'مدیر کل و بنیان‌گذار وب‌سایت 👑' : 'علاقه‌مند به تکنولوژی و رسانه گیک کلاب 🚀'),
      joinedAt: existing?.joinedAt || 'مهر ۱۴۰۵'
    };

    onComplete(finalProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/30 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-100">
                  تایید هویت موفق با گوگل
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  تایید شد ✓
                </span>
              </div>
              <p className="text-xs text-slate-400">
                حساب کاربری شما توسط گوگل اعتبارسنجی شد
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Authenticated Google Account Info */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-3">
            <img
              src={googleUser.photoURL}
              alt={googleUser.displayName}
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-indigo-500/40 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-200 truncate">
                  {googleUser.displayName}
                </span>
                {isSuperAdmin && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                    مدیر کل
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-400 dir-ltr text-right block truncate">
                {googleUser.email}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              تعیین نام کاربری (Username)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              لطفاً یک نام کاربری انگلیسی برای نمایه و آدرس اختصاصی خود انتخاب کنید:
            </p>
          </div>

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-indigo-400" />
              <span>نام کاربری شما در سایت:</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-indigo-400 font-bold text-sm">
                @
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setError('');
                }}
                placeholder="username"
                className="w-full pr-8 pl-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono dir-ltr text-right"
              />
            </div>
            <span className="text-[10px] text-slate-500 block">
              تنها از حروف کوچک انگلیسی (a-z)، اعداد و زیرخط (_) استفاده کنید.
            </span>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>نام نمایشی (فارسی یا انگلیسی):</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="نام و نام خانوادگی"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-98"
            >
              <span>تکمیل ثبت‌نام و ورود به سایت</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              انصراف و خروج
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
