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
  Sparkles
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
  activeFilterCount
}) => {
  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top Row: Search Input + Sort Dropdown + View Mode Switches */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Field */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجو در عناوین، هشتگ‌ها، نام نویسنده یا محتوا..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort & View Mode Controls */}
        <div className="flex items-center gap-2 justify-between lg:justify-end flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/70 rounded-2xl p-1 text-xs">
            <span className="text-slate-400 px-2 hidden sm:inline flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              مرتب‌سازی:
            </span>
            <button
              onClick={() => onSortChange('newest')}
              className={`px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                sortOption === 'newest'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline ml-1 sm:hidden" />
              جدیدترین
            </button>
            <button
              onClick={() => onSortChange('most_liked')}
              className={`px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                sortOption === 'most_liked'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5 inline ml-1 sm:hidden" />
              محبوب‌ترین
            </button>
            <button
              onClick={() => onSortChange('most_comments')}
              className={`px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                sortOption === 'most_comments'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline ml-1 sm:hidden" />
              پربحث‌ترین
            </button>
            <button
              onClick={() => onSortChange('trending')}
              className={`px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                sortOption === 'trending'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 inline ml-1 text-amber-400" />
              داغ
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/70 rounded-2xl p-1">
            <button
              onClick={() => onViewModeChange('grid3')}
              className={`p-1.5 rounded-xl transition ${
                viewMode === 'grid3' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای گرید ۳ تایی"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('grid2')}
              className={`p-1.5 rounded-xl transition ${
                viewMode === 'grid2' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای کارت عریض"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('compact')}
              className={`p-1.5 rounded-xl transition ${
                viewMode === 'compact' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای فشرده"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Platform Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
        <span className="text-xs text-slate-400 ml-1">پلتفرم:</span>
        
        {/* All Platform */}
        <button
          onClick={() => onPlatformChange('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedPlatform === 'all'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
          }`}
        >
          <span>همه پلتفرم‌ها</span>
        </button>

        {/* YouTube */}
        <button
          onClick={() => onPlatformChange('youtube')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            selectedPlatform === 'youtube'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:text-white'
          }`}
        >
          <Youtube className={`w-4 h-4 ${selectedPlatform === 'youtube' ? 'text-white' : 'text-red-500'}`} />
          <span>ویدیوهای یوتیوب</span>
        </button>

        {/* Instagram */}
        <button
          onClick={() => onPlatformChange('instagram')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            selectedPlatform === 'instagram'
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-rose-500/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:text-white'
          }`}
        >
          <Instagram className={`w-4 h-4 ${selectedPlatform === 'instagram' ? 'text-white' : 'text-pink-500'}`} />
          <span>پست و ریلز اینستاگرام</span>
        </button>

        {/* Articles */}
        <button
          onClick={() => onPlatformChange('article')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            selectedPlatform === 'article'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:text-white'
          }`}
        >
          <Newspaper className={`w-4 h-4 ${selectedPlatform === 'article' ? 'text-white' : 'text-emerald-500'}`} />
          <span>مقالات وبسایت‌ها</span>
        </button>

        {/* Filter Reset Button if any filter applied */}
        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="mr-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-500/10 transition"
          >
            <X className="w-3.5 h-3.5" />
            پاک کردن فیلترها ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Bottom Row: Category Chips / Tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
        <span className="text-xs text-slate-400 shrink-0 ml-1">دسته‌بندی:</span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filter Status Badge */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-2">
          <span>نمایش <strong className="text-slate-200">{totalFilteredCount}</strong> مورد از {totalCount} محتوا</span>
          {searchQuery && (
            <span className="bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded-md">
              نتیجه جستجو برای: "{searchQuery}"
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
