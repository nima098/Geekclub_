import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  BookOpen, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  MessageSquare,
  Bookmark,
  Youtube,
  Video,
  Play,
  ChevronLeft,
  ChevronRight,
  Layers,
  Check,
  PictureInPicture2,
  Send,
  TrendingUp
} from 'lucide-react';
import { ContentItem, MediaSlide, shouldDisplayTitle, getContentScore } from '../../types/content';
import { handleImageError, getPlatformFallbackImage, resolveCoverImageUrl } from '../../utils/imageHelper';
import { YouTubePlayer } from './YouTubePlayer';

interface ArticleReaderModalProps {
  item: ContentItem | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onOpenComments: (item: ContentItem) => void;
  onToggleSave: (id: string) => void;
  onShare: (item: ContentItem) => void;
  onEnrichedContent?: (contentId: string, updates: Partial<ContentItem>) => void;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  item,
  onClose,
  onLike,
  onDislike,
  onOpenComments,
  onToggleSave,
  onShare,
  onEnrichedContent
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPlayingIgVideo, setIsPlayingIgVideo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFetchingSlides, setIsFetchingSlides] = useState(false);
  const [fetchedSlidesOverride, setFetchedSlidesOverride] = useState<MediaSlide[] | null>(null);
  const [openedSlideIndices, setOpenedSlideIndices] = useState<number[]>([0]);
  const [showTelegramWidget, setShowTelegramWidget] = useState(false);

  const autoFetchedIdsRef = React.useRef<Set<string>>(new Set());
  const modalImageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map());
  const igVideoRef = React.useRef<HTMLVideoElement | null>(null);

  const supportsWebPiP =
    typeof document !== 'undefined' && Boolean((document as any).pictureInPictureEnabled);

  const handleToggleIgPiP = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoEl = igVideoRef.current as any;
    if (!videoEl) return;
    try {
      if ((document as any).pictureInPictureElement) {
        await (document as any).exitPictureInPicture();
      } else if (typeof videoEl.requestPictureInPicture === 'function') {
        await videoEl.requestPictureInPicture();
      }
    } catch {}
  };

  // Normalize slides for Instagram (merges slides[] + extra images[] + videoUrl/thumbnail fallback without dropping any slide)
  const slideList: MediaSlide[] = React.useMemo(() => {
    if (!item) return [];
    const baseSlides = (fetchedSlidesOverride && fetchedSlidesOverride.length > 0 ? fetchedSlidesOverride : item.slides) || [];
    const merged: MediaSlide[] = [];
    const seenUrls = new Set<string>();

    const normalizeKey = (u?: string) => {
      if (!u) return '';
      const trimmed = u.trim();
      if (!trimmed) return '';
      return trimmed.split('?')[0];
    };

    for (const s of baseSlides) {
      if (!s || (!s.url && !s.thumbnail)) continue;
      const key = normalizeKey(s.url || s.thumbnail);
      if (key && !seenUrls.has(key)) {
        seenUrls.add(key);
        if (s.thumbnail) seenUrls.add(normalizeKey(s.thumbnail));
        merged.push(s);
      }
    }

    const extraImages = (item.images || []).filter(Boolean);
    for (const img of extraImages) {
      const key = normalizeKey(img);
      if (key && !seenUrls.has(key)) {
        seenUrls.add(key);
        merged.push({ type: 'image', url: img, thumbnail: img });
      }
    }

    if (merged.length > 0) return merged;
    if (item.videoUrl) {
      return [{ type: 'video' as const, url: item.videoUrl, thumbnail: item.thumbnail }];
    }
    if (item.thumbnail) {
      return [{ type: 'image' as const, url: item.thumbnail, thumbnail: item.thumbnail }];
    }
    return [];
  }, [item, fetchedSlidesOverride]);

  const hasMultipleSlides = slideList.length > 1;
  const activeSlide = slideList[activeSlideIndex] || slideList[0];

  const goToPrevSlide = () => {
    if (!hasMultipleSlides) return;
    setIsPlayingIgVideo(false);
    setActiveSlideIndex((prev) => (prev - 1 + slideList.length) % slideList.length);
  };

  const goToNextSlide = () => {
    if (!hasMultipleSlides) return;
    setIsPlayingIgVideo(false);
    setActiveSlideIndex((prev) => (prev + 1) % slideList.length);
  };

  const handleFetchAllSlides = React.useCallback(async () => {
    if (!item || item.platform !== 'instagram' || !item.url || isFetchingSlides) return;
    setIsFetchingSlides(true);
    try {
      let data: any = null;
      if (!item.id.startsWith('ig-')) {
        try {
          const enrichRes = await fetch(`/api/contents/${encodeURIComponent(item.id)}/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.url })
          });
          if (enrichRes.ok) {
            const json = await enrichRes.json();
            if (json?.success && json?.data && !json.data?.data?.instantFallback) {
              data = json.data;
            }
          }
        } catch {}
      }

      if (!data) {
        const res = await fetch(`/api/extract-metadata?url=${encodeURIComponent(item.url)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && !json.data?.instantFallback) {
            data = json;
          }
        }
      }

      if (data) {
        const extractedSlides: MediaSlide[] = Array.isArray(data.slides) && data.slides.length > 0
          ? data.slides
          : Array.isArray(data.images) && data.images.length > 0
            ? data.images.map((img: string) => ({ type: 'image' as const, url: img, thumbnail: img }))
            : [];
        if (extractedSlides.length > 0 && extractedSlides.length >= slideList.length) {
          setFetchedSlidesOverride(extractedSlides);
          setActiveSlideIndex(0);
          onEnrichedContent?.(item.id, {
            slides: extractedSlides,
            apifyFetched: Boolean(data.apifyFetched || data.data?.apify),
            ...(Array.isArray(data.images) && data.images.length > 0 ? { images: data.images } : {}),
            ...(data.videoUrl ? { videoUrl: data.videoUrl } : {}),
            ...(data.thumbnail ? { thumbnail: data.thumbnail } : {}),
            mediaType: extractedSlides.length > 1 ? 'carousel' : (data.mediaType || item.mediaType)
          });
        }
      }
    } catch {
      // Ignore silent background check error
    } finally {
      setIsFetchingSlides(false);
    }
  }, [item, isFetchingSlides, slideList.length, onEnrichedContent]);

  // Reset slide index and clear modal image cache only when switching item or closing modal
  useEffect(() => {
    setActiveSlideIndex(0);
    setOpenedSlideIndices([0]);
    setIsPlayingIgVideo(false);
    setIsCopied(false);
    setIsZoomed(false);
    setFetchedSlidesOverride(null);
    setShowTelegramWidget(false);
    modalImageCacheRef.current.clear();

    if (
      item &&
      item.platform === 'instagram' &&
      item.url &&
      !item.id.startsWith('ig-') &&
      !item.videoUrl &&
      !item.apifyFetched &&
      (!item.slides || item.slides.length <= 1) &&
      (!item.images || item.images.length <= 1) &&
      !autoFetchedIdsRef.current.has(item.id)
    ) {
      autoFetchedIdsRef.current.add(item.id);
      void handleFetchAllSlides();
    }
  }, [item?.id]);

  // Clear modal image cache when popup closes
  useEffect(() => {
    if (!item) {
      modalImageCacheRef.current.clear();
      setOpenedSlideIndices([0]);
    }
  }, [item]);

  // Record every opened slide in state & retain its decoded Image object in memory until modal closes
  useEffect(() => {
    if (!item || item.platform !== 'instagram' || slideList.length === 0) return;
    setOpenedSlideIndices((prev) => (prev.includes(activeSlideIndex) ? prev : [...prev, activeSlideIndex]));
    const slide = slideList[activeSlideIndex];
    if (slide) {
      const rawUrl = slide.type === 'video' ? (slide.thumbnail || '') : (slide.url || slide.thumbnail || '');
      if (rawUrl) {
        const resolvedUrl = resolveCoverImageUrl(rawUrl, 'instagram', 'modal');
        if (resolvedUrl && !modalImageCacheRef.current.has(resolvedUrl)) {
          const cachedImg = new Image();
          cachedImg.decoding = 'async';
          cachedImg.src = resolvedUrl;
          modalImageCacheRef.current.set(resolvedUrl, cachedImg);
        }
      }
    }
  }, [item, activeSlideIndex, slideList]);

  // Keyboard navigation (ArrowLeft = Prev, ArrowRight = Next in LTR, Escape to close zoom or modal)
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
          return;
        }
        onClose();
        return;
      }
      if (item.platform === 'instagram' && slideList.length > 1) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setIsPlayingIgVideo(false);
          setActiveSlideIndex((prev) => (prev + 1) % slideList.length);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setIsPlayingIgVideo(false);
          setActiveSlideIndex((prev) => (prev - 1 + slideList.length) % slideList.length);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, slideList.length, isZoomed, onClose]);

  if (!item) return null;

  const getSourceButtonLabel = (): string => {
    if (!item) return 'بازکردن در منبع خبر';

    const urlLower = (item.url || '').toLowerCase();
    const domainLower = (item.sourceDomain || '').toLowerCase().replace(/^www\./, '');

    if (item.platform === 'instagram' || urlLower.includes('instagram.com') || domainLower.includes('instagram')) {
      return 'این صفحه را فالو کنید';
    }
    if (item.platform === 'youtube' || urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || domainLower.includes('youtube')) {
      return 'بازکردن در یوتیوب';
    }
    if (item.platform === 'aparat' || urlLower.includes('aparat.com') || domainLower.includes('aparat')) {
      return 'بازکردن در آپارات';
    }
    if (item.platform === 'telegram' || urlLower.includes('t.me') || urlLower.includes('telegram.me') || urlLower.includes('telegram.org') || domainLower.includes('telegram')) {
      return 'بازکردن در تلگرام';
    }

    if (domainLower) {
      if (domainLower.includes('zoomit')) return 'بازکردن در زومیت';
      if (domainLower.includes('digiato')) return 'بازکردن در دیجیاتو';
      if (domainLower.includes('virgool')) return 'بازکردن در ویرگول';
      if (domainLower.includes('zoomg')) return 'بازکردن در زومجی';
      if (domainLower.includes('gadgetnews')) return 'بازکردن در گجت نیوز';
      if (domainLower.includes('sarzamindownload')) return 'بازکردن در سرزمین دانلود';
      if (domainLower.includes('medium')) return 'بازکردن در مدیوم';
      if (domainLower.includes('github')) return 'بازکردن در گیت‌هاب';
      if (domainLower.includes('dev.to')) return 'بازکردن در Dev.to';
      if (domainLower.includes('p30download')) return 'بازکردن در پی‌سی دانلود';
      
      const siteName = domainLower.split('.')[0];
      const formattedName = siteName ? siteName.charAt(0).toUpperCase() + siteName.slice(1) : domainLower;
      return `بازکردن در ${formattedName}`;
    }

    return 'بازکردن در منبع خبر';
  };

  const getYouTubeVideoId = (): string => {
    const rawEmbed = (item?.embedUrl || '').trim();
    const rawUrl = (item?.url || '').trim();
    const match =
      rawEmbed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i) ||
      rawUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match && match[1] ? match[1] : '';
  };

  const getYouTubeEmbedSrc = (): string => {
    const id = getYouTubeVideoId();
    if (id) {
      return `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0&fs=1&playsinline=1&iv_load_policy=3`;
    }
    const base = (item?.embedUrl || item?.url || '').trim();
    if (!base) return '';
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}autoplay=1&controls=1&rel=0&fs=1&playsinline=1&iv_load_policy=3`;
  };

  const handleShareClick = () => {
    onShare(item);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-800 flex items-center justify-start bg-slate-900/95 backdrop-blur-xl shrink-0">
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="w-9 h-9 p-0 m-0 leading-none text-center rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer inline-flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5 block m-0 shrink-0" />
            </button>
          </div>
        </div>

        {/* Modal Body / Main Viewport */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-5">
          {/* 1. YouTube Video Embed Player (Unified Bottom Control Bar, No More Videos Overlay) */}
          {item.platform === 'youtube' && (() => {
            const ytId = getYouTubeVideoId();
            if (ytId) {
              return (
                <YouTubePlayer
                  videoId={ytId}
                  title={item.title}
                  posterUrl={resolveCoverImageUrl(item.thumbnail, 'youtube', 'modal')}
                />
              );
            }
            return (
              <div
                dir="ltr"
                className="relative w-full mx-auto aspect-video min-h-[210px] sm:min-h-[300px] shrink-0 rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800"
                style={{ maxWidth: 'min(100%, max(480px, calc(56vh * 16 / 9)))' }}
              >
                <iframe
                  src={getYouTubeEmbedSrc()}
                  title={item.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            );
          })()}

          {/* 2. Aparat Video Embed Player */}
          {item.platform === 'aparat' && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800">
              <iframe
                src={item.embedUrl}
                title={item.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* 3. Instagram Multi-Slide Carousel or Video Player (LTR order, fixed viewport height, keeps opened images mounted in cache) */}
          {item.platform === 'instagram' && activeSlide && (
            <div className="space-y-3">
              <div
                dir="ltr"
                className="relative w-full h-[360px] sm:h-[480px] md:h-[540px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center group/ig shadow-2xl select-none"
                onTouchStart={(e) => {
                  if (e.touches && e.touches.length === 1) {
                    setTouchStartX(e.touches[0].clientX);
                  }
                }}
                onTouchEnd={(e) => {
                  if (touchStartX === null || !hasMultipleSlides) return;
                  const endX = e.changedTouches?.[0]?.clientX;
                  if (typeof endX === 'number') {
                    const diff = endX - touchStartX;
                    if (diff > 45) {
                      goToPrevSlide();
                    } else if (diff < -45) {
                      goToNextSlide();
                    }
                  }
                  setTouchStartX(null);
                }}
              >
                {/* Counter Badge (Top-Right inside media frame) */}
                {(hasMultipleSlides || isFetchingSlides) && (
                  <div dir="rtl" className="absolute top-3 right-3 z-30">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5 shadow-lg">
                      <Layers className="w-3.5 h-3.5 text-slate-300" />
                      {isFetchingSlides
                        ? 'در حال بررسی اسلایدها...'
                        : `اسلاید ${activeSlideIndex + 1} از ${slideList.length}`}
                    </span>
                  </div>
                )}

                {/* Mounted Slide Layers: keep every opened slide mounted in browser DOM until popup closes */}
                {slideList.map((slide, idx) => {
                  const isCurrent = idx === activeSlideIndex;
                  const isOpened = isCurrent || openedSlideIndices.includes(idx);
                  if (!isOpened) return null;

                  const slideImgSrc = resolveCoverImageUrl(
                    slide.type === 'video' ? (slide.thumbnail || slide.url || item.thumbnail) : (slide.url || slide.thumbnail || item.thumbnail),
                    'instagram',
                    'modal'
                  );

                  return (
                    <div
                      key={`${item.id}-slide-layer-${idx}`}
                      aria-hidden={!isCurrent}
                      className={`absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden transition-opacity duration-200 ${
                        isCurrent ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                      }`}
                    >
                      {slide.type === 'video' ? (
                        isPlayingIgVideo && isCurrent ? (
                          <div className="relative w-full h-full bg-black flex items-center justify-center">
                            <video
                              ref={igVideoRef}
                              src={slide.url}
                              controls
                              autoPlay
                              playsInline
                              disablePictureInPicture={supportsWebPiP}
                              className="w-full h-full object-contain"
                            />
                            {supportsWebPiP && (
                              <button
                                type="button"
                                onClick={handleToggleIgPiP}
                                aria-label="تصویر در تصویر"
                                title="تصویر در تصویر"
                                className="absolute bottom-14 right-3 z-20 w-9 h-9 p-0 m-0 leading-none text-center rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg transition cursor-pointer inline-flex items-center justify-center shrink-0"
                              >
                                <PictureInPicture2 className="w-4 h-4 block m-0 shrink-0" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center bg-slate-950"
                            onClick={() => {
                              if (isCurrent) setIsPlayingIgVideo(true);
                            }}
                          >
                            <img
                              src={slideImgSrc}
                              alt=""
                              aria-hidden="true"
                              loading="eager"
                              decoding="async"
                              className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60 select-none pointer-events-none"
                              onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                            />
                            <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
                            <img
                              src={slideImgSrc}
                              alt={`${item.title || 'پست اینستاگرام'} - اسلاید ${idx + 1}`}
                              loading="eager"
                              decoding="async"
                              className="w-full h-full object-contain relative z-10 opacity-95 hover:opacity-100 transition drop-shadow-md"
                              onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <div style={{ backgroundColor: "oklch(0.592 0.249 0.584)" }} className="w-16 h-16 rounded-2xl text-white flex items-center justify-center shadow-2xl shadow-[oklch(0.592_0.249_0.584)]/50 hover:scale-110 transition-all duration-300 backdrop-blur-md">
                                <Play className="w-8 h-8 fill-white ml-1" />
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
                          <img
                            src={slideImgSrc}
                            alt=""
                            aria-hidden="true"
                            loading="eager"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60 select-none pointer-events-none"
                            onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                          />
                          <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
                          <img
                            src={slideImgSrc}
                            alt={`${item.title || 'پست اینستاگرام'} - اسلاید ${idx + 1}`}
                            loading="eager"
                            decoding="async"
                            onClick={() => {
                              if (isCurrent) setIsZoomed(true);
                            }}
                            className="w-full h-full object-contain relative z-10 drop-shadow-md cursor-zoom-in"
                            onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Side Slider Arrows in LTR Order: Left = Previous, Right = Next */}
                {(hasMultipleSlides || !item.videoUrl) && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasMultipleSlides) {
                          goToPrevSlide();
                        } else {
                          handleFetchAllSlides();
                        }
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition active:scale-95 cursor-pointer"
                      title={hasMultipleSlides ? 'اسلاید قبلی' : 'بررسی اسلایدهای بیشتر'}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasMultipleSlides) {
                          goToNextSlide();
                        } else {
                          handleFetchAllSlides();
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition active:scale-95 cursor-pointer"
                      title={hasMultipleSlides ? 'اسلاید بعدی' : 'بررسی اسلایدهای بیشتر'}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Dots Indicator (LTR left-to-right) */}
                {hasMultipleSlides && (
                  <div dir="ltr" className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl">
                    {slideList.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPlayingIgVideo(false);
                          setActiveSlideIndex(idx);
                        }}
                        className={`transition-all rounded-full cursor-pointer ${
                          idx === activeSlideIndex
                            ? 'w-5 h-2 bg-pink-400'
                            : 'w-2 h-2 bg-slate-500 hover:bg-slate-300'
                        }`}
                        title={`اسلاید ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail Filmstrip for Multi-Page Instagram Carousels (LTR order left-to-right) */}
              {hasMultipleSlides && (
                <div dir="ltr" className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-thin">
                  {slideList.map((slide, idx) => {
                    const thumbSrc = resolveCoverImageUrl(
                      slide.thumbnail || slide.url || item.thumbnail,
                      'instagram',
                      'card'
                    );
                    const isActive = idx === activeSlideIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setIsPlayingIgVideo(false);
                          setActiveSlideIndex(idx);
                        }}
                        className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-950 ${
                          isActive
                            ? 'border-pink-500 ring-2 ring-pink-500/35 scale-[1.03]'
                            : 'border-slate-800 opacity-65 hover:opacity-100 hover:border-slate-600'
                        }`}
                        title={`نمایش اسلاید ${idx + 1}`}
                      >
                        <img
                          src={thumbSrc}
                          alt={`اسلاید ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                        />
                        {slide.type === 'video' && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </span>
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-slate-950/85 text-[10px] font-bold text-slate-200 border border-slate-700/70">
                          {idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen Zoom Overlay for Active Instagram Slide (LTR arrows) */}
          {isZoomed && item.platform === 'instagram' && activeSlide && activeSlide.type !== 'video' && (
            <div
              className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4"
              onClick={() => setIsZoomed(false)}
            >
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                aria-label="بستن بزرگ‌نمایی"
                className="absolute top-4 left-4 z-10 w-10 h-10 p-0 m-0 leading-none text-center rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer inline-flex items-center justify-center shrink-0"
                title="بستن بزرگ‌نمایی"
              >
                <X className="w-5 h-5 block m-0 shrink-0" />
              </button>
              {hasMultipleSlides && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToPrevSlide(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                    title="اسلاید قبلی"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToNextSlide(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                    title="اسلاید بعدی"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              <img
                src={resolveCoverImageUrl(activeSlide.url || activeSlide.thumbnail || item.thumbnail, 'instagram', 'modal')}
                alt={`${item.title || 'پست اینستاگرام'} - اسلاید ${activeSlideIndex + 1}`}
                className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* 3.5. Telegram Post Media / Video / Optional Live Widget */}
          {item.platform === 'telegram' && (
            <div className="space-y-3">
              {showTelegramWidget && item.embedUrl?.includes('t.me/') ? (
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-2">
                  <iframe
                    src={item.embedUrl}
                    title={item.title}
                    className="w-full min-h-[380px] rounded-xl border-0 bg-white"
                  />
                </div>
              ) : item.videoUrl ? (
                <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center">
                  <video
                    src={item.videoUrl}
                    poster={resolveCoverImageUrl(item.thumbnail, 'telegram', 'modal')}
                    controls
                    playsInline
                    className="w-full max-h-[520px] object-contain"
                  />
                </div>
              ) : item.thumbnail ? (
                <div className="rounded-2xl overflow-hidden aspect-video max-h-[420px] w-full border border-slate-800 shadow-xl bg-slate-950">
                  <img
                    src={resolveCoverImageUrl(item.thumbnail, 'telegram', 'modal')}
                    alt={item.title}
                    decoding="async"
                    className="w-full h-full object-contain"
                    onError={(e) => handleImageError(e, getPlatformFallbackImage('telegram', item.url), 'telegram', item.id)}
                  />
                </div>
              ) : null}

              {item.embedUrl?.includes('t.me/') && item.embedUrl.includes('embed=1') && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTelegramWidget(!showTelegramWidget)}
                    className="px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{showTelegramWidget ? 'نمایش نسخه بهینه گیک‌کلاب' : 'نمایش ویجت رسمی تلگرام'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Article Featured Image */}
          {item.platform === 'article' && item.thumbnail && (
            <div className="rounded-2xl overflow-hidden aspect-video max-h-80 w-full border border-slate-800 shadow-xl">
              <img
                src={resolveCoverImageUrl(item.thumbnail, 'article', 'modal')}
                alt={item.title}
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => handleImageError(e, getPlatformFallbackImage('article', item.url), 'article', item.id)}
              />
            </div>
          )}

          {/* Content Header: Title & Meta */}
          <div className="space-y-4">
            {shouldDisplayTitle(item) && (
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-relaxed">
                {item.title}
              </h1>
            )}

            {/* Author & Published Time Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={item.author.avatar}
                  alt={item.author.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40"
                  onError={(e) => handleImageError(e, getPlatformFallbackImage('avatar'))}
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
                    <span className="text-xs text-slate-400 dir-ltr text-right font-mono">
                      {item.author.handle}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                {(() => {
                  const score = getContentScore(item);
                  return (
                    <span
                      className={`px-2.5 py-1 rounded-xl font-bold inline-flex items-center gap-1 ${
                        score > 0
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : score < 0
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>امتیاز:</span>
                      <span className="font-mono" dir="ltr">{score > 0 ? `+${score}` : score}</span>
                    </span>
                  );
                })()}
                <span>{item.publishedAt}</span>
              </div>
            </div>

            {/* Full Text / Description */}
            <div className="prose prose-invert max-w-none text-slate-300 text-sm sm:text-base leading-loose sm:leading-[2.1] whitespace-pre-line bg-slate-950/40 p-4 sm:p-6 rounded-2xl border border-slate-800/80">
              {item.platform === 'article' 
                ? (item.articleContent || item.description)
                : item.description}
            </div>

            {/* Tags List */}
            {item.tags && item.tags.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Like */}
            <button
              onClick={() => onLike(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                item.userReaction === 'like'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
              }`}
              title="پسندیدم"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>پسندیدم ({item.likesCount})</span>
            </button>

            {/* Dislike */}
            <button
              onClick={() => onDislike(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                item.userReaction === 'dislike'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
              }`}
              title="نپسندیدم"
            >
              <ThumbsDown className="w-4 h-4" />
              <span>({item.dislikesCount})</span>
            </button>

            {/* Comments button */}
            <button
              onClick={() => {
                onClose();
                onOpenComments(item);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="مشاهده دیدگاه‌ها"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>نظرات ({item.commentsCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Open Source Link Button */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer no-underline active:scale-95"
              title={getSourceButtonLabel()}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-xs font-bold">{getSourceButtonLabel()}</span>
            </a>

            <button
              onClick={() => onToggleSave(item.id)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                item.saved
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
              }`}
              title={item.saved ? 'حذف از نشان‌شده‌ها' : 'نشان‌کردن محتوا'}
            >
              <Bookmark className={`w-4 h-4 ${item.saved ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            <button
              onClick={handleShareClick}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
              title="کپی لینک"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
