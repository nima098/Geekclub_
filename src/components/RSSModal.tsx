import React, { useState } from 'react';
import { 
  X, 
  Rss, 
  Copy, 
  Check, 
  ExternalLink, 
  Filter, 
  Sparkles, 
  Compass, 
  Youtube, 
  Instagram, 
  Video, 
  Newspaper,
  BookOpen
} from 'lucide-react';

interface RSSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RSSModal: React.FC<RSSModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://geekclub.ir';
  
  const getFeedUrl = (filter: string) => {
    const secretKey = 'key=YOUR_RSS_FEED_KEY'; // replace with the RSS_FEED_KEY value configured on the server
    if (filter === 'all') return `${origin}/api/rss?${secretKey}`;
    if (filter.startsWith('platform:')) {
      const p = filter.replace('platform:', '');
      return `${origin}/api/rss?platform=${p}&${secretKey}`;
    }
    if (filter.startsWith('category:')) {
      const c = filter.replace('category:', '');
      return `${origin}/api/rss?category=${c}&${secretKey}`;
    }
    return `${origin}/api/rss?${secretKey}`;
  };

  const activeUrl = getFeedUrl(selectedFilter);

  const handleCopy = (url: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const FEEDS = [
    { id: 'all', label: 'تمامی محتواها (جامع)', icon: <Rss className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'platform:youtube', label: 'ویدیوهای یوتیوب', icon: <Youtube className="w-3.5 h-3.5 text-red-400" /> },
    { id: 'platform:instagram', label: 'محتوای اینستاگرام', icon: <Instagram className="w-3.5 h-3.5 text-pink-400" /> },
    { id: 'platform:aparat', label: 'ویدیوهای آپارات', icon: <Video className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'platform:article', label: 'مقالات وب', icon: <Newspaper className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'category:ai', label: 'هوش مصنوعی', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'category:programming', label: 'برنامه‌نویسی', icon: <Compass className="w-3.5 h-3.5 text-blue-400" /> }
  ];

  return (
    <div 
      className="gc-rss-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="gc-rss-modal w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 my-auto text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gc-rss-header p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                فید هوشمند RSS گیک‌کلاب
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full">
                  RSS 2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                دریافت جدیدترین ویدیوها و مقالات در نرم‌افزارهای خبرخوان، تلگرام و ایمیل
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-close-rss-modal p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="gc-rss-body p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Main Feed Card */}
          <div className="gc-rss-main-feed p-4 sm:p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                <Rss className="w-4 h-4 text-amber-400" />
                آدرس مستقیم فید (برای نرم‌افزار خبرخوان شما):
              </span>
              <span className="text-[11px] text-slate-400 font-mono">XML Feed</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/70 p-2 sm:p-2.5 rounded-xl">
              <input
                type="text"
                id="rssUrlInput"
                name="rssUrl"
                readOnly
                value={activeUrl}
                className="input-rss-url flex-1 bg-transparent text-amber-300 font-mono text-xs dir-ltr focus:outline-none select-all px-1 truncate"
              />
              <button
                onClick={() => handleCopy(activeUrl, 'main')}
                className="btn-copy-rss-feed px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer shrink-0"
              >
                {copiedKey === 'main' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی لینک</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct Open and Reader Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>مشاهده فایل خام XML فید</span>
              </a>

              <a
                href={`https://feedly.com/i/subscription/feed/${encodeURIComponent(activeUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-feedly-subscribe px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <span>اشتراک در Feedly</span>
              </a>

              <a
                href={`https://www.inoreader.com/?add_feed=${encodeURIComponent(activeUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-inoreader-subscribe px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <span>اشتراک در Inoreader</span>
              </a>
            </div>
          </div>

          {/* Selective Category / Platform Feeds */}
          <div className="gc-rss-subfeeds space-y-2.5">
            <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>فیدهای تخصصی و دسته‌بندی‌شده:</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEEDS.map((feed) => {
                const url = getFeedUrl(feed.id);
                const isSelected = selectedFilter === feed.id;

                return (
                  <div
                    key={feed.id}
                    onClick={() => setSelectedFilter(feed.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-md'
                        : 'bg-slate-800/50 hover:bg-slate-800/90 border-slate-750 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {feed.icon}
                      <span className="font-medium text-xs truncate">{feed.label}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(url, feed.id);
                      }}
                      className="btn-copy-specific-feed p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition shrink-0 cursor-pointer"
                      title="کپی آدرس فید"
                    >
                      {copiedKey === feed.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Guide / Help */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2 text-xs text-slate-300 leading-relaxed">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>چگونه از این فید استفاده کنم؟</span>
            </h4>
            <p>
              آدرس فید بالا را کپی کرده و در نرم‌افزارهای خبرخوان محبوب نظیر <strong>Feedly</strong>، <strong>Inoreader</strong>، <strong>NetNewsWire</strong> یا ربات‌های تلگرامی فوروارد فید (مانند @FeedManBot) وارد نمایید تا به محض اشتراک‌گذاری هر محتوا یا ویدیوی جدید در گیک‌کلاب، مطلع شوید.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="gc-rss-footer p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-xl flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            فید RSS به صورت خودکار با تمام محتواهای جدید بروزرسانی می‌شود.
          </span>
          <button
            onClick={onClose}
            className="btn-close-rss-footer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
