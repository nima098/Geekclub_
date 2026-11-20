import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Layers,
  Film,
  Send
} from 'lucide-react';
import { ContentItem, ViewMode, UserProfile, MediaSlide, shouldDisplayTitle } from '../../types/content';
import { handleImageError, getPlatformFallbackImage, resolveCoverImageUrl } from '../../utils/imageHelper';
import { resolveContentSource } from '../../utils/sourceHelper';

interface ContentCardProps {
  item: ContentItem;
  viewMode: ViewMode;
  currentUser?: UserProfile | null;
  usersList?: UserProfile[];
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
  usersList,
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
  const HOVER_REVEAL_DELAY_MS = 240;
  const HOVER_COLLAPSE_DURATION_MS = 230;

  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [isHoverActive, setIsHoverActive] = useState(false);

  const slotRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearHoverTimers = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const collapseHoverCard = (immediate = false) => {
    clearHoverTimers();
    setIsHoverActive(false);

    if (immediate) {
      setIsHoverExpanded(false);
      if (slotRef.current) {
        slotRef.current.style.removeProperty('--gc-slot-height');
      }
      return;
    }

    collapseTimerRef.current = window.setTimeout(() => {
      collapseTimerRef.current = null;
      setIsHoverExpanded(false);
      if (slotRef.current) {
        slotRef.current.style.removeProperty('--gc-slot-height');
      }
    }, HOVER_COLLAPSE_DURATION_MS);
  };

