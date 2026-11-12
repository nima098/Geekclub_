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
  Play, 
  Clock, 
  Check, 
  BookOpen,
  Trash2,
  Video,
  RotateCcw,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Film
} from 'lucide-react';
import { ContentItem, ViewMode, UserProfile, MediaSlide, shouldDisplayTitle } from '../../types/content';
import { handleImageError, getPlatformFallbackImage, resolveCoverImageUrl } from '../../utils/imageHelper';

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
  onRestoreContent?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
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
  onDeleteContent,
  onRestoreContent,
  onPermanentDelete
}) => {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Check if current user is admin or author of post
  const isAdmin = Boolean(
    currentUser && (
      currentUser.isAdmin === true ||
      currentUser.role === 'super_admin' ||
      currentUser.role?.includes('admin') ||
      currentUser.email?.toLowerCase() === '3dsaz1990@gmail.com'
    )
  );

  const isAuthor = Boolean(
    currentUser && (
      currentUser.displayName === item.author.name ||
      currentUser.username === item.author.handle?.replace('@', '') ||
      (item.authorUid && currentUser.uid === item.authorUid)
    )
  );
  const canDelete = isAdmin || isAuthor;

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
          icon: <Youtube className="w-5 h-5 text-white" />,
          label: 'یوتیوب',
          badgeBg: 'gc-chip-platform-youtube px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-red-500/60'
        };
      case 'instagram':
        return {
          icon: <Instagram className="w-5 h-5 text-white" />,
          label: 'اینستاگرام',
          badgeBg: 'gc-chip-platform-instagram px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-pink-500/60'
        };
      case 'article':
        return {
          icon: <Newspaper className="w-5 h-5 text-white" />,
          label: 'مقاله وب',
          badgeBg: 'gc-chip-platform-article px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-emerald-500/60'
        };
      case 'aparat':
        return {
          icon: <Video className="w-5 h-5 text-white" />,
          label: 'آپارات',
          badgeBg: 'gc-chip-platform-aparat px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-rose-500/60'
        };
    }
  };

  const meta = getPlatformMeta();

  // Resolve username of the person who shared the content
  const sharerUsername = 
    item.sharedBy?.username
      ? (item.sharedBy.username.startsWith('@') ? item.sharedBy.username : `@${item.sharedBy.username}`)
      : (item.author.handle 
          ? (item.author.handle.startsWith('@') ? item.author.handle : `@${item.author.handle}`)
          : (item.author.name?.startsWith('@') ? item.author.name : `@${(item.author.name || 'user').replace(/\s+/g, '_').toLowerCase()}`));

  const sharerDisplayName = item.sharedBy?.name || item.author.name;

  return (
    <article id={item.id} className={`group flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-[1.75rem] overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 ${meta.accentColor} ${
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
                onClick={() => onOpenArticleReader(item)}
              >
                <img
                  src={resolveCoverImageUrl(item.thumbnail)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105 opacity-90 group-hover/media:opacity-100"
                  decoding="async"
                  onError={(e) => handleImageError(e, getPlatformFallbackImage('youtube', item.url), 'youtube', item.id)}
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

        {item.platform === 'instagram' && (() => {
          // Normalize slides list
          const slideList: MediaSlide[] = (item.slides && item.slides.length > 0)
            ? item.slides
            : (item.images && item.images.length > 1)
              ? item.images.map((img) => ({ type: 'image' as const, url: img }))
              : item.videoUrl
                ? [{ type: 'video' as const, url: item.videoUrl, thumbnail: item.thumbnail }]
                : [{ type: 'image' as const, url: item.thumbnail }];

          const activeSlide = slideList[activeSlideIndex] || slideList[0];
          const hasMultipleSlides = slideList.length > 1;

          return (
            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center group/ig">
              {/* Media Display */}
              {activeSlide.type === 'video' ? (
                isPlayingVideo ? (
                  <div className="relative w-full h-full bg-black flex items-center justify-center">
                    <video
                      src={activeSlide.url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPlayingVideo(false);
                      }}
                      className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-xs transition cursor-pointer backdrop-blur-md border border-white/20"
                      title="بستن پخش ویدیو"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center bg-slate-950"
                    onClick={() => onOpenArticleReader(item)}
                  >
                    {/* لایه پس‌زمینه محو */}
                    <img
                      src={activeSlide.thumbnail || item.thumbnail}
                      alt=""
                      aria-hidden="true"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60 pointer-events-none"
                    />
                    {/* روکش تیره ملایم */}
                    <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                    {/* تصویر اصلی بدون برش */}
                    <img
                      src={activeSlide.thumbnail || item.thumbnail}
                      alt={item.title}
                      className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-500 group-hover/ig:scale-105 opacity-95 group-hover/ig:opacity-100 drop-shadow-md"
                      decoding="async"
                      onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div style={{ backgroundColor: "oklch(0.592 0.249 0.584)" }} className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center shadow-xl shadow-[oklch(0.592_0.249_0.584)]/40 group-hover/ig:scale-110 transition-all duration-300 backdrop-blur-sm">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div 
                  className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center bg-slate-950"
                  onClick={() => onOpenArticleReader(item)}
                >
                  {/* لایه پس‌زمینه محو */}
                  <img
                    src={activeSlide.url}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60 pointer-events-none"
                  />
                  {/* روکش تیره ملایم */}
                  <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                  {/* تصویر اصلی بدون برش */}
                  <img
                    src={activeSlide.url}
                    alt={`${item.title} - اسلاید ${activeSlideIndex + 1}`}
                    className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-500 group-hover/ig:scale-105 opacity-95 group-hover/ig:opacity-100 drop-shadow-md"
                    decoding="async"
                    onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                  />
                </div>
              )}

              {/* Multi-Slide Navigation Controls */}
              {hasMultipleSlides && (
                <>
                  {/* Previous Slide Button (Right side in RTL) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlayingVideo(false);
                      setActiveSlideIndex((prev) => (prev - 1 + slideList.length) % slideList.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer opacity-80 hover:opacity-100"
                    title="اسلاید قبلی"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Next Slide Button (Left side in RTL) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlayingVideo(false);
                      setActiveSlideIndex((prev) => (prev + 1) % slideList.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer opacity-80 hover:opacity-100"
                    title="اسلاید بعدی"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Dots Indicator */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/75 border border-slate-800/80 backdrop-blur-md shadow-lg">
                    {slideList.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPlayingVideo(false);
                          setActiveSlideIndex(idx);
                        }}
                        className={`transition-all rounded-full cursor-pointer ${
                          idx === activeSlideIndex
                            ? 'w-4 h-1.5 bg-pink-400'
                            : 'w-1.5 h-1.5 bg-slate-500 hover:bg-slate-300'
                        }`}
                        title={`اسلاید ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Slide Counter Badge Top-Right */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900/85 text-pink-300 border border-pink-500/30 flex items-center gap-1 shadow-md backdrop-blur-md">
                      <Layers className="w-3 h-3 text-pink-400" />
                      اسلاید {activeSlideIndex + 1} از {slideList.length}
                    </span>
                  </div>
                </>
              )}

              {/* CDN Media Badge Top-Left */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-600/90 text-white flex items-center gap-1 shadow-md backdrop-blur-md border border-emerald-400/30">
                  <Video className="w-3 h-3 text-emerald-200" />
                  {hasMultipleSlides ? 'اسلایدهای CDN' : (item.videoUrl ? 'ویدیو روی CDN' : 'عکس روی CDN')}
                </span>
              </div>
            </div>
          );
        })()}

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
                onClick={() => onOpenArticleReader(item)}
              >
                <img
                  src={resolveCoverImageUrl(item.thumbnail)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105 opacity-90 group-hover/media:opacity-100"
                  loading="lazy"
                  onError={(e) => handleImageError(e, getPlatformFallbackImage('aparat', item.url), 'aparat', item.id)}
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
              src={resolveCoverImageUrl(item.thumbnail)}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-105 opacity-85 group-hover/art:opacity-100"
              loading="lazy"
              onError={(e) => handleImageError(e, getPlatformFallbackImage('article', item.url), 'article', item.id)}
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

        {/* Top-Left Live Enriching Badge */}
        {item.needsEnrichment && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-indigo-600/90 text-white flex items-center gap-1.5 shadow-md backdrop-blur-md animate-pulse border border-indigo-400/30">
              <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
              {item.platform === 'instagram' 
                ? 'در حال دریافت و ذخیره ویدیو از اینستاگرام...' 
                : 'در حال دریافت عکس و اطلاعات مبدا...'}
            </span>
          </div>
        )}

      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-slate-900/95 backdrop-blur-xl">
        <div className="space-y-3">
          {/* Author & Published Info - Unboxed Text Metadata */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2.5">
              <img
                src={item.author.avatar}
                alt={item.author.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/30"
                onError={(e) => handleImageError(e, getPlatformFallbackImage('avatar'))}
              />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="content-card-author-name text-xs font-bold text-slate-200">
                    {sharerDisplayName || sharerUsername}
                  </span>
                  {item.author.isVerified && (
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-bold" title="حساب تایید شده">
                      ✓
                    </span>
                  )}
                </div>
                <span className="content-card-source-platform text-[10px] text-slate-400 flex items-center gap-1.5 text-right">
                  <span className="font-mono dir-ltr">{sharerUsername}</span>
                  <span>•</span>
                  <span className="inline-flex items-center text-slate-300" title={meta?.label}>
                    {meta?.icon}
                  </span>
                </span>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 shrink-0 font-medium">
              {item.publishedAt}
            </span>
          </div>

          {/* Title */}
          {shouldDisplayTitle(item) && (
            <h3 
              className="text-base sm:text-lg font-black text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-relaxed cursor-pointer"
              onClick={() => onOpenArticleReader(item)}
            >
              {item.title}
            </h3>
          )}

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-400 line-clamp-3 mt-2 leading-relaxed sm:leading-loose">
            {item.description}
          </p>
        </div>

        {/* Tags & Actions Bottom Block */}
        <div className="mt-auto pt-6">
          {/* Tags - High-Contrast Chip Badges with maximum spacing */}
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {item.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="gc-tag-item px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* M3 Joined Reaction Bar & Action Controls */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
            {/* M3 Segmented Reaction Controls (Like / Dislike) */}
            <div className="flex items-center gap-0.5 bg-slate-800/80 border border-slate-700/60 rounded-xl p-0.5">
              {/* Like */}
              <button
                onClick={() => onLike(item.id)}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  item.userReaction === 'like'
                    ? 'gc-reaction-like-active'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
                title="پسندیدم (لایک)"
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${item.userReaction === 'like' ? 'fill-white text-white' : ''}`} />
                <span className="font-mono">{item.likesCount}</span>
              </button>

              {/* Separator */}
              <span className="w-px h-3 bg-slate-700/80 mx-0.25"></span>

              {/* Dislike */}
              <button
                onClick={() => onDislike(item.id)}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  item.userReaction === 'dislike'
                    ? 'gc-reaction-dislike-active'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
                title="نپسندیدم (دیس‌لایک)"
              >
                <ThumbsDown className={`w-3.5 h-3.5 ${item.userReaction === 'dislike' ? 'fill-white text-white' : ''}`} />
                <span className="font-mono">{item.dislikesCount}</span>
              </button>
            </div>

            {/* Action Buttons: Comments, Bookmark, Share */}
            <div className="flex items-center gap-1">
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

              {/* Admin-Only Delete button (Moves content to Trash Bin) */}
              {isAdmin && onDeleteContent && !(item.isDeleted || item.isArchived) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteContent(item.id);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:scale-95 text-rose-400 hover:text-rose-300 border border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm group"
                  title="حذف و انتقال به سطل زباله (مخصوص مدیریت)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span>حذف</span>
                </button>
              )}

              {/* Restore button (When viewing Trash as Admin) */}
              {isAdmin && (item.isDeleted || item.isArchived) && onRestoreContent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestoreContent(item.id);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 hover:text-emerald-100 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="بازگردانی محتوا از سطل زباله به صفحه اصلی"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>بازگردانی</span>
                </button>
              )}

              {/* Permanent Delete button (When viewing Trash as Admin) */}
              {isAdmin && (item.isDeleted || item.isArchived) && onPermanentDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPermanentDelete(item.id);
                  }}
                  className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 hover:text-rose-100 border border-rose-500/40 transition cursor-pointer"
                  title="حذف دائمی از دیتابیس"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
