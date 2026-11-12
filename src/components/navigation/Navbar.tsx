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
  Rss,
  Menu,
  X
} from 'lucide-react';
import { UserProfile } from '../../types/content';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { handleImageError, FALLBACK_IMAGES } from '../../utils/imageHelper';

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
  onGoHome?: () => void;
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
  onToggleTheme,
  onGoHome
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
        setIsMobileSidebarOpen(false);
      }
    };

    if (showProfileMenu || isMobileSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileMenu, isMobileSidebarOpen]);

  return (
    <header className="sticky top-0 z-30 w-full max-w-full overflow-x-clip bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 shadow-md shadow-slate-950/20 lg:pr-64">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-1.5 sm:gap-4 w-full min-w-0">
        {/* Brand & Wordmark Zone */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <a 
            href="/"
            className="flex items-center gap-3 cursor-pointer group no-underline text-inherit" 
            onClick={(e) => {
              e.preventDefault();
              if (onGoHome) {
                onGoHome();
              } else {
                window.history.pushState({}, '', '/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            title="صفحه اصلی گیک کلاب"
          >
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#0077d9] text-white flex items-center justify-center shadow-lg shadow-[#0077d9]/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-xl font-black text-slate-100 tracking-tight whitespace-nowrap hover:text-[#0077d9] transition-colors">
                گیک کلاب
              </span>
            </div>
          </a>
        </div>

        {/* Mobile Toggle Button for Sidebar */}
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="btn-sidebar-toggle-mobile p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 lg:hidden cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="باز کردن سایدبار دسترسی"
        >
          <Menu className="w-4 h-4 text-indigo-400" />
          <span>منوی میانبر</span>
        </button>

        {/* Mobile Sidebar Overlay Backdrop */}
        {isMobileSidebarOpen && (
          <div 
            className="right-sidebar-overlay fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Action Controls & User Account Zone - Transformed to Right Sidebar */}
        <div className={`right-actions-sidebar fixed right-0 top-0 bottom-0 z-40 w-64 sm:w-64 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/80 shadow-2xl p-4 sm:p-5 pt-5 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
          <div className="space-y-4">
            {/* Sidebar Title & Close Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0077d9]/20 text-[#0077d9] flex items-center justify-center border border-[#0077d9]/30">
                  <Share2 className="w-4 h-4 text-[#0077d9]" />
                </div>
                <span className="text-xs font-bold text-slate-200">منوی سایدبار گیک کلاب</span>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition lg:hidden cursor-pointer"
                title="بستن سایدبار"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Add Content Button */}
            <button
              onClick={() => {
                setIsMobileSidebarOpen(false);
                onOpenAddModal();
              }}
              className="btn-add-content-action w-full px-4 py-2.5 rounded-xl bg-[#0077d9] hover:bg-[#0066bd] active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0077d9]/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white fill-none" />
              <span className="whitespace-nowrap text-white">اشتراک محتوا</span>
            </button>

            {/* User Account / Profile Badge */}
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="btn-user-profile-action w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 transition cursor-pointer text-right"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/60 shadow-sm shrink-0"
                      onError={(e) => handleImageError(e, FALLBACK_IMAGES.avatar)}
                    />
                    <div className="text-right truncate">
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {user.displayName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate dir-ltr">
                        @{user.username || 'user'}
                      </div>
                    </div>
                  </div>
                  {unreadInboxCount > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-[#0077d9] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadInboxCount}
                    </span>
                  )}
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-full rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-800 space-y-1">
                      <p className="text-[11px] font-medium text-slate-400">نمایه کاربری گیک کلاب</p>
                      <p className="text-xs font-bold text-slate-100 truncate">{user.displayName}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setIsMobileSidebarOpen(false);
                          onOpenProfileModal();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-slate-300" />
                        ویرایش نمایه
                      </button>

                      <PWAInstallButton onCloseMenu={() => {
                        setShowProfileMenu(false);
                        setIsMobileSidebarOpen(false);
                      }} />

                      {user.isAdmin && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setIsMobileSidebarOpen(false);
                            onOpenAdminModal();
                          }}
                          className="w-full text-right px-3 py-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl flex items-center gap-2 transition cursor-pointer font-bold border border-amber-500/20"
                        >
                          <Crown className="w-4 h-4 text-amber-400" />
                          پنل مدیریت سایت
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setIsMobileSidebarOpen(false);
                          onLogout();
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl flex items-center gap-2 transition cursor-pointer"
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
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  onStartGoogleLogin();
                }}
                disabled={isLoggingIn}
                className="btn-login-action w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-75 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin shrink-0" />
                    <span>در حال اتصال...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span className="whitespace-nowrap">ورود با گوگل</span>
                  </>
                )}
              </button>
            )}

            {/* Sidebar Navigation Actions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400 px-1">دسترسی‌های سریع</p>

              {/* Theme Toggle Button */}
              <button
                onClick={onToggleTheme}
                className="btn-theme-toggle w-full text-right px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700/60 font-medium text-xs flex items-center justify-between transition cursor-pointer"
                title={theme === 'dark' ? 'تغییر به حالت روشن (Light Mode)' : 'تغییر به حالت تاریک (Dark Mode)'}
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-300" />
                  )}
                  <span>پوسته سایت</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                  {theme === 'dark' ? 'تاریک' : 'روشن'}
                </span>
              </button>

              {/* Feedback Button */}
              {user && (
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    onOpenFeedbackModal();
                  }}
                  className="btn-feedback-action w-full text-right px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-sky-300 border border-slate-700/60 font-medium text-xs flex items-center gap-2 transition cursor-pointer"
                  title="ثبت انتقادات و پیشنهادات"
                >
                  <MessageSquarePlus className="w-4 h-4 text-[#0077d9]" />
                  <span>انتقادات و پیشنهادات</span>
                </button>
              )}

              {/* Saved Items Button */}
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  onToggleSavedOnly();
                }}
                className={`btn-saved-action w-full text-right px-3.5 py-2.5 rounded-xl border font-medium text-xs flex items-center justify-between transition cursor-pointer ${
                  showSavedOnly 
                    ? 'bg-[#0077d9]/20 text-[#0077d9] border-[#0077d9]/40 font-bold' 
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/60'
                }`}
                title="نمایش مطالب ذخیره‌شده"
              >
                <span className="flex items-center gap-2">
                  <Bookmark className={`w-4 h-4 ${showSavedOnly ? 'text-[#0077d9] fill-[#0077d9]/20' : 'text-amber-400'}`} />
                  <span>محتواهای ذخیره‌شده</span>
                </span>
                {savedCount > 0 && (
                  <span className="text-[10px] bg-slate-900 text-amber-400 border border-slate-700/60 font-bold px-2 py-0.5 rounded-full">
                    {savedCount}
                  </span>
                )}
              </button>

              {/* RSS Feed Button - Admin Only */}
              {Boolean(user?.isAdmin || user?.email?.toLowerCase() === '3dsaz1990@gmail.com') && (
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    if (onOpenRSSModal) onOpenRSSModal();
                  }}
                  className="btn-rss-action w-full text-right px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700/60 font-medium text-xs flex items-center gap-2 transition cursor-pointer"
                  title="فید خبرخوان RSS سایت"
                >
                  <Rss className="w-4 h-4 text-amber-400" />
                  <span>فید خبرخوان RSS</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer Branding in Sidebar */}
          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[10px] text-slate-400">گیک کلاب © ۲۰۲۶</p>
            <p className="text-[9px] text-slate-500 mt-0.5">مرجع اخبار و ویدیوهای فناوری</p>
          </div>
        </div>
      </div>
    </header>
  );
};