  const handleCardMouseEnter = () => {
    // Only trigger delayed hover expansion on devices that support fine pointer hover
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    // If the card was mid-collapse, cancel collapse and smoothly re-expand
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setIsHoverActive(true);
      });
      return;
    }

    if (isHoverActive) return;

    clearHoverTimers();
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;
      if (slotRef.current) {
        const measuredHeight = slotRef.current.getBoundingClientRect().height;
        if (measuredHeight > 0) {
          slotRef.current.style.setProperty('--gc-slot-height', `${measuredHeight}px`);
        }
      }
      setIsHoverExpanded(true);
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          setIsHoverActive(true);
        });
      });
    }, HOVER_REVEAL_DELAY_MS);
  };

  const handleCardMouseLeave = () => {
    if (!isHoverExpanded) {
      clearHoverTimers();
      return;
    }
    collapseHoverCard(false);
  };

  useEffect(() => {
    const handleViewportResize = () => {
      collapseHoverCard(true);
    };
    window.addEventListener('resize', handleViewportResize);
    return () => {
      clearHoverTimers();
      window.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  const hoverDescription = useMemo(() => {
    const stripHtml = (raw: string) =>
      raw
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();

    const cleanDesc = item.description ? stripHtml(item.description) : '';
    const cleanArticle = item.articleContent ? stripHtml(item.articleContent) : '';
    const candidate = cleanDesc || cleanArticle;
    if (!candidate) return '';

    const normalizedTitle = (item.title || '').replace(/\s+/g, ' ').trim();
    if (normalizedTitle && candidate === normalizedTitle) {
      return cleanArticle && cleanArticle !== normalizedTitle ? cleanArticle : '';
    }
    return candidate;
  }, [item.description, item.articleContent, item.title]);

  const handleOpenReader = () => {
    collapseHoverCard(true);
    onOpenArticleReader(item);
  };

  const handleOpenCommentsModal = () => {
    collapseHoverCard(true);
    onOpenComments(item);
  };

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
          icon: <Youtube className="w-4 h-4 shrink-0 text-slate-100" />,
          label: 'یوتیوب',
          badgeBg: 'gc-chip-platform-youtube px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-red-500/60'
        };
      case 'instagram':
        return {
          icon: <Instagram className="w-4 h-4 shrink-0 text-slate-100" />,
          label: 'اینستاگرام',
          badgeBg: 'gc-chip-platform-instagram px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-pink-500/60'
        };
      case 'article':
        return {
          icon: <Newspaper className="w-4 h-4 shrink-0 text-slate-100" />,
          label: 'مقاله وب',
          badgeBg: 'gc-chip-platform-article px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-emerald-500/60'
        };
      case 'aparat':
        return {
          icon: <Video className="w-4 h-4 shrink-0 text-slate-100" />,
          label: 'آپارات',
          badgeBg: 'gc-chip-platform-aparat px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-rose-500/60'
        };
      case 'telegram':
        return {
          icon: <Send className="w-4 h-4 shrink-0 text-slate-100" />,
          label: 'تلگرام',
          badgeBg: 'gc-chip-platform-telegram px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-sky-500/60'
        };
      default:
        return {
          icon: <Newspaper className="w-4 h-4 shrink-0 text-slate-100" />,
          label: 'مقاله وب',
          badgeBg: 'gc-chip-platform-article px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md',
          accentColor: 'hover:border-emerald-500/60'
        };
    }
  };

  const meta = getPlatformMeta();

  // Resolve username and Persian display title of the person who shared the content
  const allKnownUsers = [
    ...(currentUser ? [currentUser] : []),
    ...(usersList || [])
  ];
  const targetUid = item.sharedBy?.uid || item.authorUid;
  const rawSharerUsername = (item.sharedBy?.username || item.author.handle || '').replace(/^@+/, '').trim().toLowerCase();
  const matchedSharer = allKnownUsers.find((u) =>
    (targetUid && u.uid === targetUid) ||
    (rawSharerUsername && u.username && u.username.replace(/^@+/, '').trim().toLowerCase() === rawSharerUsername)
  );

  const hasPersianText = (value?: string | null): value is string =>
    Boolean(value && /[\u0600-\u06FF]/.test(value.trim()));

  const sharerPersianTitle =
    (hasPersianText(matchedSharer?.displayName) ? matchedSharer.displayName.trim() : null) ||
    (hasPersianText(item.sharedBy?.name) ? item.sharedBy.name.trim() : null) ||
    (hasPersianText(item.author?.name) ? item.author.name.trim() : null) ||
    (matchedSharer?.isAdmin || rawSharerUsername === 'admin' || rawSharerUsername === '3dsaz' ? 'مدیر کل سیستم' : null) ||
    (hasPersianText(matchedSharer?.role) ? matchedSharer.role.replace(/\s*\([^)]*\)/g, '').trim() : null) ||
    'کاربر گیک کلاب';

  const sourceInfo = resolveContentSource(item, matchedSharer);

  return (
    <div
      ref={slotRef}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
      className={`gc-content-card-slot relative h-full ${
        isHoverExpanded ? 'gc-content-card-slot-expanded' : ''
      } ${
        isHoverActive ? 'gc-content-card-slot-active z-20' : isHoverExpanded ? 'z-10' : 'z-0'
      }`}
    >
      <article
        id={item.id}
        className={`gc-content-card group flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-[1.75rem] overflow-hidden shadow-xl ${
          viewMode === 'compact' ? 'gc-content-card-compact sm:flex-row' : ''
        } ${isHoverExpanded ? 'gc-content-card-elevated' : ''} ${
          isHoverActive ? 'gc-content-card-elevated-active' : ''
        }`}
      >
      {/* Media / Embed Container */}
      <div className={`gc-content-card-media relative bg-slate-950 overflow-hidden ${
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
                onClick={handleOpenReader}
              >
                <img
                  src={resolveCoverImageUrl(item.thumbnail, 'youtube', 'card')}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105 opacity-90 group-hover/media:opacity-100"
                  loading="lazy"
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
          // Normalize slides list (merge slides[] + extra images[] without losing any slide)
          const slideList: MediaSlide[] = (() => {
            const merged: MediaSlide[] = [];
            const seen = new Set<string>();
            const keyOf = (u?: string) => (u ? u.trim().split('?')[0] : '');
            for (const s of (item.slides || [])) {
              if (!s || (!s.url && !s.thumbnail)) continue;
              const k = keyOf(s.url || s.thumbnail);
              if (k && !seen.has(k)) {
                seen.add(k);
                merged.push(s);
              }
            }
            for (const img of (item.images || [])) {
              const k = keyOf(img);
              if (k && !seen.has(k)) {
                seen.add(k);
                merged.push({ type: 'image', url: img, thumbnail: img });
              }
            }
            if (merged.length > 0) return merged;
            if (item.videoUrl) return [{ type: 'video', url: item.videoUrl, thumbnail: item.thumbnail }];
            return [{ type: 'image', url: item.thumbnail }];
          })();

          const firstSlide = slideList[0];
          const hasMultipleSlides = slideList.length > 1;

          return (
            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center group/ig">
              {/* Media Display (loads only cover slide in main feed) */}
              {firstSlide.type === 'video' ? (
                isPlayingVideo ? (
                  <div className="relative w-full h-full bg-black flex items-center justify-center">
                    <video
                      src={firstSlide.url}
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
                    onClick={handleOpenReader}
                  >
                    <img
                      src={resolveCoverImageUrl(firstSlide.thumbnail || firstSlide.url || item.thumbnail, 'instagram', 'card')}
                      alt={item.title || 'پست اینستاگرام'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/ig:scale-105 opacity-95 group-hover/ig:opacity-100"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/25 pointer-events-none" />
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
                  onClick={handleOpenReader}
                >
                  <img
                    src={resolveCoverImageUrl(firstSlide.url || firstSlide.thumbnail || item.thumbnail, 'instagram', 'card')}
                    alt={item.title || 'پست اینستاگرام'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/ig:scale-105 opacity-95 group-hover/ig:opacity-100"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/25 pointer-events-none" />
                </div>
              )}

              {/* Slide Count Badge Top-Right (no extra slides loaded on feed) */}
              {hasMultipleSlides && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1 pointer-events-none">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900/85 text-pink-300 border border-pink-500/30 flex items-center gap-1 shadow-md backdrop-blur-md">
                    <Layers className="w-3 h-3 text-pink-400" />
                    {slideList.length} اسلاید
                  </span>
                </div>
              )}
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
                onClick={handleOpenReader}
              >
                <img
                  src={resolveCoverImageUrl(item.thumbnail, 'aparat', 'card')}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105 opacity-90 group-hover/media:opacity-100"
                  loading="lazy"
                  decoding="async"
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

        {item.platform === 'telegram' && (
          <div
            className="relative w-full h-full cursor-pointer group/tg bg-slate-950"
            onClick={handleOpenReader}
          >
            <img
              src={resolveCoverImageUrl(item.thumbnail, 'telegram', 'card')}
              alt={item.title || 'پست تلگرام'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/tg:scale-105 opacity-90 group-hover/tg:opacity-100"
              loading="lazy"
              decoding="async"
              onError={(e) => handleImageError(e, getPlatformFallbackImage('telegram', item.url), 'telegram', item.id)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-black/30" />

            {item.videoUrl ? (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xl shadow-sky-600/40 group-hover/tg:scale-110 transition-all duration-300 backdrop-blur-sm">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/tg:opacity-100 transition-opacity duration-300">
                <div className="px-4 py-2 rounded-2xl bg-sky-600 text-white text-xs font-bold flex items-center gap-2 shadow-xl shadow-sky-600/40 transform translate-y-2 group-hover/tg:translate-y-0 transition-transform">
                  <Send className="w-4 h-4" />
                  مشاهده پست تلگرام
                </div>
              </div>
            )}
          </div>
        )}

        {item.platform === 'article' && (
          <div 
            className="relative w-full h-full cursor-pointer group/art"
            onClick={handleOpenReader}
          >
            <img
              src={resolveCoverImageUrl(item.thumbnail, 'article', 'card')}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-105 opacity-85 group-hover/art:opacity-100"
              loading="lazy"
              decoding="async"
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
      <div className={`gc-content-card-body @container p-3 @[260px]:p-3.5 @[320px]:p-4 flex-1 flex flex-col justify-between bg-slate-900/95 backdrop-blur-xl min-w-0 ${
        isHoverActive ? 'gc-content-card-body-expanded' : ''
      }`}>
        <div className="space-y-2">
          {/* Author & Published Info - Unboxed Text Metadata */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={item.author.avatar}
                alt={item.author.name}
                className="w-7 h-7 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/30"
                onError={(e) => handleImageError(e, getPlatformFallbackImage('avatar'))}
              />
              <div className="text-right min-w-0">
                <div className="flex items-center gap-1">
                  <span className="content-card-author-name text-xs font-bold text-slate-200 truncate">
                    {sharerPersianTitle}
                  </span>
                  {item.author.isVerified && (
                    <span className="w-3.5 h-3.5 shrink-0 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-bold" title="حساب تایید شده">
                      ✓
                    </span>
                  )}
                </div>
                <span className="content-card-source-platform text-[11px] text-slate-400 flex items-center gap-1.5 text-right mt-0.5">
                  <span className="inline-flex items-center justify-center shrink-0" title={meta?.label}>
                    {meta?.icon}
                  </span>
                  <span className={sourceInfo.isRtl ? 'font-medium text-slate-300 truncate' : 'font-mono dir-ltr text-slate-300 truncate'}>
                    <a
                      href={sourceInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline hover:opacity-80 transition-opacity cursor-pointer"
                      title={`مشاهده صفحه ${sourceInfo.label}`}
                    >
                      {sourceInfo.label}
                    </a>
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
              className={`gc-content-card-title text-base sm:text-lg font-black text-slate-100 group-hover:text-indigo-300 transition-colors leading-relaxed cursor-pointer ${
                isHoverActive ? 'line-clamp-4' : 'line-clamp-2'
              }`}
              onClick={handleOpenReader}
            >
              {item.title}
            </h3>
          )}

          {/* Description Smoothly Animated On Delayed Prominent Hover */}
          {hoverDescription && (
            <div
              className={`gc-content-card-hover-desc-wrap ${
                isHoverActive ? 'gc-content-card-hover-desc-open' : ''
              }`}
              aria-hidden={!isHoverActive}
            >
              <div className="gc-content-card-hover-desc-inner">
                <p
                  onClick={handleOpenReader}
                  className="gc-content-card-hover-desc text-xs text-slate-300 leading-6 line-clamp-5 cursor-pointer"
                >
                  {hoverDescription}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tags & Actions Bottom Block */}
        <div className={`gc-content-card-footer-block mt-auto transition-[padding] duration-300 ease-out ${isHoverActive ? 'pt-4' : 'pt-2.5'}`}>
          {/* Tags - Compact Resting Spacing */}
          {item.tags.length > 0 && (
            <div className="gc-content-card-tags flex flex-wrap gap-1 mb-2.5">
              {item.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick(tag)}
                  className="gc-tag-item inline-flex items-center justify-center text-center px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-normal leading-none transition cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* M3 Joined Reaction Bar & Compact Single-Line Action Controls */}
          <div className="gc-content-card-actions pt-2.5 border-t border-slate-800/80 flex flex-nowrap items-center justify-between gap-1 min-w-0">
            {/* M3 Segmented Reaction Controls (Like / Dislike) */}
            <div className="gc-reaction-group flex flex-nowrap items-center gap-0 bg-slate-800/80 border border-slate-700/60 rounded-xl p-0.5 shrink-0">
              {/* Like */}
              <button
                type="button"
                onClick={() => onLike(item.id)}
                className={`gc-card-like-btn px-1.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-0.5 transition-all cursor-pointer shrink-0 tabular-nums ${
                  item.userReaction === 'like'
                    ? 'gc-reaction-like-active'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
                title="پسندیدم (لایک)"
              >
                <ThumbsUp className={`w-3.5 h-3.5 shrink-0 ${item.userReaction === 'like' ? 'fill-white text-white' : ''}`} />
                <span className="font-mono">{item.likesCount}</span>
              </button>

              {/* Separator */}
              <span className="w-px h-3 bg-slate-700/80 mx-0.5 shrink-0"></span>

              {/* Dislike */}
              <button
                type="button"
                onClick={() => onDislike(item.id)}
                className={`gc-card-dislike-btn px-1.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-0.5 transition-all cursor-pointer shrink-0 tabular-nums ${
                  item.userReaction === 'dislike'
                    ? 'gc-reaction-dislike-active'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
                title="نپسندیدم (دیس‌لایک)"
              >
                <ThumbsDown className={`w-3.5 h-3.5 shrink-0 ${item.userReaction === 'dislike' ? 'fill-white text-white' : ''}`} />
                <span className="font-mono">{item.dislikesCount}</span>
              </button>
            </div>

            {/* Compact Single-Line Action Buttons: Comments, Bookmark, Share, Admin */}
            <div className="gc-card-actions-cluster flex flex-nowrap items-center justify-end gap-0.5 min-w-0 shrink-0">
              {/* Comments button */}
              <button
                type="button"
                onClick={handleOpenCommentsModal}
                className="gc-card-action-btn gc-card-comments-btn h-6.5 @[260px]:h-7 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-indigo-300 border border-slate-700/60 text-[11px] font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer shrink-0 tabular-nums"
                title="مشاهده و ثبت نظر"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-mono">{item.commentsCount}</span>
              </button>

              {/* Bookmark button */}
              <button
                type="button"
                onClick={() => onToggleSave(item.id)}
                className={`gc-card-action-btn gc-card-bookmark-btn w-6.5 h-6.5 @[260px]:w-7 @[260px]:h-7 p-0 rounded-lg border transition cursor-pointer inline-flex items-center justify-center shrink-0 ${
                  item.saved
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white border-slate-700/60'
                }`}
                title={item.saved ? 'حذف از ذخیره‌ها' : 'ذخیره محتوا'}
                aria-label={item.saved ? 'حذف از ذخیره‌ها' : 'ذخیره محتوا'}
              >
                <Bookmark className={`w-3.5 h-3.5 shrink-0 ${item.saved ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                className="gc-card-action-btn gc-card-share-btn w-6.5 h-6.5 @[260px]:w-7 @[260px]:h-7 p-0 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700/60 transition cursor-pointer inline-flex items-center justify-center shrink-0"
                title="کپی لینک اشتراک"
                aria-label="کپی لینک اشتراک"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>

              {/* Admin-Only Delete button (Moves content to Trash Bin) */}
              {isAdmin && onDeleteContent && !(item.isDeleted || item.isArchived) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    collapseHoverCard(true);
                    onDeleteContent(item.id);
                  }}
                  className="gc-card-action-btn gc-card-admin-delete-btn w-6.5 h-6.5 @[260px]:w-7 @[260px]:h-7 p-0 rounded-lg bg-slate-800/80 hover:bg-slate-750 active:scale-95 text-rose-400 hover:text-rose-300 border border-slate-700/60 transition cursor-pointer inline-flex items-center justify-center shrink-0"
                  title="حذف و انتقال به سطل زباله (مخصوص مدیریت)"
                  aria-label="حذف و انتقال به سطل زباله"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                </button>
              )}

              {/* Restore button (When viewing Trash as Admin) */}
              {isAdmin && (item.isDeleted || item.isArchived) && onRestoreContent && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    collapseHoverCard(true);
                    onRestoreContent(item.id);
                  }}
                  className="gc-card-action-btn gc-card-admin-restore-btn w-6.5 h-6.5 @[260px]:w-7 @[260px]:h-7 p-0 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 hover:text-emerald-100 border border-emerald-500/30 transition cursor-pointer inline-flex items-center justify-center shrink-0"
                  title="بازگردانی محتوا از سطل زباله به صفحه اصلی"
                  aria-label="بازگردانی محتوا"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </button>
              )}

              {/* Permanent Delete button (When viewing Trash as Admin) */}
              {isAdmin && (item.isDeleted || item.isArchived) && onPermanentDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    collapseHoverCard(true);
                    onPermanentDelete(item.id);
                  }}
                  className="gc-card-action-btn gc-card-admin-permdelete-btn w-6.5 h-6.5 @[260px]:w-7 @[260px]:h-7 p-0 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 hover:text-rose-100 border border-rose-500/40 transition cursor-pointer inline-flex items-center justify-center shrink-0"
                  title="حذف دائمی از دیتابیس"
                  aria-label="حذف دائمی از دیتابیس"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </article>
    </div>
  );
};
