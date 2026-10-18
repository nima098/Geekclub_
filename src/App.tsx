/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  FilterBar 
} from './components/FilterBar';
import { 
  ContentCard 
} from './components/ContentCard';
import { 
  CommentsModal 
} from './components/CommentsModal';
import { 
  ArticleReaderModal 
} from './components/ArticleReaderModal';
import { 
  AddContentModal 
} from './components/AddContentModal';
import { 
  GoogleAuthModal 
} from './components/GoogleAuthModal';
import { 
  ProfileModal 
} from './components/ProfileModal';
import { 
  FeedbackModal 
} from './components/FeedbackModal';
import { 
  AdminPanelModal 
} from './components/AdminPanelModal';
import { 
  Toast, 
  ToastMessage 
} from './components/Toast';
import { 
  ContentItem, 
  CommentItem, 
  UserProfile, 
  Platform, 
  Category, 
  SortOption, 
  ViewMode,
  InboxMessage,
  ProfileComment,
  FeedbackItem,
  SiteAdminSettings
} from './types/content';
import { 
  INITIAL_CONTENT, 
  INITIAL_COMMENTS, 
  DEFAULT_USER,
  INITIAL_INBOX,
  INITIAL_PROFILE_COMMENTS,
  INITIAL_FEEDBACK,
  DEFAULT_SITE_SETTINGS,
  INITIAL_REGISTERED_USERS
} from './data/initialData';
import { 
  Sparkles, 
  Compass, 
  Share2, 
  Youtube, 
  Instagram, 
  Newspaper, 
  SearchX, 
  ArrowUp,
  BookmarkCheck,
  Crown,
  MessageSquarePlus
} from 'lucide-react';
import { api } from './services/api';

const STORAGE_KEYS = {
  CONTENT: 'mediahub_content_v1',
  COMMENTS: 'mediahub_comments_v1',
  USER: 'mediahub_user_v1'
};

