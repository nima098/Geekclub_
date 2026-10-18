import React from 'react';
import { 
  X, 
  ExternalLink, 
  BookOpen, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { ContentItem } from '../types/content';

interface ArticleReaderModalProps {
  item: ContentItem | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onOpenComments: (item: ContentItem) => void;
  onToggleSave: (id: string) => void;
  onShare: (item: ContentItem) => void;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  item,
  onClose,
  onLike,
  onDislike,
  onOpenComments,
  onToggleSave,
  onShare
}) => {
  if (!item || item.platform !== 'article') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              حالت خوانش مقاله (Reader View)
            </span>
            {item.sourceDomain && (
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                منبع: {item.sourceDomain}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="مشاهده در وبسایت اصلی"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">وبسایت اصلی</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Article Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Header section */}
          <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-relaxed">
              {item.title}
            </h1>

            {/* Author & Meta */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={item.author.avatar}
                  alt={item.author.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-200 text-sm">
                    {item.author.name}
                    {item.author.isVerified && (
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  {item.author.handle && (
                    <span className="text-xs text-slate-400">
                      {item.author.handle}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {item.readingOrWatchTime}
                </span>
                <span>{item.publishedAt}</span>
              </div>
            </div>

            {/* Featured Image */}
            <div className="rounded-2xl overflow-hidden aspect-video max-h-72 w-full border border-slate-800">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Article Full Text */}
          <div className="prose prose-invert max-w-none space-y-4 text-slate-300 text-sm sm:text-base leading-loose sm:leading-[2.1] whitespace-pre-line">
            {item.articleContent || item.description}
          </div>

          {/* Tags */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Like */}
            <button
              onClick={() => onLike(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                item.userReaction === 'like'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              پسندیدم ({item.likesCount})
            </button>

            {/* Dislike */}
            <button
              onClick={() => onDislike(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                item.userReaction === 'dislike'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              ({item.dislikesCount})
            </button>

            {/* Comments button */}
            <button
              onClick={() => {
                onClose();
                onOpenComments(item);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              نظرات ({item.commentsCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(item.id)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                item.saved
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="ذخیره"
            >
              <Bookmark className={`w-4 h-4 ${item.saved ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => onShare(item)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="اشتراک‌گذاری"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
