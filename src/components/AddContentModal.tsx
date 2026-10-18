import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  PlusCircle, 
  Youtube, 
  Instagram, 
  Newspaper, 
  Sparkles, 
  Link as LinkIcon, 
  Eye, 
  Check, 
  Loader2,
  Wand2,
  ChevronDown,
  Layers,
  Clock,
  Video
} from 'lucide-react';
import { 
  Platform, 
  Category, 
  ContentItem, 
  UserProfile, 
  SITE_CATEGORIES, 
  inferCategoryFromContent,
  SiteAdminSettings
} from '../types/content';
import { parseContentUrl, fetchMetadataFromUrl, ExtractedMetadata } from '../utils/urlHelper';

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<ContentItem, 'id' | 'likesCount' | 'dislikesCount' | 'commentsCount' | 'publishedAt'>) => void;
  user: UserProfile | null;
  initialUrl?: string;
  requireApproval?: boolean;
  siteSettings?: SiteAdminSettings;
}

export const AddContentModal: React.FC<AddContentModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  user,
  initialUrl,
  requireApproval,
  siteSettings
}) => {
  const [url, setUrl] = useState(initialUrl || '');

  useEffect(() => {
    if (initialUrl && initialUrl.trim() && isOpen) {
      setUrl(initialUrl.trim());
    }
  }, [initialUrl, isOpen]);
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Category state with Auto-detect and Suggestion / Autocomplete
  const [categoryInput, setCategoryInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'auto'>('auto');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  const [tagsInput, setTagsInput] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [readingOrWatchTime, setReadingOrWatchTime] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [articleContent, setArticleContent] = useState('');

  // Metadata fetching states
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [fetchedMeta, setFetchedMeta] = useState<ExtractedMetadata | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryContainerRef.current && 
        !categoryContainerRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced URL parser and metadata fetcher
  useEffect(() => {
    if (!url.trim()) {
      setDetectedPlatform(null);
      setFetchedMeta(null);
      setEmbedUrl('');
      return;
    }

    const parsed = parseContentUrl(url.trim());
    setDetectedPlatform(parsed.platform);
    setEmbedUrl(parsed.embedUrl);

    let active = true;
    setIsLoadingMeta(true);

    const timer = setTimeout(async () => {
      try {
        const meta = await fetchMetadataFromUrl(url.trim());
        if (active) {
          setFetchedMeta(meta);
          setDetectedPlatform(meta.platform);
          setEmbedUrl(meta.embedUrl);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      } finally {
        if (active) setIsLoadingMeta(false);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url]);

  if (!isOpen) return null;

  // Inferred category label for display when in auto-detect mode
  const autoInferredCategory = fetchedMeta?.category || inferCategoryFromContent(title, description, tagsInput.split(/[,،\s]+/));
  const autoInferredCategoryLabel = SITE_CATEGORIES.find((c) => c.id === autoInferredCategory)?.label || 'تکنولوژی';

  // Filter category suggestions based on user typing
  const filteredCategorySuggestions = SITE_CATEGORIES.filter((c) => {
    if (!categoryInput.trim() || selectedCategory === 'auto') return true;
    const query = categoryInput.toLowerCase().trim();
    return (
      c.label.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  // Check if any of the secondary fields have user input
  const hasCustomFields = Boolean(
    title.trim() || 
    description.trim() || 
    (selectedCategory !== 'auto' && categoryInput.trim()) || 
    tagsInput.trim() || 
    authorName.trim() || 
    readingOrWatchTime.trim()
  );

  // Handle selecting a category from suggestions
  const handleSelectCategory = (catId: Category | 'auto', catLabel?: string) => {
    if (catId === 'auto') {
      setSelectedCategory('auto');
      setCategoryInput('');
    } else {
      setSelectedCategory(catId);
      setCategoryInput(catLabel || '');
    }
    setShowCategoryDropdown(false);
  };

  // Manually apply fetched metadata into input fields
  const handleApplyFetchedMetadata = () => {
    if (!fetchedMeta) return;
    setTitle(fetchedMeta.title);
    setDescription(fetchedMeta.description);
    setAuthorName(fetchedMeta.authorName);
    setThumbnail(fetchedMeta.thumbnail);
    setTagsInput(fetchedMeta.tags.join(', '));
    setReadingOrWatchTime(fetchedMeta.readingOrWatchTime);

    // Also populate category from metadata if auto
    const matched = SITE_CATEGORIES.find((c) => c.id === fetchedMeta.category);
    if (matched) {
      setSelectedCategory(matched.id);
      setCategoryInput(matched.label);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const parsed = parseContentUrl(url.trim());
    const finalPlatform = detectedPlatform || parsed.platform;

    // Check if platform is enabled by admin
    if (siteSettings) {
      if (finalPlatform === 'youtube' && !siteSettings.allowYouTube) {
        alert('خطا: انتشار و ورود محتوا از پلتفرم یوتیوب در حال حاضر توسط مدیریت غیرفعال شده است.');
        return;
      }
      if (finalPlatform === 'instagram' && !siteSettings.allowInstagram) {
        alert('خطا: انتشار و ورود محتوا از پلتفرم اینستاگرام در حال حاضر توسط مدیریت غیرفعال شده است.');
        return;
      }
      if (finalPlatform === 'aparat' && !siteSettings.allowAparat) {
        alert('خطا: انتشار و ورود محتوا از پلتفرم آپارات در حال حاضر توسط مدیریت غیرفعال شده است.');
        return;
      }
      if (finalPlatform === 'article' && !siteSettings.allowArticles) {
        alert('خطا: انتشار و ورود محتوا از مقالات وب در حال حاضر توسط مدیریت غیرفعال شده است.');
        return;
      }
    }

    // Title fallback
    const finalTitle = title.trim() || fetchedMeta?.title || (
      finalPlatform === 'youtube'
        ? 'ویدیوی یوتیوب'
        : finalPlatform === 'instagram'
        ? 'پست اینستاگرام'
        : finalPlatform === 'aparat'
        ? 'ویدیوی آپارات'
        : `مقاله در ${parsed.sourceDomain}`
    );

    // Description fallback
    const finalDescription = description.trim() || fetchedMeta?.description || (
      finalPlatform === 'youtube'
        ? 'ویدیوی به اشتراک گذاشته شده از یوتیوب.'
        : finalPlatform === 'instagram'
        ? 'پست یا ریلز به اشتراک گذاشته شده از اینستاگرام.'
        : finalPlatform === 'aparat'
        ? 'ویدیوی به اشتراک گذاشته شده از آپارات.'
        : `مقاله تخصصی در ${parsed.sourceDomain}.`
    );

    const finalAuthorName = authorName.trim() || fetchedMeta?.authorName || user?.displayName || 'کاربر گیک کلاب';
    const finalThumbnail = thumbnail.trim() || fetchedMeta?.thumbnail || (
      finalPlatform === 'youtube' && parsed.detectedId
        ? `https://img.youtube.com/vi/${parsed.detectedId}/hqdefault.jpg`
        : finalPlatform === 'instagram'
        ? 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80'
        : finalPlatform === 'aparat'
        ? 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80'
    );

    const rawTags = tagsInput
      .split(/[,،\s]+/)
      .map((t) => t.replace('#', '').trim())
      .filter(Boolean);

    const finalTags = rawTags.length > 0 ? rawTags : (fetchedMeta?.tags || ['محتوا', 'گیک_کلاب']);
    const finalDuration = readingOrWatchTime.trim() || fetchedMeta?.readingOrWatchTime || (
      finalPlatform === 'youtube' ? '۱۰ دقیقه ویدیو' : finalPlatform === 'instagram' ? '۶۰ ثانیه ریلز' : finalPlatform === 'aparat' ? '۱۵ دقیقه ویدیو' : '۵ دقیقه مطالعه'
    );

    // Resolve final Category:
    let finalCategory: Category = 'tech';
    if (selectedCategory !== 'auto') {
      finalCategory = selectedCategory;
    } else if (categoryInput.trim()) {
      // Check if typed text matches any site category
      const matched = SITE_CATEGORIES.find(
        (c) =>
          c.label.toLowerCase() === categoryInput.trim().toLowerCase() ||
          c.id.toLowerCase() === categoryInput.trim().toLowerCase() ||
          c.keywords.some((k) => k.toLowerCase() === categoryInput.trim().toLowerCase())
      );
      if (matched) {
        finalCategory = matched.id;
      } else {
        // Fall back to inference and add typed category to tags
        finalCategory = inferCategoryFromContent(categoryInput, finalTitle, finalTags);
        finalTags.push(categoryInput.trim());
      }
    } else {
      // Automatic detection mode
      finalCategory = fetchedMeta?.category || inferCategoryFromContent(finalTitle, finalDescription, finalTags);
    }

    onAdd({
      title: finalTitle,
      description: finalDescription,
      url: url.trim(),
      platform: finalPlatform,
      embedUrl: embedUrl || parsed.embedUrl,
      thumbnail: finalThumbnail,
      author: {
        name: finalAuthorName,
        avatar: user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        handle: `@${finalAuthorName.replace(/\s+/g, '_').toLowerCase()}`,
        isVerified: false
      },
      category: finalCategory,
      tags: finalTags,
      readingOrWatchTime: finalDuration,
      articleContent: articleContent.trim() || finalDescription,
      sourceDomain: parsed.sourceDomain
    });

    onClose();
  };

  // Helper samples for instant testing
  const handleAutoFillSample = (sampleType: 'yt' | 'ig' | 'aparat' | 'art') => {
    if (sampleType === 'yt') {
      setUrl('https://www.youtube.com/watch?v=fJ9rUzIMcZQ');
      setTitle('');
      setDescription('');
      setSelectedCategory('auto');
      setCategoryInput('');
    } else if (sampleType === 'ig') {
      setUrl('https://www.instagram.com/reel/C7pM8wQxY12/');
      setTitle('');
      setDescription('');
      setSelectedCategory('auto');
      setCategoryInput('');
    } else if (sampleType === 'aparat') {
      setUrl('https://www.aparat.com/v/m435165');
      setTitle('');
      setDescription('');
      setSelectedCategory('auto');
      setCategoryInput('');
    } else {
      setUrl('https://medium.com/@design/ux-trends-deep-dive');
      setTitle('');
      setDescription('');
      setSelectedCategory('auto');
      setCategoryInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-md">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                اشتراک محتوای هوشمند
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  تشخیص خودکار
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                فقط لینک را قرار دهید؛ پلتفرم (یوتیوب، آپارات، اینستاگرام، مقاله)، دسته‌بندی و عنوان استخراج می‌شوند.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Sample Buttons */}
        <div className="px-5 py-2 bg-slate-800/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <span>تست سریع با لینک‌های نمونه:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleAutoFillSample('yt')}
              className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition text-[11px] font-semibold flex items-center gap-1"
            >
              <Youtube className="w-3 h-3 text-red-400" />
              یوتیوب
            </button>
            <button
              type="button"
              onClick={() => handleAutoFillSample('aparat')}
              className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition text-[11px] font-semibold flex items-center gap-1"
            >
              <Video className="w-3 h-3 text-rose-400" />
              آپارات
            </button>
            <button
              type="button"
              onClick={() => handleAutoFillSample('ig')}
              className="px-2.5 py-1 rounded-lg bg-pink-600/20 text-pink-300 border border-pink-500/30 hover:bg-pink-600/30 transition text-[11px] font-semibold flex items-center gap-1"
            >
              <Instagram className="w-3 h-3 text-pink-400" />
              اینستاگرام
            </button>
            <button
              type="button"
              onClick={() => handleAutoFillSample('art')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition text-[11px] font-semibold flex items-center gap-1"
            >
              <Newspaper className="w-3 h-3 text-emerald-400" />
              مقاله وب
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                آدرس اینترنتی محتوا (URL) *
              </span>
              {isLoadingMeta && (
                <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-normal animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  در حال استخراج خودکار مشخصات از پلتفرم...
                </span>
              )}
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="مثال: https://www.youtube.com/watch?v=... یا اینستاگرام یا لینک مقاله"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono dir-ltr text-left"
            />
          </div>

          {/* Secondary Fields Container: 20px extra separation and muted/dimmed when empty */}
          <div
            className={`mt-5 pt-4 border-t border-slate-800/70 space-y-4 transition-all duration-300 ${
              !hasCustomFields
                ? 'opacity-50 hover:opacity-100 focus-within:opacity-100'
                : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 pb-0.5">
              <span className="font-medium flex items-center gap-1.5">
                <span>سایر جزییات محتوا</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (اختیاری - در صورت خالی ماندن خودکار پر می‌شود)
                </span>
              </span>
              {!hasCustomFields && (
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                  خالی (استخراج خودکار)
                </span>
              )}
            </div>

            {/* Auto-extracted metadata banner */}
          {fetchedMeta && (
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-indigo-200 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    اطلاعات پیش‌فرض از پلتفرم استخراج شد
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyFetchedMetadata}
                  className="text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-2.5 py-1 rounded-lg border border-indigo-500/30 flex items-center gap-1 transition"
                >
                  <Wand2 className="w-3 h-3 text-indigo-400" />
                  درج در فیلدهای زیر جهت ویرایش
                </button>
              </div>
              <div className="text-xs text-slate-300 line-clamp-1">
                <strong>عنوان پیش‌فرض:</strong> {fetchedMeta.title}
              </div>
              <div className="text-xs text-slate-400 line-clamp-1">
                <strong>نویسنده / کانال:</strong> {fetchedMeta.authorName} | <strong>مدت:</strong> {fetchedMeta.readingOrWatchTime}
              </div>
              <p className="text-[11px] text-slate-400 pt-0.5">
                * فیلدهای زیر در حالت پیش‌فرض با اطلاعات بالا ذخیره می‌شوند مگر اینکه مقدار دلخواه خود را بنویسید.
              </p>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>عنوان محتوا (اختیاری)</span>
              <span className="text-[11px] text-slate-400 font-normal">
                در صورت خالی ماندن، از پلتفرم کپی می‌شود
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={fetchedMeta?.title ? `پیش‌فرض از پلتفرم: ${fetchedMeta.title}` : 'یک عنوان دلخواه بنویسید یا خالی بگذارید...'}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>خلاصه یا توضیحات (اختیاری)</span>
              <span className="text-[11px] text-slate-400 font-normal">
                در صورت خالی ماندن، از پلتفرم کپی می‌شود
              </span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={fetchedMeta?.description ? `پیش‌فرض از پلتفرم: ${fetchedMeta.description.slice(0, 80)}...` : 'توضیحات دلخواه یا خالی بگذارید تا خودکار پر شود...'}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            />
          </div>

          {/* Category with Auto-detect and Suggestion / Autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative" ref={categoryContainerRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  دسته‌بندی موضوعی
                </label>
                {selectedCategory === 'auto' && (
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <Sparkles className="w-3 h-3" />
                    تشخیص خودکار: {autoInferredCategoryLabel}
                  </span>
                )}
              </div>

              {/* Autocomplete Input */}
              <div className="relative">
                <input
                  type="text"
                  value={selectedCategory === 'auto' ? '' : categoryInput}
                  onChange={(e) => {
                    setCategoryInput(e.target.value);
                    setSelectedCategory('auto'); // Custom typing mode
                    setShowCategoryDropdown(true);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder={
                    selectedCategory === 'auto'
                      ? `تشخیص خودکار (فعلی: ${autoInferredCategoryLabel})`
                      : 'نام دسته‌بندی را وارد کنید...'
                  }
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Autocomplete & Suggestions Dropdown */}
              {showCategoryDropdown && (
                <div className="absolute right-0 left-0 mt-1.5 z-30 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  {/* Default Auto-detect Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('auto')}
                    className={`w-full px-3.5 py-2 text-right text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                      selectedCategory === 'auto'
                        ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      تشخیص خودکار بر اساس محتوا
                    </span>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {autoInferredCategoryLabel}
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />
                  
                  <div className="px-3 py-1 text-[11px] text-slate-400 font-semibold">
                    دسته‌بندی‌های موجود در سایت:
                  </div>

                  {/* List of Site Categories */}
                  {filteredCategorySuggestions.length > 0 ? (
                    filteredCategorySuggestions.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.id, cat.label)}
                          className={`w-full px-3.5 py-2 text-right text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                            isSelected
                              ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                              : 'text-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{cat.label}</span>
                            {categoryInput.trim() && cat.label.includes(categoryInput.trim()) && (
                              <span className="text-[10px] text-indigo-400 font-mono">
                                (منطبق)
                              </span>
                            )}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-2 text-xs text-amber-300 bg-amber-500/10 rounded-lg mx-2 my-1">
                      دسته‌بندی «{categoryInput}» به عنوان موضوع و برچسب جدید ثبت خواهد شد.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>مدت زمان (اختیاری)</span>
              </label>
              <input
                type="text"
                value={readingOrWatchTime}
                onChange={(e) => setReadingOrWatchTime(e.target.value)}
                placeholder={fetchedMeta?.readingOrWatchTime || 'مثال: ۱۰ دقیقه ویدیو'}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Tags & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                برچسب‌ها (اختیاری)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={fetchedMeta?.tags.join(', ') || 'هوش_مصنوعی, تکنولوژی'}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                نام منتشرکننده یا کانال (اختیاری)
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={fetchedMeta?.authorName || user?.displayName || 'نام کانال یا نویسنده'}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Live Preview Toggle */}
          {url && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? 'مخفی کردن پیش‌نمایش امبد' : 'مشاهده پیش‌نمایش امبد'}
              </button>

              {showPreview && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>پیش‌نمایش زنده امبد:</span>
                    <span className="font-mono text-[10px] text-indigo-300 dir-ltr">{embedUrl || url}</span>
                  </div>

                  {detectedPlatform === 'youtube' && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={embedUrl}
                        title="پیش‌نمایش یوتیوب"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {detectedPlatform === 'aparat' && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={embedUrl}
                        title="پیش‌نمایش آپارات"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {detectedPlatform === 'instagram' && (
                    <div className="p-4 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                      پست اینستاگرام شناسایی شده از آدرس: <span className="font-mono text-pink-400">{url}</span>
                    </div>
                  )}

                  {detectedPlatform === 'article' && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <h4 className="font-bold text-slate-200 text-sm">
                        {title || fetchedMeta?.title || 'عنوان مقاله'}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {description || fetchedMeta?.description || 'خلاصه مقاله'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>

          {/* Moderation approval status notice */}
          {requireApproval && !user?.isAdmin && !user?.autoApproveContent ? (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>تأیید محتوا توسط مدیریت فعال است؛ پست شما پس از بازبینی و تأیید ادمین در فید اصلی نمایش داده خواهد شد.</span>
            </div>
          ) : user?.autoApproveContent || user?.isAdmin ? (
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>حساب شما دارای مجوز <strong>انتشار مستقیم</strong> است و پست بلافاصله در سایت منتشر می‌شود.</span>
            </div>
          ) : null}

          {/* Google reCAPTCHA Widget (If enabled by Admin) */}
          {siteSettings?.enableCaptcha && (
            <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recaptcha_checkbox"
                  checked={captchaVerified}
                  onChange={(e) => setCaptchaVerified(e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
                <label htmlFor="recaptcha_checkbox" className="text-xs text-slate-300 cursor-pointer select-none">
                  من ربات نیستم <span className="text-[10px] text-slate-400 font-mono block">reCAPTCHA (تایید امنیتی گوگل)</span>
                </label>
              </div>

              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
                <span className="text-blue-400 font-bold">reCAPTCHA</span>
                <span>Privacy - Terms</span>
              </div>
            </div>
          )}

          {/* Submit & Cancel Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!url.trim() || (Boolean(siteSettings?.enableCaptcha) && !captchaVerified)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                انتشار محتوا
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};
