import React from 'react';
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
  TrendingUp, 
  MessageSquare, 
  ThumbsUp, 
  Clock,
  Sparkles,
  Video,
  Check,
  Bookmark,
  Trash2
} from 'lucide-react';
import { Platform, Category, SortOption, ViewMode } from '../types/content';

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
  return (
    <div className="gc-filter-bar bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-[1.75rem] p-4 sm:p-5 shadow-2xl shadow-slate-950/20 space-y-4">
      {/* Top Row: M3 Search Field + M3 Segmented Sort Buttons + M3 View Mode Toggle */}
      <div className="gc-filter-top-row flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* M3 Tonal Search Container */}
        <div className="gc-search-container relative flex-1 group">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#ce3df3] transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="searchInput"
            name="searchQuery"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجو در عناوین، هشتگ‌ها، نام نویسنده یا متن..."
            className="input-daily input-search-query w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#ce3df3]/25 focus:border-[#ce3df3] transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="btn-clear-search absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* M3 Segmented Sort & View Controls */}
        <div className="gc-controls-group flex items-center gap-2 justify-between lg:justify-end flex-wrap">
          {/* M3 Segmented Sort Button Container */}
          <div className="gc-sort-container flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-1 text-xs">
            <span className="text-slate-400 px-2 hidden sm:inline-flex items-center gap-1.5 font-bold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              مرتب‌سازی:
            </span>
            <button
              onClick={() => onSortChange('newest')}
              className={`btn-sort btn-sort-newest px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                sortOption === 'newest'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline ml-1 sm:hidden" />
              جدیدترین
            </button>
            <button
              onClick={() => onSortChange('most_liked')}
              className={`btn-sort btn-sort-most-liked px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                sortOption === 'most_liked'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5 inline ml-1 sm:hidden" />
              محبوب‌ترین
            </button>
            <button
              onClick={() => onSortChange('most_comments')}
              className={`btn-sort btn-sort-most-comments px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                sortOption === 'most_comments'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline ml-1 sm:hidden" />
              پربحث‌ترین
            </button>
            <button
              onClick={() => onSortChange('trending')}
              className={`btn-sort btn-sort-trending px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                sortOption === 'trending'
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 inline ml-1 ${sortOption === 'trending' ? 'text-white' : 'text-amber-400'}`} />
              <span className={sortOption === 'trending' ? 'text-white' : ''}>داغ</span>
            </button>
          </div>

          {/* M3 Segmented View Mode Controls */}
          <div className="gc-view-mode-container flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-1">
            <button
              onClick={() => onViewModeChange('grid3')}
              className={`btn-view-mode btn-view-grid3 p-2 rounded-xl transition cursor-pointer ${
                viewMode === 'grid3' ? 'bg-[#0077d9] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای گرید ۳ تایی"
            >
              <Grid3X3 className={`w-4 h-4 ${viewMode === 'grid3' ? 'text-white' : ''}`} />
            </button>
            <button
              onClick={() => onViewModeChange('grid2')}
              className={`btn-view-mode btn-view-grid2 p-2 rounded-xl transition cursor-pointer ${
                viewMode === 'grid2' ? 'bg-[#0077d9] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای کارت عریض"
            >
              <Grid2X2 className={`w-4 h-4 ${viewMode === 'grid2' ? 'text-white' : ''}`} />
            </button>
            <button
              onClick={() => onViewModeChange('compact')}
              className={`btn-view-mode btn-view-compact p-2 rounded-xl transition cursor-pointer ${
                viewMode === 'compact' ? 'bg-[#0077d9] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای فشرده"
            >
              <LayoutList className={`w-4 h-4 ${viewMode === 'compact' ? 'text-white' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: M3 Platform Filter Tonal Chips */}
      <div className="gc-platform-filters flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800/80">
        <span className="text-xs font-bold text-slate-400 ml-1">پلتفرم:</span>
        
        {/* All Platform */}
        <button
          onClick={() => onPlatformChange('all')}
          className={`btn-platform-chip btn-platform-all px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedPlatform === 'all'
              ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750'
          }`}
        >
          <span className={selectedPlatform === 'all' ? 'text-white' : ''}>همه پلتفرم‌ها</span>
        </button>

        {/* YouTube */}
        <button
          onClick={() => onPlatformChange('youtube')}
          className={`btn-platform-chip btn-platform-youtube px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            selectedPlatform === 'youtube'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:text-white'
          }`}
        >
          <Youtube className={`w-4 h-4 ${selectedPlatform === 'youtube' ? 'text-white' : 'text-red-500'}`} />
          <span>ویدیوهای یوتیوب</span>
        </button>

        {/* Aparat */}
        <button
          onClick={() => onPlatformChange('aparat')}
          className={`btn-platform-chip btn-platform-aparat px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            selectedPlatform === 'aparat'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:text-white'
          }`}
        >
          <Video className={`w-4 h-4 ${selectedPlatform === 'aparat' ? 'text-white' : 'text-rose-500'}`} />
          <span>ویدیوهای آپارات</span>
        </button>

        {/* Instagram */}
        <button
          onClick={() => onPlatformChange('instagram')}
          className={`btn-platform-chip btn-platform-instagram px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            selectedPlatform === 'instagram'
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-rose-500/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:text-white'
          }`}
        >
          <Instagram className={`w-4 h-4 ${selectedPlatform === 'instagram' ? 'text-white' : 'text-pink-500'}`} />
          <span>پست و ریلز اینستاگرام</span>
        </button>

        {/* Articles */}
        <button
          onClick={() => onPlatformChange('article')}
          className={`btn-platform-chip btn-platform-article px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            selectedPlatform === 'article'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:text-white'
          }`}
        >
          <Newspaper className={`w-4 h-4 ${selectedPlatform === 'article' ? 'text-white' : 'text-emerald-500'}`} />
          <span>مقالات وبسایت‌ها</span>
        </button>

        {/* Saved Items Filter Chip */}
        {onToggleSavedOnly && (
          <button
            onClick={onToggleSavedOnly}
            className={`btn-filter-saved px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              showSavedOnly
                ? 'bg-[#0077d9] text-white shadow-lg shadow-[#0077d9]/30 font-black'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:text-white'
            }`}
            title="نمایش فقط مطالب نشان‌شده و ذخیره شده"
          >
            <Bookmark className={`w-4 h-4 ${showSavedOnly ? 'fill-white text-white' : 'text-amber-400'}`} />
            <span className={showSavedOnly ? 'text-white' : ''}>نشان‌شده‌ها (ذخیره‌ها)</span>
            {savedCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-black ${
                showSavedOnly ? 'bg-white text-[#0077d9]' : 'bg-[#0077d9] text-white'
              }`}>
                {savedCount}
              </span>
            )}
          </button>
        )}

        {/* Trash Filter Chip for Admin */}
        {isAdmin && onToggleTrashOnly && (
          <button
            onClick={onToggleTrashOnly}
            className={`btn-filter-trash px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              showTrashOnly
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-black ring-2 ring-rose-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:text-rose-300'
            }`}
            title="نمایش محتواهای منتقل شده به سطل زباله"
          >
            <Trash2 className={`w-4 h-4 ${showTrashOnly ? 'text-white' : 'text-rose-400'}`} />
            <span className={showTrashOnly ? 'text-white' : ''}>سطل زباله</span>
            {trashCount !== undefined && trashCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-black ${
                showTrashOnly ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
              }`}>
                {trashCount}
              </span>
            )}
          </button>
        )}

        {/* Filter Reset Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="btn-reset-filters mr-auto text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-indigo-500/10 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            پاک کردن فیلترها ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Bottom Row: M3 Category Filter Chips */}
      <div className="gc-category-filters flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
        <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">دسته‌بندی:</span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`btn-category-chip btn-category-${cat.id} px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#0077d9] text-white shadow-md shadow-[#0077d9]/30'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-750'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Material Status Footer */}
      <div className="gc-filter-footer flex items-center justify-between text-xs text-slate-400 pt-1 font-medium">
        <div className="flex items-center gap-2 flex-wrap">
          <span>نمایش <strong className="text-slate-100 font-black">{totalFilteredCount}</strong> مورد از {totalCount} محتوا</span>
          {searchQuery && (
            <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-2.5 py-0.5 rounded-lg text-[11px] font-bold">
              نتیجه برای: "{searchQuery}"
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

