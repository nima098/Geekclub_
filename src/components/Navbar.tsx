import React, { useState, useRef, useEffect } from 'react';
import { 
  Share2, 
  PlusCircle, 
  LogIn, 
  LogOut, 
  Youtube, 
  Instagram, 
  Newspaper, 
  Check, 
  Sparkles,
  User as UserIcon,
  Bookmark,
  Inbox,
  MessageSquarePlus,
  ShieldCheck,
  Crown,
  Video,
  Sun,
  Moon,
  Rss
} from 'lucide-react';
import { UserProfile } from '../types/content';
import { PWAInstallButton } from './PWAInstallButton';
import { handleImageError, FALLBACK_IMAGES } from '../utils/imageHelper';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAddModal: () => void;
  onStartGoogleLogin: () => void;
  isLoggingIn?: boolean;
  onOpenProfileModal: () => void;
  onOpenFeedbackModal: () => void;
  onOpenAdminModal: () => void;
  onOpenRSSModal?: () => void;
  onLogout: () => void;
  savedCount: number;
  unreadInboxCount: number;
  onToggleSavedOnly: () => void;
  showSavedOnly: boolean;
  totalItemsCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAddModal,
  onStartGoogleLogin,
  isLoggingIn = false,
  onOpenProfileModal,
  onOpenFeedbackModal,
  onOpenAdminModal,
  onOpenRSSModal,
  onLogout,
  savedCount,
  unreadInboxCount,
  onToggleSavedOnly,
  showSavedOnly,
  totalItemsCount,
  theme,
  onToggleTheme
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileMenu]);

  return (
    <header className="sticky top-0 z-30 w-full max-w-full overflow-x-clip bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 shadow-md shadow-slate-950/20">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-1.5 sm:gap-4 w-full min-w-0">
        {/* Brand & Wordmark Zone */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#0077d9] text-white flex items-center justify-center shadow-lg shadow-[#0077d9]/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-xl font-black text-slate-100 tracking-tight whitespace-nowrap">
                گیک کلاب
              </span>
            </div>
          </div>

          {/* Theme Mode Toggle Button (Sun / Moon) */}
          <button
            onClick={onToggleTheme}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 shrink-0 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700/60 transition cursor-pointer flex items-center justify-center group"
            title={theme === 'dark' ? 'تغییر به حالت روشن (Light Mode)' : 'تغییر به حالت تاریک (Dark Mode)'}
            aria-label="تغییر پوسته"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300 transition-transform duration-300 group-hover:-rotate-12" />
            )}
          </button>
        </div>

        {/* Action Controls & User Account Zone */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">

          {/* Feedback & Suggestions Button */}
          {user && (
            <button
              onClick={onOpenFeedbackModal}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-sky-300 border border-slate-700/60 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="ثبت انتقادات و پیشنهادات"
            >
              <MessageSquarePlus className="w-4 h-4 text-[#0077d9]" />
              <span className="hidden lg:inline">انتقادات و پیشنهادات</span>
            </button>
          )}

          {/* RSS Feed Button - Admin Only */}
          {Boolean(user?.isAdmin || user?.email?.toLowerCase() === '3dsaz1990@gmail.com') && (
            <button
              onClick={onOpenRSSModal}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700/60 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="فید خبرخوان RSS سایت"
            >
              <Rss className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline">فید RSS</span>
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Primary Material Add Content Button */}
          <button
            onClick={onOpenAddModal}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#0077d9] hover:bg-[#0066bd] active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow-lg shadow-[#0077d9]/30 transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-white fill-none" />
            <span className="whitespace-nowrap text-white">اشتراک محتوا</span>
          </button>

          {/* Google Auth / User Profile */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 transition cursor-pointer text-right"
              >
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-slate-100 truncate max-w-[100px]">
                    {user.displayName}
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/60 shadow-sm"
                    onError={(e) => handleImageError(e, FALLBACK_IMAGES.avatar)}
                  />
                  {unreadInboxCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-200 text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-900">
                      {unreadInboxCount}
                    </span>
                  )}
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-slate-800 space-y-1">
                      <p className="text-[11px] font-medium text-slate-400">نمایه کاربری گیک کلاب</p>
                      <p className="text-sm font-bold text-slate-100 truncate">{user.displayName}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 dir-ltr">@{user.username || 'user'}</span>
                        {user.hideEmail ? (
                          <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded font-medium border border-slate-700/60">
                            ایمیل مخفی
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono dir-ltr truncate max-w-[130px]">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          onToggleTheme();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          {theme === 'dark' ? (
                            <Sun className="w-4 h-4 text-slate-300" />
                          ) : (
                            <Moon className="w-4 h-4 text-slate-300" />
                          )}
                          پوسته (حالت {theme === 'dark' ? 'روشن' : 'تاریک'})
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenProfileModal();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-slate-300" />
                          ویرایش نمایه و حریم خصوصی
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onToggleSavedOnly();
                        }}
                        className={`w-full text-right px-3 py-2 text-xs rounded-xl flex items-center justify-between transition cursor-pointer ${
                          showSavedOnly 
                            ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30' 
                            : 'text-slate-200 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Bookmark className={`w-4 h-4 ${showSavedOnly ? 'text-amber-400 fill-amber-400/20' : 'text-slate-300'}`} />
                          لیست محتواهای ذخیره‌شده
                        </span>
                        {savedCount > 0 && (
                          <span className="text-[10px] bg-slate-800 text-amber-300 border border-slate-700/60 font-bold px-2 py-0.5 rounded-full">
                            {savedCount} مورد
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenProfileModal();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Inbox className="w-4 h-4 text-slate-300" />
                          صندوق پیام‌ها
                        </span>
                        {unreadInboxCount > 0 && (
                          <span className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700/60 font-bold px-1.5 py-0.2 rounded-full">
                            {unreadInboxCount} جدید
                          </span>
                        )}
                      </button>

                      {user.isAdmin ? (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenAdminModal();
                          }}
                          className="w-full text-right px-3 py-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl flex items-center justify-between transition cursor-pointer font-bold border border-amber-500/20"
                        >
                          <span className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-400" />
                            پنل مدیریت کل سایت
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenAdminModal();
                          }}
                          className="w-full text-right px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-slate-400" />
                            ورود به پنل مدیریت (Admin)
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onStartGoogleLogin();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 text-slate-300" />
                        تغییر یا مدیریت حساب گوگل
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition mt-1 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-slate-300" />
                        خروج از حساب
                      </button>
                    </div>
                  </div>
              )}
            </div>
          ) : (
            <button
              onClick={onStartGoogleLogin}
              disabled={isLoggingIn}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-75 text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin shrink-0" />
                  <span>در حال اتصال...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span className="whitespace-nowrap">ورود با گوگل</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

