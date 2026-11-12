import React, { useState } from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  Youtube, 
  Instagram, 
  Newspaper, 
  Grid3X3, 
  Grid2X2, 
  LayoutList, 
  Flame, 
  MessageSquare, 
  ThumbsUp, 
  Clock, 
  Video, 
  Check, 
  Bookmark, 
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import { Platform, Category, SortOption, ViewMode } from '../../types/content';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPlatform: Platform | 'all';
  onPlatformChange: (p: Platform | 'all') => void;
  selectedCategory: Category;
  onCategoryChange: (c: Category) => void;
  sortOption: SortOption;
  onSortChange: (s: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  totalFilteredCount: number;
  totalCount: number;
  onResetFilters: () => void;
  activeFilterCount: number;
  showSavedOnly?: boolean;
  onToggleSavedOnly?: () => void;
  savedCount?: number;
  isAdmin?: boolean;
  showTrashOnly?: boolean;
  onToggleTrashOnly?: () => void;
  trashCount?: number;
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'همه موضوعات' },
  { id: 'ai', label: 'هوش مصنوعی' },
  { id: 'programming', label: 'برنامه‌نویسی' },
  { id: 'tech', label: 'تکنولوژی' },
  { id: 'design', label: 'طراحی رابط کاربری' },
  { id: 'business', label: 'استارتاپ و بیزینس' },
  { id: 'entertainment', label: 'سرگرمی و رسانه' },
  { id: 'science', label: 'علم و پژوهش' }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  selectedCategory,
  onCategoryChange,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalFilteredCount,
  totalCount,
  onResetFilters,
  activeFilterCount,
  showSavedOnly = false,
  onToggleSavedOnly,
  savedCount = 0,
  isAdmin = false,
  showTrashOnly = false,
  onToggleTrashOnly,
  trashCount = 0
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  return (
    <div 
      id="feed-right-sidebar"
      className="feed-right-sidebar w-full lg:w-80 xl:w-84 shrink-0 lg:sticky lg:top-24 bg-slate-900/90 light:bg-white/95 backdrop-blur-xl border border-slate-800/80 light:border-slate-200/90 rounded-[1.75rem] p-4 sm:p-5 shadow-2xl shadow-slate-950/20 space-y-5 text-right select-none transition-all duration-300"
      dir="rtl"
    >
      {/* 1. Sidebar Header */}
      <div className="feed-sidebar-header flex items-center justify-between border-b border-slate-800/80 light:border-slate-200/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0077d9] text-white flex items-center justify-center shadow-md shadow-[#0077d9]/30 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 light:text-slate-900">
              فیلترها و دسته‌بندی
            </h3>
            <span className="text-[11px] text-slate-400 light:text-slate-500 font-medium">
              ناوبری محتوای گیک کلاب
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              id="btn-filter-reset-top"
              className="btn-filter-reset text-[11px] font-bold text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition flex items-center gap-1 cursor-pointer"
              title="پاک کردن تمام فیلترها"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ریست ({activeFilterCount})</span>
            </button>
          )}

          {/* Mobile Accordion Toggle Button */}
          <button
            type="button"
            id="btn-feed-sidebar-toggle"
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="btn-feed-sidebar-toggle lg:hidden p-1.5 rounded-xl bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white transition cursor-pointer"
            title={isMobileExpanded ? 'بستن فیلترها' : 'مشاهده تمام فیلترها'}
          >
            {isMobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Tonal Search Field */}
      <div className="feed-sidebar-search-container relative group">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0077d9] transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          id="searchInput"
          name="searchQuery"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="جستجو در عناوین، هشتگ‌ها، نام..."
          className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-slate-800/80 light:bg-slate-100 border border-slate-700/80 light:border-slate-300 text-slate-100 light:text-slate-900 placeholder-slate-400 light:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#0077d9]/40 focus:border-[#0077d9] transition-all font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-white transition cursor-pointer"
            title="پاک کردن جستجو"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapsible Content Body on Mobile, Always Visible on Desktop (lg:block) */}
      <div className={`feed-sidebar-content-body space-y-5 ${isMobileExpanded ? 'block' : 'hidden lg:block'}`}>
        
        {/* 3. Platform Filter Section */}
        <div className="feed-sidebar-section feed-sidebar-platforms space-y-2">
          <span className="feed-sidebar-section-title text-xs font-bold text-slate-300 light:text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#0077d9]" />
            انتخاب پلتفرم
          </span>

          <div className="flex flex-col gap-1.5">
            {/* All Platforms */}
            <button
              id="btn-filter-platform-all"
              onClick={() => onPlatformChange('all')}
              className={`btn-filter-platform-all w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'all'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/25 font-black'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>همه پلتفرم‌ها</span>
              </div>
              {selectedPlatform === 'all' && <Check className="w-3.5 h-3.5 text-white" />}
            </button>

            {/* YouTube */}
            <button
              id="btn-filter-platform-youtube"
              onClick={() => onPlatformChange('youtube')}
              className={`btn-filter-platform-youtube w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'youtube'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30 font-black'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                <span>ویدیوهای یوتیوب</span>
              </div>
              {selectedPlatform === 'youtube' && <Check className="w-3.5 h-3.5 text-white" />}
            </button>

            {/* Instagram */}
            <button
              id="btn-filter-platform-instagram"
              onClick={() => onPlatformChange('instagram')}
              className={`btn-filter-platform-instagram w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'instagram'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/30 font-black'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5 text-pink-500" />
                <span>پست و ریلز اینستاگرام</span>
              </div>
              {selectedPlatform === 'instagram' && <Check className="w-3.5 h-3.5 text-white" />}
            </button>

            {/* Aparat */}
            <button
              id="btn-filter-platform-aparat"
              onClick={() => onPlatformChange('aparat')}
              className={`btn-filter-platform-aparat w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'aparat'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-rose-500" />
                <span>ویدیوهای آپارات</span>
              </div>
              {selectedPlatform === 'aparat' && <Check className="w-3.5 h-3.5 text-white" />}
            </button>

            {/* Web Articles */}
            <button
              id="btn-filter-platform-article"
              onClick={() => onPlatformChange('article')}
              className={`btn-filter-platform-article w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'article'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Newspaper className="w-3.5 h-3.5 text-emerald-500" />
                <span>مقالات تخصصی وب</span>
              </div>
              {selectedPlatform === 'article' && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </div>

        {/* 4. Category Filter Section */}
        <div className="feed-sidebar-section feed-sidebar-categories space-y-2 border-t border-slate-800/80 light:border-slate-200/80 pt-4">
          <span className="feed-sidebar-section-title text-xs font-bold text-slate-300 light:text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#0077d9]" />
            موضوعات و دسته‌بندی‌ها
          </span>

          <div className="grid grid-cols-1 gap-1">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`btn-filter-category-${cat.id}`}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`btn-filter-category btn-filter-category-${cat.id} w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0077d9] text-white font-black shadow-md shadow-[#0077d9]/25'
                      : 'text-slate-300 light:text-slate-700 hover:text-white hover:bg-slate-800/70 light:hover:bg-slate-200/80 font-medium'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Sort Options Section */}
        <div className="feed-sidebar-section feed-sidebar-sorting space-y-2 border-t border-slate-800/80 light:border-slate-200/80 pt-4">
          <span className="feed-sidebar-section-title text-xs font-bold text-slate-300 light:text-slate-700 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            مرتب‌سازی مطالب
          </span>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="btn-filter-sort-newest"
              onClick={() => onSortChange('newest')}
              className={`btn-filter-sort btn-filter-sort-newest flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortOption === 'newest'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/25'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>جدیدترین</span>
            </button>

            <button
              id="btn-filter-sort-most_liked"
              onClick={() => onSortChange('most_liked')}
              className={`btn-filter-sort btn-filter-sort-most_liked flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortOption === 'most_liked'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/25'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>محبوب‌ترین</span>
            </button>

            <button
              id="btn-filter-sort-most_comments"
              onClick={() => onSortChange('most_comments')}
              className={`btn-filter-sort btn-filter-sort-most_comments flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortOption === 'most_comments'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/25'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>پربحث‌ترین</span>
            </button>

            <button
              id="btn-filter-sort-trending"
              onClick={() => onSortChange('trending')}
              className={`btn-filter-sort btn-filter-sort-trending flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortOption === 'trending'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/25'
                  : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>داغ‌ترین</span>
            </button>
          </div>
        </div>

        {/* 6. View Mode Section */}
        <div className="feed-sidebar-section feed-sidebar-viewmode space-y-2 border-t border-slate-800/80 light:border-slate-200/80 pt-4">
          <span className="feed-sidebar-section-title text-xs font-bold text-slate-300 light:text-slate-700 flex items-center gap-1.5">
            <Grid3X3 className="w-3.5 h-3.5 text-[#0077d9]" />
            حالت چینش کارت‌ها
          </span>

          <div className="space-y-1.5">
            {/* Row 1: Grid 6, Grid 5, Grid 4 */}
            <div className="flex items-center gap-1 bg-slate-800/80 light:bg-slate-100 border border-slate-750 light:border-slate-200 rounded-2xl p-1">
              <button
                id="btn-filter-viewmode-grid6"
                onClick={() => onViewModeChange('grid6')}
                className={`btn-filter-viewmode btn-filter-viewmode-grid6 flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  viewMode === 'grid6'
                    ? 'bg-[#0077d9] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمای گرید ۶ تایی"
              >
                <span>گرید ۶</span>
              </button>

              <button
                id="btn-filter-viewmode-grid5"
                onClick={() => onViewModeChange('grid5')}
                className={`btn-filter-viewmode btn-filter-viewmode-grid5 flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  viewMode === 'grid5'
                    ? 'bg-[#0077d9] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمای گرید ۵ تایی"
              >
                <span>گرید ۵</span>
              </button>

              <button
                id="btn-filter-viewmode-grid4"
                onClick={() => onViewModeChange('grid4')}
                className={`btn-filter-viewmode btn-filter-viewmode-grid4 flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  viewMode === 'grid4'
                    ? 'bg-[#0077d9] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمای گرید ۴ تایی"
              >
                <span>گرید ۴</span>
              </button>
            </div>

            {/* Row 2: Grid 3, Grid 2, Compact */}
            <div className="flex items-center gap-1 bg-slate-800/80 light:bg-slate-100 border border-slate-750 light:border-slate-200 rounded-2xl p-1">
              <button
                id="btn-filter-viewmode-grid3"
                onClick={() => onViewModeChange('grid3')}
                className={`btn-filter-viewmode btn-filter-viewmode-grid3 flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  viewMode === 'grid3'
                    ? 'bg-[#0077d9] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمای گرید ۳ تایی"
              >
                <span>گرید ۳</span>
              </button>

              <button
                id="btn-filter-viewmode-grid2"
                onClick={() => onViewModeChange('grid2')}
                className={`btn-filter-viewmode btn-filter-viewmode-grid2 flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  viewMode === 'grid2'
                    ? 'bg-[#0077d9] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمای گرید ۲ تایی"
              >
                <span>گرید ۲</span>
              </button>

              <button
                id="btn-filter-viewmode-compact"
                onClick={() => onViewModeChange('compact')}
                className={`btn-filter-viewmode btn-filter-viewmode-compact flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-[#0077d9] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمای فشرده"
              >
                <span>فشرده</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7. Special Lists (Saved / Trash) */}
        {(onToggleSavedOnly || (isAdmin && onToggleTrashOnly)) && (
          <div className="feed-sidebar-section feed-sidebar-shortcuts space-y-2 border-t border-slate-800/80 light:border-slate-200/80 pt-4">
            <span className="feed-sidebar-section-title text-xs font-bold text-slate-300 light:text-slate-700 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              بخش‌های ویژه
            </span>

            <div className="space-y-1.5">
              {onToggleSavedOnly && (
                <button
                  id="btn-filter-saved"
                  onClick={onToggleSavedOnly}
                  className={`btn-filter-saved w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    showSavedOnly
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bookmark className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                    <span>مطالب نشان‌شده (ذخیره‌ها)</span>
                  </div>
                  {savedCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      showSavedOnly ? 'bg-slate-950 text-amber-300' : 'bg-[#0077d9] text-white'
                    }`}>
                      {savedCount}
                    </span>
                  )}
                </button>
              )}

              {isAdmin && onToggleTrashOnly && (
                <button
                  id="btn-filter-trash"
                  onClick={onToggleTrashOnly}
                  className={`btn-filter-trash w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    showTrashOnly
                      ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/30'
                      : 'bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-750 light:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>سطل زباله محتواها</span>
                  </div>
                  {trashCount !== undefined && trashCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                      {trashCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 8. Stats Footer */}
        <div className="feed-sidebar-footer border-t border-slate-800/80 light:border-slate-200/80 pt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400 light:text-slate-600 font-medium">
            <span>تعداد نتایج:</span>
            <span className="font-bold text-slate-100 light:text-slate-900 font-mono">
              {totalFilteredCount} از {totalCount} محتوا
            </span>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              id="btn-filter-reset-bottom"
              className="btn-filter-reset w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 light:bg-slate-200 light:hover:bg-slate-300 text-slate-200 light:text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700/80 light:border-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>پاک کردن فیلترها ({activeFilterCount})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