export default function App() {
  // --- States with LocalStorage Persistence ---
  const [contents, setContents] = useState<ContentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTENT);
      const parsedSaved: ContentItem[] = saved ? JSON.parse(saved) : [];
      // Ensure all initial content items (including newly added Instagram reels) exist in state
      const existingIds = new Set(parsedSaved.map((c) => c.id));
      const missingInitial = INITIAL_CONTENT.filter((c) => !existingIds.has(c.id));
      const merged = [...missingInitial, ...parsedSaved];
      return merged.length > 0 ? merged : INITIAL_CONTENT;
    } catch {
      return INITIAL_CONTENT;
    }
  });

  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMMENTS);
      return saved ? JSON.parse(saved) : INITIAL_COMMENTS;
    } catch {
      return INITIAL_COMMENTS;
    }
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isAdmin === undefined) {
          parsed.isAdmin = true;
        }
        return parsed;
      }
      return DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid3');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeCommentsItem, setActiveCommentsItem] = useState<ContentItem | null>(null);
  const [activeArticleItem, setActiveArticleItem] = useState<ContentItem | null>(null);
  const [sharedIncomingUrl, setSharedIncomingUrl] = useState('');

  // Inbox & Profile Comments state
  const [inbox, setInbox] = useState<InboxMessage[]>(() => {
    try {
      const saved = localStorage.getItem('geekclub_inbox_v1');
      return saved ? JSON.parse(saved) : INITIAL_INBOX;
    } catch {
      return INITIAL_INBOX;
    }
  });

  const [profileComments, setProfileComments] = useState<ProfileComment[]>(() => {
    try {
      const saved = localStorage.getItem('geekclub_prof_comments_v1');
      return saved ? JSON.parse(saved) : INITIAL_PROFILE_COMMENTS;
    } catch {
      return INITIAL_PROFILE_COMMENTS;
    }
  });

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Feedback list state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(() => {
    try {
      const saved = localStorage.getItem('geekclub_feedback_v1');
      return saved ? JSON.parse(saved) : INITIAL_FEEDBACK;
    } catch {
      return INITIAL_FEEDBACK;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('geekclub_feedback_v1', JSON.stringify(feedbackList));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [feedbackList]);

  // Site Admin Settings (e.g. Content Approval before publishing)
  const [siteSettings, setSiteSettings] = useState<SiteAdminSettings>(() => {
    try {
      const saved = localStorage.getItem('geekclub_settings_v1');
      return saved ? JSON.parse(saved) : DEFAULT_SITE_SETTINGS;
    } catch {
      return DEFAULT_SITE_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('geekclub_settings_v1', JSON.stringify(siteSettings));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [siteSettings]);

  // Registered Users list
  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('geekclub_users_list_v1');
      return saved ? JSON.parse(saved) : INITIAL_REGISTERED_USERS;
    } catch {
      return INITIAL_REGISTERED_USERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('geekclub_users_list_v1', JSON.stringify(usersList));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [usersList]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONTENT, JSON.stringify(contents));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [contents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(commentsMap));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [commentsMap]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('geekclub_inbox_v1', JSON.stringify(inbox));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [inbox]);

  useEffect(() => {
    try {
      localStorage.setItem('geekclub_prof_comments_v1', JSON.stringify(profileComments));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [profileComments]);

  // Synchronize with backend API on mount
  useEffect(() => {
    async function syncBackendData() {
      const serverContents = await api.getContents();
      if (serverContents && serverContents.length > 0) {
        setContents(serverContents);
      }
    }
    syncBackendData();
  }, []);

  // Handle Web Share Target from mobile OS (Native Share Sheet -> GeekClub PWA)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const incomingUrl = params.get('url');
      const incomingText = params.get('text');
      const incomingTitle = params.get('title');

      let targetUrl = (incomingUrl || '').trim();
      if (!targetUrl && incomingText) {
        const urlMatch = incomingText.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          targetUrl = urlMatch[0];
        } else if (incomingText.startsWith('http')) {
          targetUrl = incomingText.trim();
        }
      }

      if (targetUrl) {
        setSharedIncomingUrl(targetUrl);
        setIsAddModalOpen(true);
        addToast('success', 'لینک اشتراک‌گذاری شده از گوشی دریافت شد و در فرم اشتراک قرار گرفت!');

        // Clean query parameters from URL without reloading
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, '', cleanPath);
      }
    } catch (e) {
      console.warn('Error handling incoming share target:', e);
    }
  }, []);

  // Toast Helper
  const addToast = (type: 'success' | 'info' | 'error', text: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      text
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 3500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Like & Dislike Handlers ---
  const handleLike = (id: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      addToast('info', 'برای ثبت واکنش، لطفاً ابتدا با حساب گوگل خود وارد شوید.');
      return;
    }

    setContents((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (item.userReaction === 'like') {
          // Undo like
          addToast('info', 'لایک حذف شد');
          return {
            ...item,
            likesCount: Math.max(0, item.likesCount - 1),
            userReaction: null
          };
        } else if (item.userReaction === 'dislike') {
          // Switch dislike -> like
          addToast('success', 'به لیست پسندیده‌ها اضافه شد');
          return {
            ...item,
            likesCount: item.likesCount + 1,
            dislikesCount: Math.max(0, item.dislikesCount - 1),
            userReaction: 'like'
          };
        } else {
          // New like
          addToast('success', 'به لیست پسندیده‌ها اضافه شد');
          return {
            ...item,
            likesCount: item.likesCount + 1,
            userReaction: 'like'
          };
        }
      })
    );

    api.reactToContent(id, 'like');
  };

  const handleDislike = (id: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      addToast('info', 'برای ثبت واکنش، لطفاً ابتدا با حساب گوگل خود وارد شوید.');
      return;
    }

    setContents((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (item.userReaction === 'dislike') {
          // Undo dislike
          addToast('info', 'دیس‌لایک برداشته شد');
          return {
            ...item,
            dislikesCount: Math.max(0, item.dislikesCount - 1),
            userReaction: null
          };
        } else if (item.userReaction === 'like') {
          // Switch like -> dislike
          addToast('info', 'عدم رضایت ثبت شد');
          return {
            ...item,
            dislikesCount: item.dislikesCount + 1,
            likesCount: Math.max(0, item.likesCount - 1),
            userReaction: 'dislike'
          };
        } else {
          // New dislike
          addToast('info', 'عدم رضایت ثبت شد');
          return {
            ...item,
            dislikesCount: item.dislikesCount + 1,
            userReaction: 'dislike'
          };
        }
      })
    );

    api.reactToContent(id, 'dislike');
  };

  // --- Bookmark / Save Handler ---
  const handleToggleSave = (id: string) => {
    setContents((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newSaved = !item.saved;
        addToast(
          'success',
          newSaved ? 'محتوا به نشان‌شده‌ها اضافه شد' : 'از نشان‌شده‌ها حذف شد'
        );
        return {
          ...item,
          saved: newSaved
        };
      })
    );
  };

  // --- Share Handler ---
  const handleShare = (item: ContentItem) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(item.url);
      addToast('success', 'لینک محتوا با موفقیت در کلیپ‌بورد کپی شد');
    } else {
      addToast('info', `آدرس محتوا: ${item.url}`);
    }
  };

  // --- Add Comment Handler ---
  const handleAddComment = (contentId: string, text: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const newComment: CommentItem = {
      id: `comm-${Date.now()}`,
      contentId,
      author: {
        name: user.displayName,
        avatar: user.photoURL,
        email: user.email
      },
      text,
      createdAt: 'لحظاتی پیش',
      likes: 0,
      userLiked: false
    };

    setCommentsMap((prev) => ({
      ...prev,
      [contentId]: [newComment, ...(prev[contentId] || [])]
    }));

    // Increment commentsCount on content
    setContents((prev) =>
      prev.map((c) =>
        c.id === contentId
          ? { ...c, commentsCount: (c.commentsCount || 0) + 1 }
          : c
      )
    );

    // Send to backend
    api.addComment(contentId, text, {
      name: user.displayName,
      avatar: user.photoURL,
      email: user.email
    });

    addToast('success', 'دیدگاه شما با موفقیت ثبت و ارسال شد');
  };

  // --- Like Comment Handler ---
  const handleLikeComment = (commentId: string) => {
    if (!activeCommentsItem) return;
    const cid = activeCommentsItem.id;

    api.likeComment(cid, commentId);

    setCommentsMap((prev) => {
      const currentList = prev[cid] || [];
      return {
        ...prev,
        [cid]: currentList.map((comm) => {
          if (comm.id !== commentId) return comm;
          const isLiked = comm.userLiked;
          return {
            ...comm,
            likes: isLiked ? Math.max(0, comm.likes - 1) : comm.likes + 1,
            userLiked: !isLiked
          };
        })
      };
    });
  };

  // --- Add New Content Handler ---
  const handleAddContent = (
    itemData: Omit<
      ContentItem,
      'id' | 'likesCount' | 'dislikesCount' | 'commentsCount' | 'publishedAt'
    >
  ) => {
    const isDirectPublishing = Boolean(
      !siteSettings.requireContentApproval ||
      user?.isAdmin ||
      user?.autoApproveContent
    );

    const newItem: ContentItem = {
      ...itemData,
      id: `custom-${Date.now()}`,
      likesCount: 1,
      dislikesCount: 0,
      commentsCount: 0,
      publishedAt: 'همین الان',
      userReaction: 'like',
      approvalStatus: isDirectPublishing ? 'approved' : 'pending',
      authorUid: user?.uid
    };

    setContents((prev) => [newItem, ...prev]);
    api.addContent(itemData);

    if (isDirectPublishing) {
      addToast('success', 'محتوای شما با موفقیت منتشر شد و در سایت قرار گرفت!');
    } else {
      addToast('info', 'محتوای شما ثبت شد و به صف بررسی مدیریت ارسال گردید (پس از تأیید در سایت نمایش داده می‌شود).');
    }
  };

  // --- User Auth Handlers ---
  const handleLogin = (newUser: UserProfile) => {
    const existing = usersList.find((u) => u.uid === newUser.uid || u.email === newUser.email);
    const resolvedUser: UserProfile = existing
      ? { ...newUser, ...existing, photoURL: newUser.photoURL || existing.photoURL }
      : { ...newUser, autoApproveContent: newUser.isAdmin || false };

    setUser(resolvedUser);
    setUsersList((prev) => {
      const idx = prev.findIndex((u) => u.uid === resolvedUser.uid || u.email === resolvedUser.email);
      if (idx >= 0) {
        return prev.map((u, i) => (i === idx ? resolvedUser : u));
      }
      return [resolvedUser, ...prev];
    });

    addToast('success', `خوش آمدید، ${resolvedUser.displayName}! با موفقیت وارد شدید.`);
  };

  const handleLogout = () => {
    setUser(null);
    addToast('info', 'از حساب کاربری خود خارج شدید.');
  };

  // --- Profile, Inbox & Guestbook Handlers ---
  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setUsersList((prev) =>
      prev.map((u) => (u.uid === updatedUser.uid ? { ...u, ...updatedUser } : u))
    );
    addToast('success', 'اطلاعات و تنظیمات نمایه با موفقیت ذخیره شد.');
  };

  const handleUpdateUserPermissions = (userId: string, updates: Partial<UserProfile>) => {
    setUsersList((prev) =>
      prev.map((u) => (u.uid === userId ? { ...u, ...updates } : u))
    );
    if (user && user.uid === userId) {
      setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    }
    const targetUser = usersList.find((u) => u.uid === userId);
    const userName = targetUser?.displayName || 'کاربر';
    if (updates.autoApproveContent !== undefined) {
      if (updates.autoApproveContent) {
        addToast('success', `دسترسی انتشار مستقیم (بدون نیاز به تایید) برای ${userName} فعال شد.`);
      } else {
        addToast('info', `تأیید محتوا برای ${userName} الزامی شد.`);
      }
    } else {
      addToast('success', 'سطح دسترسی کاربر به‌روزرسانی شد.');
    }
  };

  const handleApproveContent = (contentId: string) => {
    setContents((prev) =>
      prev.map((c) =>
        c.id === contentId ? { ...c, approvalStatus: 'approved' } : c
      )
    );
    addToast('success', 'محتوا با موفقیت تأیید شد و در فید عمومی سایت منتشر گردید.');
  };

  const handleRejectContent = (contentId: string) => {
    setContents((prev) =>
      prev.map((c) =>
        c.id === contentId ? { ...c, approvalStatus: 'rejected' } : c
      )
    );
    addToast('error', 'محتوا رد شد و از صف انتشار خارج گردید.');
  };

  const handleMarkMessageRead = (messageId: string) => {
    setInbox((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, read: true } : msg))
    );
  };

  const handleAddProfileComment = (text: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const newComment: ProfileComment = {
      id: `pc-${Date.now()}`,
      profileUserId: user.uid,
      author: {
        name: user.displayName,
        avatar: user.photoURL,
        username: user.username
      },
      text,
      createdAt: 'همین الان'
    };
    setProfileComments((prev) => [newComment, ...prev]);
    addToast('success', 'پیام شما روی دیوار پروفایل با موفقیت ثبت شد.');
  };

  // --- Soft-Delete & Trash Handlers ---
  const handleToggleSoftDelete = (contentId: string, shouldDelete: boolean) => {
    setContents((prev) =>
      prev.map((c) =>
        c.id === contentId
          ? {
              ...c,
              isDeleted: shouldDelete,
              deletedAt: shouldDelete ? new Date().toLocaleDateString('fa-IR') : undefined
            }
          : c
      )
    );

    if (shouldDelete) {
      addToast('info', 'محتوا به سطل بازیافت منتقل شد و از فید پنهان گردید (قابل بازگردانی از پنل ادمین).');
    } else {
      addToast('success', 'محتوا با موفقیت از سطل بازیافت به فید عمومی بازگردانده شد.');
    }
  };

  const handlePermanentDelete = (contentId: string) => {
    setContents((prev) => prev.filter((c) => c.id !== contentId));
    addToast('error', 'محتوا به طور کامل از حافظه دیتابیس حذف گردید.');
  };

  // --- Feedback & Suggestions Handlers ---
  const handleSubmitFeedback = (data: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>) => {
    const newItem: FeedbackItem = {
      ...data,
      id: `fb-${Date.now()}`,
      createdAt: 'همین الان',
      status: 'pending'
    };
    setFeedbackList((prev) => [newItem, ...prev]);
    addToast('success', 'پیشنهاد یا انتقاد شما با موفقیت به تیم مدیریت ارسال شد.');
  };

  const handleUpdateFeedbackStatus = (id: string, status: FeedbackItem['status'], reply?: string) => {
    setFeedbackList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, adminReply: reply || f.adminReply } : f))
    );
    addToast('info', 'وضعیت پیام در پنل مدیریت به‌روزرسانی شد.');
  };

  const handleSendAdminMessage = (msg: Omit<InboxMessage, 'id' | 'createdAt' | 'read'>) => {
    const newMsg: InboxMessage = {
      ...msg,
      id: `admin-msg-${Date.now()}`,
      createdAt: 'همین الان',
      read: false
    };
    setInbox((prev) => [newMsg, ...prev]);
    addToast('success', 'پیام رسمی مدیریت با موفقیت در این‌باکس کاربران قرار گرفت.');
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedPlatform !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (showSavedOnly) count++;
    return count;
  }, [searchQuery, selectedPlatform, selectedCategory, showSavedOnly]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedCategory('all');
    setShowSavedOnly(false);
  };

  // --- Filtered & Sorted Content List ---
  const filteredContents = useMemo(() => {
    return contents
      .filter((item) => {
        // Soft-delete filter: Exclude items in trash from public feed
        if (item.isDeleted) {
          return false;
        }

        // Moderation filter: Exclude pending approval or rejected items from public feed
        if (item.approvalStatus === 'pending' || item.approvalStatus === 'rejected') {
          return false;
        }

        // Platform filter
        if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Saved filter
        if (showSavedOnly && !item.saved) {
          return false;
        }

        // Search Query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchAuthor = item.author.name.toLowerCase().includes(q);
          const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
          const matchDomain = item.sourceDomain?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAuthor && !matchTags && !matchDomain) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'newest') {
          return 0; // Maintain recent insertion order
        }
        if (sortOption === 'most_liked') {
          return b.likesCount - a.likesCount;
        }
        if (sortOption === 'most_comments') {
          return b.commentsCount - a.commentsCount;
        }
        if (sortOption === 'trending') {
          const scoreA = a.likesCount * 2 + a.commentsCount * 3 - a.dislikesCount;
          const scoreB = b.likesCount * 2 + b.commentsCount * 3 - b.dislikesCount;
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [contents, selectedPlatform, selectedCategory, showSavedOnly, searchQuery, sortOption]);

  const savedCount = useMemo(() => {
    return contents.filter((c) => c.saved).length;
  }, [contents]);

  // Dynamic Grid Class based on View Mode
  const getGridClasses = () => {
    switch (viewMode) {
      case 'grid3':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 'grid2':
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 'compact':
        return 'flex flex-col gap-4';
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onLogout={handleLogout}
        savedCount={savedCount}
        unreadInboxCount={inbox.filter((m) => !m.read).length}
        onToggleSavedOnly={() => setShowSavedOnly(!showSavedOnly)}
        showSavedOnly={showSavedOnly}
        totalItemsCount={contents.filter((c) => !c.isDeleted).length}
      />

      {/* Hero Welcome Banner */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-indigo-950/20 via-slate-900/40 to-transparent py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>پلتفرم اشتراک و کاوش محتوای چندرسانه‌ای</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                بهترین محتواهای <span className="bg-gradient-to-r from-red-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">یوتیوب، اینستاگرام و وب</span> در یک قاب
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-loose">
                ویدیوها را مستقیماً تماشا کنید، ریلزها را مرور نمایید، مقالات تخصصی را در حالت خوانش اختصاصی مطالعه کنید، لایک کنید و در گفت‌وگوها مشارکت داشته باشید.
              </p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto shrink-0">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <div className="flex items-center justify-center text-red-500 mb-1">
                  <Youtube className="w-5 h-5" />
                </div>
                <div className="text-lg font-black text-slate-100">
                  {contents.filter((c) => c.platform === 'youtube').length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">ویدیو یوتیوب</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <div className="flex items-center justify-center text-pink-500 mb-1">
                  <Instagram className="w-5 h-5" />
                </div>
                <div className="text-lg font-black text-slate-100">
                  {contents.filter((c) => c.platform === 'instagram').length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">پست و ریلز</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <div className="flex items-center justify-center text-emerald-500 mb-1">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div className="text-lg font-black text-slate-100">
                  {contents.filter((c) => c.platform === 'article').length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">مقالات وب</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Filter Bar (Search, Platforms, Categories, Sort, View Modes) */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPlatform={selectedPlatform}
          onPlatformChange={setSelectedPlatform}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortOption={sortOption}
          onSortChange={setSortOption}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalFilteredCount={filteredContents.length}
          totalCount={contents.length}
          onResetFilters={handleResetFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Content Grid */}
        {filteredContents.length > 0 ? (
          <div className={getGridClasses()}>
            {filteredContents.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                currentUser={user}
                onLike={handleLike}
                onDislike={handleDislike}
                onOpenComments={(targetItem) => setActiveCommentsItem(targetItem)}
                onOpenArticleReader={(targetItem) => setActiveArticleItem(targetItem)}
                onToggleSave={handleToggleSave}
                onShare={handleShare}
                onTagClick={(tag) => setSearchQuery(tag)}
                onDeleteContent={(id) => handleToggleSoftDelete(id, true)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <SearchX className="w-8 h-8 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-200">
                هیچ محتوایی مطابق با فیلترهای انتخابی یافت نشد
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                عبارت جستجو یا دسته‌بندی را تغییر دهید یا فیلترها را ریست کنید تا تمام موارد نمایش داده شوند.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              پاک کردن همه فیلترها
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">گیک کلاب (GeekClub)</span>
            <span>- پلتفرم اشتراک محتوای مناسب گیک‌ها</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-pink-300 transition cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-pink-400" />
              انتقادات و پیشنهادات
            </button>

            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20"
              title="ورود به پنل مدیریت سایت و بازیابی محتوا"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              پنل مدیریت سایت
            </button>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
              بازگشت به بالا
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CommentsModal
        item={activeCommentsItem}
        comments={activeCommentsItem ? commentsMap[activeCommentsItem.id] || [] : []}
        user={user}
        onClose={() => setActiveCommentsItem(null)}
        onAddComment={handleAddComment}
        onLikeComment={handleLikeComment}
        onOpenAuthModal={() => {
          setActiveCommentsItem(null);
          setIsAuthModalOpen(true);
        }}
      />

      <ArticleReaderModal
        item={activeArticleItem}
        onClose={() => setActiveArticleItem(null)}
        onLike={handleLike}
        onDislike={handleDislike}
        onOpenComments={(targetItem) => {
          setActiveArticleItem(null);
          setActiveCommentsItem(targetItem);
        }}
        onToggleSave={handleToggleSave}
        onShare={handleShare}
      />

      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSharedIncomingUrl('');
        }}
        onAdd={handleAddContent}
        user={user}
        initialUrl={sharedIncomingUrl}
        requireApproval={siteSettings.requireContentApproval}
        siteSettings={siteSettings}
      />

      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          onUpdateUser={handleUpdateUser}
          inbox={inbox}
          onMarkMessageRead={handleMarkMessageRead}
          profileComments={profileComments}
          onAddProfileComment={handleAddProfileComment}
        />
      )}

      {/* Feedback & Suggestions Modal (Guests & Users) */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        user={user}
        onSubmitFeedback={handleSubmitFeedback}
      />

      {/* Admin Management Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        user={user}
        contents={contents}
        onToggleSoftDelete={handleToggleSoftDelete}
        onPermanentDelete={handlePermanentDelete}
        feedbackList={feedbackList}
        onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
        onSendAdminMessage={handleSendAdminMessage}
        siteSettings={siteSettings}
        onUpdateSiteSettings={setSiteSettings}
        usersList={usersList}
        onUpdateUserPermissions={handleUpdateUserPermissions}
        onApproveContent={handleApproveContent}
        onRejectContent={handleRejectContent}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
