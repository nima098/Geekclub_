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
  Instagram,
  Video,
  Play,
  ChevronLeft,
  ChevronRight,
  Layers,
  Check
} from 'lucide-react';
import { ContentItem, MediaSlide } from '../types/content';
import { handleImageError, getPlatformFallbackImage, resolveCoverImageUrl } from '../utils/imageHelper';

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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPlayingIgVideo, setIsPlayingIgVideo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Reset slide index when active item changes
  useEffect(() => {
    setActiveSlideIndex(0);
    setIsPlayingIgVideo(false);
    setIsCopied(false);
  }, [item?.id]);

  if (!item) return null;

  const getExternalSourceLabel = () => {
    if (!item) return 'دیدن محتوا در وبسایت مبدا';
    if (item.platform === 'youtube') return 'دیدن محتوا در یوتیوب';
    if (item.platform === 'instagram') return 'دیدن محتوا در اینستاگرام';
    if (item.platform === 'aparat') return 'دیدن محتوا در آپارات';

    if (item.sourceDomain) {
      const domain = item.sourceDomain.toLowerCase().replace(/^www\./, '');
      if (domain.includes('virgool')) return 'دیدن محتوا در ویرگول';
      if (domain.includes('zoomit')) return 'دیدن محتوا در زومیت';
      if (domain.includes('digiato')) return 'دیدن محتوا در دیجیاتو';
      if (domain.includes('medium')) return 'دیدن محتوا در مدیوم';
      if (domain.includes('github')) return 'دیدن محتوا در گیت‌هاب';
      return `دیدن محتوا در ${domain}`;
    }

    return 'دیدن محتوا در وبسایت مبدا';
  };

  const handleShareClick = () => {
    onShare(item);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };



  // Normalize slides for Instagram
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-xl shrink-0 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* 1. YouTube Video Embed Player */}
          {item.platform === 'youtube' && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800">
              <iframe
                src={`${item.embedUrl}?autoplay=1&rel=0`}
                title={item.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

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

          {/* 3. Instagram Multi-Slide Carousel or Video Player */}
          {item.platform === 'instagram' && (
            <div className="relative w-full min-h-[320px] sm:min-h-[460px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center group/ig shadow-2xl">
              {activeSlide.type === 'video' ? (
                isPlayingIgVideo ? (
                  <div className="relative w-full h-full min-h-[320px] sm:min-h-[460px] bg-black flex items-center justify-center">
                    <video
                      src={activeSlide.url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full max-h-[550px] object-contain"
                    />
                    <button
                      onClick={() => setIsPlayingIgVideo(false)}
                      className="absolute top-3 left-3 z-20 p-2 rounded-xl bg-black/80 hover:bg-black text-white text-xs transition cursor-pointer backdrop-blur-md border border-white/20"
                      title="بستن پخش ویدیو"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="relative w-full h-full min-h-[320px] sm:min-h-[460px] cursor-pointer overflow-hidden flex items-center justify-center bg-slate-950"
                    onClick={() => setIsPlayingIgVideo(true)}
                  >
                    <img
                      src={activeSlide.thumbnail || item.thumbnail}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60 select-none pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
                    <img
                      src={activeSlide.thumbnail || item.thumbnail}
                      alt={item.title}
                      className="w-full max-h-[550px] object-contain relative z-10 opacity-95 hover:opacity-100 transition drop-shadow-md"
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
                <div className="relative w-full h-full min-h-[320px] sm:min-h-[460px] flex items-center justify-center bg-slate-950 overflow-hidden">
                  <img
                    src={activeSlide.url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60 select-none pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
                  <img
                    src={activeSlide.url}
                    alt={`${item.title} - اسلاید ${activeSlideIndex + 1}`}
                    className="w-full max-h-[550px] object-contain relative z-10 drop-shadow-md"
                    onError={(e) => handleImageError(e, getPlatformFallbackImage('instagram', item.url), 'instagram', item.id)}
                  />
                </div>
              )}

              {/* Multi-slide controls for Instagram */}
              {hasMultipleSlides && (
                <>
                  <button
                    onClick={() => {
                      setIsPlayingIgVideo(false);
                      setActiveSlideIndex((prev) => (prev - 1 + slideList.length) % slideList.length);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-700 shadow-xl backdrop-blur-md transition cursor-pointer"
                    title="اسلاید قبلی"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlayingIgVideo(false);
                      setActiveSlideIndex((prev) => (prev + 1) % slideList.length);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-700 shadow-xl backdrop-blur-md transition cursor-pointer"
                    title="اسلاید بعدی"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Dots Indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl">
                    {slideList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
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

                  {/* Counter Badge */}
                  <div className="absolute top-4 right-4 z-20">
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-900/90 text-pink-300 border border-pink-500/30 flex items-center gap-1.5 shadow-lg backdrop-blur-md">
                      <Layers className="w-3.5 h-3.5 text-pink-400" />
                      اسلاید {activeSlideIndex + 1} از {slideList.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 4. Article Featured Image */}
          {item.platform === 'article' && item.thumbnail && (
            <div className="rounded-2xl overflow-hidden aspect-video max-h-72 w-full border border-slate-800 shadow-xl">
              <img
                src={resolveCoverImageUrl(item.thumbnail)}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => handleImageError(e, getPlatformFallbackImage('article', item.url), 'article', item.id)}
              />
            </div>
          )}

          {/* Content Header: Title & Meta */}
          <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-relaxed">
              {item.title}
            </h1>

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

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {item.readingOrWatchTime}
                </span>
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
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
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

          <div className="flex items-center gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title={getExternalSourceLabel()}
            >
              <ExternalLink className="w-4 h-4 text-slate-300" />
              <span>{getExternalSourceLabel()}</span>
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
