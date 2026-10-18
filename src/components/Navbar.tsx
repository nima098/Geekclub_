import React, { useState } from 'react';
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
  Crown
} from 'lucide-react';
import { UserProfile } from '../types/content';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAddModal: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  onOpenFeedbackModal: () => void;
  onOpenAdminModal: () => void;
  onLogout: () => void;
  savedCount: number;
  unreadInboxCount: number;
  onToggleSavedOnly: () => void;
  showSavedOnly: boolean;
  totalItemsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAddModal,
  onOpenAuthModal,
  onOpenProfileModal,
  onOpenFeedbackModal,
  onOpenAdminModal,
  onLogout,
  savedCount,
  unreadInboxCount,
  onToggleSavedOnly,
  showSavedOnly,
  totalItemsCount
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  گیک کلاب
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  GeekClub
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                اشتراک یوتیوب، اینستاگرام و مقالات وب
              </p>
            </div>
          </div>

          {/* Quick Platform Icons */}
          <div className="hidden md:flex items-center gap-1.5 pr-4 border-r border-slate-800">
            <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg">
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              یوتیوب
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg">
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              اینستاگرام
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg">
              <Newspaper className="w-3.5 h-3.5 text-emerald-500" />
              مقالات
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Saved Items Toggle */}
          <button
            onClick={onToggleSavedOnly}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              showSavedOnly 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10' 
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
            title="نشان‌شده‌ها"
          >
            <Bookmark className={`w-4 h-4 ${showSavedOnly ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">ذخیره‌ها</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">
                {savedCount}
              </span>
            )}
          </button>

          {/* Feedback & Suggestions Button (For both Guests and Registered Users) */}
          <button
            onClick={onOpenFeedbackModal}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-pink-300 border border-slate-700/60 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="ثبت انتقادات و پیشنهادات"
          >
            <MessageSquarePlus className="w-4 h-4 text-pink-400" />
            <span className="hidden lg:inline">انتقادات و پیشنهادات</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Add Content Button */}
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>اشتراک محتوا</span>
          </button>

          {/* Google Auth / Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 transition cursor-pointer text-right relative"
              >
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[110px]">
                    {user.displayName}
                  </div>
                  <div className="text-[10px] text-indigo-400 font-mono dir-ltr text-right">
                    @{user.username || 'user'}
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/50"
                  />
                  {unreadInboxCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                      {unreadInboxCount}
                    </span>
                  )}
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-xs text-slate-400">نمایه کاربری گیک کلاب:</p>
                    <p className="text-sm font-bold text-white truncate mt-0.5">{user.displayName}</p>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="font-mono text-indigo-400 dir-ltr">@{user.username || 'user'}</span>
                      {user.hideEmail ? (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
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
                        setShowProfileMenu(false);
                        onOpenProfileModal();
                      }}
                      className="w-full text-right px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-indigo-400" />
                        ویرایش نمایه و حریم خصوصی
                      </span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        تنظیمات
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
                        <Inbox className="w-4 h-4 text-pink-400" />
                        صندوق پیام‌ها (این‌باکس)
                      </span>
                      {unreadInboxCount > 0 && (
                        <span className="text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                          {unreadInboxCount} جدید
                        </span>
                      )}
                    </button>

                    {user.isAdmin && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenAdminModal();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-amber-300 hover:text-white hover:bg-amber-500/20 rounded-xl flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-400" />
                          پنل ادمین و مدیریت سایت
                        </span>
                        <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                          مدیر
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenAuthModal();
                      }}
                      className="w-full text-right px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-slate-400" />
                      تغییر یا مدیریت حساب گوگل
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full text-right px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-2 transition mt-1 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      خروج از حساب
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {/* Google G Icon */}
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
              <span>ورود با گوگل</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
