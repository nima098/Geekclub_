import React, { useState, useMemo } from 'react';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  EyeOff, 
  Eye, 
  AtSign, 
  Image as ImageIcon, 
  MessageSquare, 
  Inbox, 
  ShieldCheck, 
  Check, 
  Save, 
  Camera, 
  Sparkles, 
  Send, 
  Bell, 
  ToggleLeft, 
  ToggleRight,
  Crown,
  Clock,
  Trash2,
  List,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Youtube,
  Instagram,
  Newspaper,
  BookOpen,
  Filter,
  CheckCircle2,
  Clock3,
  XCircle,
  Award,
  Layers
} from 'lucide-react';
import { UserProfile, InboxMessage, ProfileComment, ContentItem, Platform } from '../types/content';
import { ImageCDNUpload } from './ImageCDNUpload';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  contents?: ContentItem[];
  onUpdateUser: (updated: UserProfile) => void;
  inbox: InboxMessage[];
  onMarkMessageRead: (messageId: string) => void;
  profileComments: ProfileComment[];
  onAddProfileComment: (text: string) => void;
  onOpenArticle?: (item: ContentItem) => void;
  onOpenComments?: (item: ContentItem) => void;
}

// Preset avatars for quick selection
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=250&q=80'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  contents = [],
  onUpdateUser,
  inbox,
  onMarkMessageRead,
  profileComments,
  onAddProfileComment,
  onOpenArticle,
  onOpenComments
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'my_contents' | 'inbox' | 'guestbook'>('my_contents');

  // Form states
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username || user.email.split('@')[0]);
  const [photoURL, setPhotoURL] = useState(user.photoURL);
  const [hideEmail, setHideEmail] = useState(user.hideEmail || false);
  const [allowProfileComments, setAllowProfileComments] = useState(
    user.allowProfileComments !== undefined ? user.allowProfileComments : true
  );
  const [bio, setBio] = useState(user.bio || '');

  // Custom avatar URL input toggle
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Selected message for details view
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);

  // Profile comment input
  const [newCommentText, setNewCommentText] = useState('');

  // My Contents Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');

  if (!isOpen) return null;

  // Derive user's shared contents
  const userContents = contents.filter((c) => {
    const matchUid = c.authorUid && user.uid && c.authorUid === user.uid;
    const matchName = c.author?.name && user.displayName && c.author.name.trim().toLowerCase() === user.displayName.trim().toLowerCase();
    const matchHandle = user.username && c.author?.handle && c.author.handle.toLowerCase().includes(user.username.toLowerCase());
    return matchUid || matchName || matchHandle;
  });

  // Net Reputation Score = Likes - Dislikes
  const totalLikes = userContents.reduce((sum, c) => sum + (c.likesCount || 0), 0);
  const totalDislikes = userContents.reduce((sum, c) => sum + (c.dislikesCount || 0), 0);
  const netScore = totalLikes - totalDislikes;

  const approvedCount = userContents.filter((c) => c.approvalStatus === 'approved').length;
  const pendingCount = userContents.filter((c) => c.approvalStatus === 'pending').length;
  const rejectedCount = userContents.filter((c) => c.approvalStatus === 'rejected').length;

  // Filtered list
  const filteredUserContents = userContents.filter((c) => {
    if (filterStatus === 'approved' && c.approvalStatus !== 'approved') return false;
    if (filterStatus === 'pending' && c.approvalStatus !== 'pending') return false;
    if (filterStatus === 'rejected' && c.approvalStatus !== 'rejected') return false;

    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;

    return true;
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      displayName: displayName.trim() || user.displayName,
      username: username.trim().replace(/^@/, '') || 'user',
      photoURL,
      hideEmail,
      allowProfileComments,
      bio: bio.trim()
    });
    onClose();
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoURL(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddProfileComment(newCommentText.trim());
    setNewCommentText('');
  };

  const unreadCount = inbox.filter((m) => !m.read).length;

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-400" />;
      case 'aparat':
        return <VideoIcon className="w-4 h-4 text-rose-500" />;
      case 'article':
      default:
        return <Newspaper className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 gap-3">
          <div className="flex items-center gap-3">
            <img
              src={photoURL}
              alt={displayName}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-100">
                  {displayName}
                </h3>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md dir-ltr">
                  @{username}
                </span>
              </div>

              {/* Net Reputation Score & Contents count badges */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span 
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-xl flex items-center gap-1.5 border shadow-sm ${
                    netScore > 0 
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                      : netScore < 0 
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="امتیاز اعتبار کاربر = مجموع لایک‌ها منهای دیس‌لایک‌های تمام محتواهای کاربر"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>امتیاز اعتبار:</span>
                  <span className="font-mono text-sm font-black dir-ltr">
                    {netScore > 0 ? `+${netScore}` : netScore}
                  </span>
                </span>

                <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 font-medium">
                  {userContents.length} پست اشتراک گذاشته شده
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 pt-3 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('my_contents')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'my_contents'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            محتواهای من
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
              {userContents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            تنظیمات پروفایل
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition relative whitespace-nowrap ${
              activeTab === 'inbox'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className="w-4 h-4" />
            پیام‌ها
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('guestbook')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'guestbook'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            دیدگاه‌های دیواری
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {profileComments.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* 1. My Shared Contents Tab */}
          {activeTab === 'my_contents' && (
            <div className="space-y-5">
              {/* Summary Stats Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">کل پست‌ها</span>
                  <span className="text-base font-mono font-bold text-slate-100">{userContents.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 block mb-0.5">مجموع لایک‌ها</span>
                  <span className="text-base font-mono font-bold text-emerald-300">+{totalLikes}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] text-rose-400 block mb-0.5">مجموع دیس‌لایک‌ها</span>
                  <span className="text-base font-mono font-bold text-rose-300">-{totalDislikes}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-400 block mb-0.5">امتیاز خالص</span>
                  <span className="text-base font-mono font-bold text-amber-300 dir-ltr">
                    {netScore > 0 ? `+${netScore}` : netScore}
                  </span>
                </div>
              </div>

              {/* Interactive Filters Bar */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
                {/* Status Filter */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" />
                    وضعیت انتشار:
                  </span>

                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-750">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition ${
                        filterStatus === 'all'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      همه ({userContents.length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('approved')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition ${
                        filterStatus === 'approved'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      منتشر شده ({approvedCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('pending')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition ${
                        filterStatus === 'pending'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      در انتظار ({pendingCount})
                    </button>
                    {rejectedCount > 0 && (
                      <button
                        onClick={() => setFilterStatus('rejected')}
                        className={`px-2.5 py-1 text-xs rounded-lg transition ${
                          filterStatus === 'rejected'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        رد شده ({rejectedCount})
                      </button>
                    )}
                  </div>
                </div>

                {/* Platform Filter */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-300">پلتفرم:</span>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-750">
                    <button
                      onClick={() => setFilterPlatform('all')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition ${
                        filterPlatform === 'all'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      همه
                    </button>
                    <button
                      onClick={() => setFilterPlatform('youtube')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 ${
                        filterPlatform === 'youtube'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Youtube className="w-3 h-3 text-red-400" />
                      یوتیوب
                    </button>
                    <button
                      onClick={() => setFilterPlatform('instagram')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 ${
                        filterPlatform === 'instagram'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Instagram className="w-3 h-3 text-pink-400" />
                      اینستاگرام
                    </button>
                    <button
                      onClick={() => setFilterPlatform('article')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 ${
                        filterPlatform === 'article'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Newspaper className="w-3 h-3 text-emerald-400" />
                      مقاله
                    </button>
                    <button
                      onClick={() => setFilterPlatform('aparat')}
                      className={`px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 ${
                        filterPlatform === 'aparat'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      آپارات
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact Contents List */}
              <div className="space-y-2.5">
                {filteredUserContents.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-800 text-xs space-y-2">
                    <Layers className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                    <p>هیچ محتوایی با فیلترهای انتخابی یافت نشد.</p>
                  </div>
                ) : (
                  filteredUserContents.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 hover:bg-slate-800/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Thumbnail */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-700/60">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        </div>

                        {/* Text details */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getPlatformIcon(item.platform)}
                            <h4 className="text-xs sm:text-sm font-bold text-slate-200 truncate group-hover:text-indigo-300 transition">
                              {item.title}
                            </h4>
                          </div>

                          {/* Inline Metadata */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                            <span>{item.publishedAt}</span>
                            <span>·</span>
                            <span>{item.readingOrWatchTime}</span>

                            {/* Approval Status Badge */}
                            {item.approvalStatus === 'approved' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                منتشر شده
                              </span>
                            )}
                            {item.approvalStatus === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                                <Clock3 className="w-3 h-3" />
                                در انتظار بررسی ادمین
                              </span>
                            )}
                            {item.approvalStatus === 'rejected' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 font-medium">
                                <XCircle className="w-3 h-3" />
                                رد شده
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Metrics & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 shrink-0">
                        {/* Metrics */}
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20" title="لایک‌ها">
                            <ThumbsUp className="w-3 h-3" />
                            {item.likesCount || 0}
                          </span>
                          <span className="text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20" title="دیس‌لایک‌ها">
                            <ThumbsDown className="w-3 h-3" />
                            {item.dislikesCount || 0}
                          </span>
                          <span className="text-slate-300 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700" title="دیدگاه‌ها">
                            <MessageSquare className="w-3 h-3 text-indigo-400" />
                            {item.commentsCount || 0}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          {item.platform === 'article' && onOpenArticle && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenArticle(item);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="خواندن کامل مقاله"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">مشاهده</span>
                            </button>
                          )}

                          {onOpenComments && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenComments(item);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="مشاهده نظرات"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="hidden sm:inline">نظرات</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. Settings & Profile Tab */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar Selection Section */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-400" />
                  عکس پروفایل کاربری
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group">
                    <img
                      src={photoURL}
                      alt="پیش‌نمایش"
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500 shadow-lg"
                    />
                    <label 
                      htmlFor="avatar-file-upload" 
                      className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px]"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      تغییر عکس
                    </label>
                    <input
                      id="avatar-file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-right">
                    <p className="text-xs text-slate-300 font-medium">
                      یکی از آواتارهای منتخب را انتخاب کنید یا عکس دلخواه خود را آپلود فرمایید:
                    </p>
                    
                    {/* Preset Avatars Grid */}
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {PRESET_AVATARS.map((avatar, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPhotoURL(avatar)}
                          className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition ${
                            photoURL === avatar ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/30' : 'border-transparent hover:border-slate-600'
                          }`}
                        >
                          <img src={avatar} alt="آواتار" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>

                      {/* CDN Avatar Upload */}
                      <div className="pt-2">
                        <ImageCDNUpload
                          currentUrl={photoURL}
                          onUrlChange={(newUrl) => setPhotoURL(newUrl)}
                          label="آپلود تصویر پروفایل در CDN اختصاصی (upc.geekclub.ir)"
                          placeholder="https://upc.geekclub.ir/s1/avatars/2026/10/..."
                          folder="avatars"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              {/* Display Name & Custom Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نام نمایشی
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>نام کاربری اختصاصی (Username)</span>
                    <span className="text-[10px] text-slate-400 font-mono">حروف انگلیسی و ارقام</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                      @
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      className="w-full pr-8 pl-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono dir-ltr text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Bio / About */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  درباره من (بیوگرافی)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="چند کلمه درباره علایق تکنولوژی، برنامه‌نویسی یا تخصص‌های خود بنویسید..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              {/* Privacy Settings: Hide Email */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span className="text-xs sm:text-sm font-bold text-slate-200">
                      پنهان کردن ایمیل از سایر کاربران
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    با فعال کردن این گزینه، آدرس ایمیل شما در صفحه نمایه و بخش دیدگاه‌ها برای سایر کاربران مخفی خواهد شد.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setHideEmail(!hideEmail)}
                  className={`p-1 text-2xl transition cursor-pointer ${
                    hideEmail ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                  title={hideEmail ? 'ایمیل مخفی است' : 'ایمیل نمایش داده می‌شود'}
                >
                  {hideEmail ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {/* Profile Comments Setting: Allow Comments */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs sm:text-sm font-bold text-slate-200">
                      امکان درج نظر در پروفایل توسط دیگران
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    به صورت پیش‌فرض فعال است. در صورت غیرفعال کردن، سایر کاربران دیگر نمی‌توانند روی صفحه پروفایل شما کامنت بنویسند.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAllowProfileComments(!allowProfileComments)}
                  className={`p-1 text-2xl transition cursor-pointer ${
                    allowProfileComments ? 'text-indigo-400' : 'text-slate-500'
                  }`}
                  title={allowProfileComments ? 'ثبت نظر مجاز است' : 'ثبت نظر غیرفعال است'}
                >
                  {allowProfileComments ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  ذخیره تغییرات پروفایل
                </button>
              </div>
            </form>
          )}

          {/* 3. Inbox & Messages Tab */}
          {activeTab === 'inbox' && (
            <div className="space-y-4">
              {selectedMessage ? (
                /* Single Message Detailed View */
                <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                    >
                      ← بازگشت به لیست پیام‌ها
                    </button>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedMessage.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={selectedMessage.sender.avatar}
                      alt={selectedMessage.sender.name}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-100 text-sm">
                        {selectedMessage.sender.name}
                        {selectedMessage.sender.isSystemAdmin && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            مدیریت وبسایت
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {selectedMessage.sender.role || 'کاربر جامعه'}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-slate-100 pt-1">
                    {selectedMessage.subject}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-300 leading-loose whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    {selectedMessage.content}
                  </p>
                </div>
              ) : (
                /* Messages List */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2">
                    <span>صندوق پیام‌های ورودی از مدیریت و سایر کاربران</span>
                    <span>{inbox.length} پیام</span>
                  </div>

                  {inbox.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-800">
                      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      صندوق پیام‌های شما در حال حاضر خالی است.
                    </div>
                  ) : (
                    inbox.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          if (!msg.read) onMarkMessageRead(msg.id);
                        }}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 group ${
                          !msg.read
                            ? 'bg-indigo-950/30 border-indigo-500/40 hover:bg-indigo-950/50'
                            : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={msg.sender.avatar}
                            alt={msg.sender.name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                                {msg.sender.name}
                              </span>
                              {msg.sender.isSystemAdmin && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                                  مدیریت
                                </span>
                              )}
                              {!msg.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 font-medium truncate max-w-xs sm:max-w-md mt-0.5">
                              {msg.subject}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                              {msg.content.slice(0, 70)}...
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-[10px] text-slate-400 block">
                            {msg.createdAt}
                          </span>
                          <span className="text-xs text-indigo-400 group-hover:translate-x-[-2px] transition block mt-1">
                            مشاهده ←
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Profile Guestbook / Comments Tab */}
          {activeTab === 'guestbook' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  وضعیت پیام‌گذاری روی پروفایل:
                </span>
                {allowProfileComments ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                    فعال (سایر کاربران می‌توانند نظر بگذارند)
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
                    <EyeOff className="w-3.5 h-3.5" />
                    غیرفعال توسط صاحب حساب
                  </span>
                )}
              </div>

              {/* Comment input form if enabled */}
              {allowProfileComments ? (
                <form onSubmit={handleCommentSubmit} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    نوشتن پیام جدید روی دیوار پروفایل:
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="پیام یا نظر خود را برای این کاربر بنویسید..."
                      className="flex-1 p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/30 transition cursor-pointer self-end py-3"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                      ارسال
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed text-center">
                  امکان نوشتن کامنت در این پروفایل توسط صاحب حساب غیرفعال شده است. شما می‌توانید در تب تنظیمات آن را دوباره فعال کنید.
                </div>
              )}

              {/* Comments list */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300">
                  پیام‌های ثبت شده روی دیوار پروفایل ({profileComments.length}):
                </h4>

                {profileComments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-slate-800/20 rounded-2xl border border-slate-800 text-xs">
                    هنوز پیامی روی پروفایل ثبت نشده است.
                  </div>
                ) : (
                  profileComments.map((pc) => (
                    <div
                      key={pc.id}
                      className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={pc.author.avatar}
                            alt={pc.author.name}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-200">
                              {pc.author.name}
                            </span>
                            {pc.author.username && (
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                @{pc.author.username}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {pc.createdAt}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pr-9 whitespace-pre-line">
                        {pc.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for Aparat icon
const VideoIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
  </svg>
);
