import React, { useState } from 'react';
import { 
  Youtube, 
  Instagram, 
  Newspaper, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ExternalLink, 
  Play, 
  Clock, 
  Check, 
  BookOpen,
  Volume2,
  Maximize2,
  Trash2,
  Video
} from 'lucide-react';
import { ContentItem, ViewMode, UserProfile } from '../types/content';

interface ContentCardProps {
  item: ContentItem;
  viewMode: ViewMode;
  currentUser?: UserProfile | null;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onOpenComments: (item: ContentItem) => void;
  onOpenArticleReader: (item: ContentItem) => void;
  onToggleSave: (id: string) => void;
  onShare: (item: ContentItem) => void;
  onTagClick: (tag: string) => void;
  onDeleteContent?: (id: string) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  viewMode,
  currentUser,
  onLike,
  onDislike,
  onOpenComments,
  onOpenArticleReader,
  onToggleSave,
  onShare,
  onTagClick,
  onDeleteContent
}) => {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Check if current user is author of post or admin
  const isAuthor = Boolean(
    currentUser && (
      currentUser.displayName === item.author.name ||
      currentUser.username === item.author.handle?.replace('@', '') ||
      (item.authorUid && currentUser.uid === item.authorUid)
    )
  );
  const canDelete = Boolean(currentUser && (currentUser.isAdmin || isAuthor));

  const handleShare = () => {
    onShare(item);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Platform specific M3 badges & styles
  const getPlatformMeta = () => {
    switch (item.platform) {
      case 'youtube':
        return {
          icon: <Youtube className="w-3 h-3 text-red-400" />,
          label: 'یوتیوب',
          badgeBg: 'bg-slate-800/80 text-slate-200 border border-slate-700/60 shadow-md',
          accentColor: 'hover:border-red-500/60'
        };
      case 'instagram':
        return {
          icon: <Instagram className="w-3 h-3 text-pink-400" />,
          label: 'اینستاگرام',
          badgeBg: 'bg-slate-800/80 text-slate-200 border border-slate-700/60 shadow-md',
          accentColor: 'hover:border-pink-500/60'
        };
      case 'article':
        return {
          icon: <Newspaper className="w-3 h-3 text-emerald-400" />,
          label: 'مقاله وب',
          badgeBg: 'bg-slate-800/80 text-slate-200 border border-slate-700/60 shadow-md',
          accentColor: 'hover:border-emerald-500/60'
        };
      case 'aparat':
        return {
          icon: <Video className="w-3 h-3 text-rose-400" />,
          label: 'آپارات',
          badgeBg: 'bg-slate-800/80 text-slate-200 border border-slate-700/60 shadow-md',
          accentColor: 'hover:border-rose-500/60'
        };
    }
  };

  const meta = getPlatformMeta();

  return (
    <article className={`group flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-[1.75rem] overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 ${meta.accentColor} ${
      viewMode === 'compact' ? 'sm:flex-row' : ''
    }`}>
      {/* Media / Embed Container */}
      <div className={`relative bg-slate-950 overflow-hidden ${
        viewMode === 'compact' 
          ? 'sm:w-64 sm:shrink-0 aspect-video sm:aspect-auto' 
          : 'aspect-video w-full'
      }`}>
        {item.platform === 'youtube' && (
          <>
            {isPlayingVideo ? (
              <iframe
                src={`${item.embedUrl}?autoplay=1&rel=0`}
                title={item.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div 
                className="relative w-full h-full cursor-pointer group/media"
                onClick={() => setIsPlayingVideo(true)}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105 opacity-90 group-hover/media:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-black/30" />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div style={{ backgroundColor: "oklch(0.592 0.249 0.584)" }} className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center shadow-xl shadow-[oklch(0.592_0.249_0.584)]/40 group-hover/media:scale-110 transition-all duration-300 backdrop-blur-sm">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {item.platform === 'instagram' && (
          <>
            {isPlayingVideo ? (
              <iframe
                src={`https://www.instagram.com/p/${item.url.split('/p/')[1]?.split('/')[0] || item.url.split('/reel/')[1]?.split('/')[0] || 'DZfG1Nui61u'}/embed`}
                title={item.title}
                className="w-full h-full border-0"
                allowFullScreen
              />
            ) : (
              <div 
                className="relative w-full h-full cursor-pointer group/ig"
                onClick={() => setIsPlayingVideo(true)}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/ig:scale-105 opacity-90 group-hover/ig:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-4">
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div style={{ backgroundColor: "oklch(0.592 0.249 0.584)" }} className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center shadow-xl shadow-[oklch(0.592_0.249_0.584)]/40 group-hover/ig:scale-110 transition-all duration-300 backdrop-blur-sm">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {item.platform === 'aparat' && (
          <>
            {isPlayingVideo ? (
              <iframe
                src={item.embedUrl}
                title={item.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div 
                className="relative w-full h-full cursor-pointer group/media"
                onClick={() => setIsPlayingVideo(true)}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105 opacity-90 group-hover/media:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div style={{ backgroundColor: "oklch(0.592 0.249 0.584)" }} className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center shadow-xl shadow-[oklch(0.592_0.249_0.584)]/40 group-hover/media:scale-110 transition-all duration-300 backdrop-blur-sm">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {item.platform === 'article' && (
          <div 
            className="relative w-full h-full cursor-pointer group/art"
            onClick={() => onOpenArticleReader(item)}
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-105 opacity-85 group-hover/art:opacity-100"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/30" />
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity duration-300">
              <div className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-xl shadow-emerald-600/40 transform translate-y-2 group-hover/art:translate-y-0 transition-transform">
                <BookOpen className="w-4 h-4" />
                مطالعه مقاله
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Pending Status */}
        {item.approvalStatus === 'pending' && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md animate-pulse">
              <Clock className="w-3 h-3 text-slate-950" />
              در انتظار بررسی
            </span>
          </div>
        )}

        {/* Bottom-Left Platform Source Link (Icon Only) */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 left-2 z-10 inline-flex items-center justify-center p-1 rounded-md bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/60 backdrop-blur-md transition-all hover:scale-105 shadow-md"
          title={`مشاهده منبع در ${meta.label}`}
          aria-label={`مشاهده منبع در ${meta.label}`}
        >
          {meta.icon}
        </a>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-slate-900/95 backdrop-blur-xl">
        <div>
          {/* Author & Published Info - Unboxed Text Metadata */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2.5">
              <img
                src={item.author.avatar}
                alt={item.author.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-200">
                    {item.author.name}
                  </span>
                  {item.author.isVerified && (
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                {item.author.handle && (
                  <span className="text-[10px] text-slate-400 block dir-ltr text-right font-mono">
                    {item.author.handle}
                  </span>
                )}
              </div>
            </div>

            <span className="text-[11px] text-slate-400 shrink-0 font-medium">
              {item.publishedAt}
            </span>
          </div>

          {/* Title */}
          <h3 
            className="text-base sm:text-lg font-black text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-relaxed cursor-pointer"
            onClick={() => {
              if (item.platform === 'article') {
                onOpenArticleReader(item);
              } else if (item.platform === 'youtube' || item.platform === 'aparat') {
                setIsPlayingVideo(true);
              }
            }}
          >
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-400 line-clamp-3 mt-2 leading-relaxed sm:leading-loose">
            {item.description}
          </p>

          {/* Tags - Quiet Unboxed Text Buttons */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="text-[11px] font-semibold text-slate-400 hover:text-indigo-300 hover:underline transition cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* M3 Joined Reaction Bar & Action Controls */}
        <div className="pt-3.5 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {/* M3 Segmented Reaction Controls (Like / Dislike) */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-1">
            {/* Like */}
            <button
              onClick={() => onLike(item.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                item.userReaction === 'like'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-750'
              }`}
              title="پسندیدم (لایک)"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${item.userReaction === 'like' ? 'fill-white' : ''}`} />
              <span className="font-mono">{item.likesCount}</span>
            </button>

            {/* Separator */}
            <span className="w-px h-3.5 bg-slate-700/80 mx-0.5"></span>

            {/* Dislike */}
            <button
              onClick={() => onDislike(item.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                item.userReaction === 'dislike'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-rose-400 hover:bg-slate-750'
              }`}
              title="نپسندیدم (دیس‌لایک)"
            >
              <ThumbsDown className={`w-3.5 h-3.5 ${item.userReaction === 'dislike' ? 'fill-white' : ''}`} />
              <span className="font-mono">{item.dislikesCount}</span>
            </button>
          </div>

          {/* Action Buttons: Comments, Bookmark, Share */}
          <div className="flex items-center gap-1.5">
            {/* Comments button */}
            <button
              onClick={() => onOpenComments(item)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-indigo-300 border border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="مشاهده و ثبت نظر"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono">{item.commentsCount}</span>
            </button>

            {/* Bookmark button */}
            <button
              onClick={() => onToggleSave(item.id)}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                item.saved
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white border-slate-700/60'
              }`}
              title={item.saved ? 'حذف از ذخیره‌ها' : 'ذخیره محتوا'}
            >
              <Bookmark className={`w-4 h-4 ${item.saved ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700/60 transition cursor-pointer"
              title="کپی لینک اشتراک"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            {/* Delete button (Author or Admin) */}
            {canDelete && onDeleteContent && (
              <button
                onClick={() => {
                  if (confirm('آیا از انتقال این محتوا به سطل بازیافت اطمینان دارید؟ (این محتوا در حافظه باقی می‌ماند و قابل بازگردانی است)')) {
                    onDeleteContent(item.id);
                  }
                }}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition cursor-pointer"
                title="حذف و انتقال به سطل بازیافت (قابل بازگردانی)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

