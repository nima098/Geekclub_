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
  UsernameSetupModal 
} from './components/UsernameSetupModal';
import { 
  DomainAuthHelpModal 
} from './components/DomainAuthHelpModal';
import { FALLBACK_IMAGES, getPlatformFallbackImage, getAuthorAvatar } from './utils/imageHelper';
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
  AdminPortalLoginModal 
} from './components/AdminPortalLoginModal';
import { 
  RSSModal 
} from './components/RSSModal';
import { 
  WelcomeBanner 
} from './components/WelcomeBanner';
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
  SUPER_ADMIN_USER,
  SUPER_ADMIN_EMAIL,
  INITIAL_INBOX,
  INITIAL_PROFILE_COMMENTS,
  INITIAL_FEEDBACK,
  DEFAULT_SITE_SETTINGS,
  INITIAL_REGISTERED_USERS
} from './data/initialData';
import { logoutGoogle, loginWithGooglePopup } from './lib/firebase';
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
  Bookmark,
  ArrowLeft,
  Crown,
  MessageSquarePlus,
  Video,
  PlusCircle,
  Trash2,
  RotateCcw,
  Rss
} from 'lucide-react';
import { api } from './services/api';
import { fetchMetadataFromUrl } from './utils/urlHelper';
import { transferExternalUrlToCDN } from './services/cdnService';

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
      const itemsToProcess = parsedSaved.length > 0 ? parsedSaved : INITIAL_CONTENT;

      // Verified CDN covers on upc.geekclub.ir
      const VERIFIED_CDN_COVERS: Record<string, string> = {
        'yt-pending-1': 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230334_29545f1c.jpg',
        'yt-1': 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_9b7ad12d.jpg',
        'yt-2': 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_af47b80a.jpg',
        'yt-3': 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
        'aparat-1': 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230336_d9a4e772.jpg'
      };

      // Clean up old /s1/s1/ subpaths and replace all Unsplash URLs with CDN / Fallback SVG
      return itemsToProcess.map((item) => {
        let cleanThumb = VERIFIED_CDN_COVERS[item.id] || (item.thumbnail || '').replace('/s1/s1/', '/s1/');
        if (!cleanThumb || cleanThumb.includes('unsplash') || cleanThumb.includes('avatar_.')) {
          cleanThumb = getPlatformFallbackImage(item.platform, item.url);
        }

        let cleanAvatar = (item.author?.avatar || '').replace('/s1/s1/', '/s1/');
        if (!cleanAvatar || cleanAvatar.includes('unsplash') || cleanAvatar.includes('avatar_.jpg')) {
          cleanAvatar = getAuthorAvatar(item.author?.name || 'کاربر');
        }

        let cleanSlides = item.slides;
        if (cleanSlides && cleanSlides.length > 0) {
          cleanSlides = cleanSlides.map((s) => {
            if (s.url && s.url.includes('unsplash')) {
              return { ...s, url: getPlatformFallbackImage(item.platform, item.url) };
            }
            return s;
          });
        }

        return {
          ...item,
          thumbnail: cleanThumb,
          slides: cleanSlides,
          author: {
            ...item.author,
            avatar: cleanAvatar
          }
        };
      });
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
        const parsed: UserProfile = JSON.parse(saved);
        if (!parsed.photoURL || parsed.photoURL.includes('unsplash') || parsed.photoURL.includes('avatar_.')) {
          parsed.photoURL = getAuthorAvatar(parsed.displayName || 'کاربر');
        }
        // Only grant isAdmin if email matches the super admin email
        if (parsed.email && parsed.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          parsed.isAdmin = true;
          parsed.autoApproveContent = true;
          parsed.role = 'مدیر کل سایت (Super Admin)';
        } else {
          parsed.isAdmin = false;
        }
        return parsed;
      }
      return DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  // Theme Mode State (Default: Dark Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('geekclub_theme_v1');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('geekclub_theme_v1', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid3');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showTrashOnly, setShowTrashOnly] = useState(false);



  // Modals & Auth State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoggingInWithGoogle, setIsLoggingInWithGoogle] = useState(false);
  const [tempGoogleUser, setTempGoogleUser] = useState<{
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
  } | null>(null);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isDomainHelpModalOpen, setIsDomainHelpModalOpen] = useState(false);
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
  const [isAdminPortalModalOpen, setIsAdminPortalModalOpen] = useState(false);
  const [isRSSModalOpen, setIsRSSModalOpen] = useState(false);
  const [singlePostId, setSinglePostId] = useState<string | null>(null);

  // Check URL query parameters (?p=id, ?post=id, ?id=id, ?admin=true) and hash (#admin, #id)
  useEffect(() => {
    const handleUrlRouting = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hasAdminParam = urlParams.has('admin');
      const hasAdminHash = window.location.hash.toLowerCase() === '#admin' || window.location.pathname.endsWith('/admin');

      if (hasAdminParam || hasAdminHash) {
        if (user && (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || user.isAdmin)) {
          setIsAdminModalOpen(true);
        } else {
          setIsAdminPortalModalOpen(true);
        }
      }

      // Check Single Post Permalink parameter ?p=id or ?post=id or ?id=id or hash (#content-123)
      const postIdParam = urlParams.get('p') || urlParams.get('post') || urlParams.get('id');
      const rawHash = window.location.hash ? window.location.hash.replace('#', '').trim() : null;

      if (postIdParam && postIdParam !== 'admin') {
        setSinglePostId(postIdParam);
      } else if (rawHash && rawHash !== 'admin' && rawHash.length > 2) {
        setSinglePostId(rawHash);
      } else {
        setSinglePostId(null);
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    window.addEventListener('hashchange', handleUrlRouting);
    return () => {
      window.removeEventListener('popstate', handleUrlRouting);
      window.removeEventListener('hashchange', handleUrlRouting);
    };
  }, [user]);

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
      return saved ? { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SITE_SETTINGS;
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

  // Synchronize with Cloud Firestore in real-time
  useEffect(() => {
    async function syncBackendData() {
      const serverContents = await api.getContents();
      if (serverContents && serverContents.length > 0) {
        setContents(serverContents);
      }
    }
    syncBackendData();

    // Subscribe to Cloud Firestore live contents updates across all users & Vercel
    const unsubscribe = api.subscribeContents((items) => {
      if (items && items.length > 0) {
        setContents(items);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
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
      handleDirectGoogleLogin();
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
      handleDirectGoogleLogin();
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://geekclub.ir';
    const permalink = `${origin}/?p=${item.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(permalink);
      addToast('success', 'لینک اختصاصی این مطلب با موفقیت کپی شد ✨');
    } else {
      addToast('info', `لینک اختصاصی مطلب: ${permalink}`);
    }
  };

  // --- Add Comment Handler ---
  const handleAddComment = (contentId: string, text: string) => {
    if (!user) {
      handleDirectGoogleLogin();
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
    const isLoggedInUser = Boolean(
      user &&
      user.uid !== 'user-google-101' &&
      !user.displayName?.includes('مهمان')
    );

    const isAutoApproved =
      user?.isAdmin ||
      user?.autoApproveContent ||
      isLoggedInUser;

    const newItem: ContentItem = {
      ...itemData,
      id: `custom-${Date.now()}`,
      likesCount: 1,
      dislikesCount: 0,
      commentsCount: 0,
      publishedAt: 'همین الان',
      userReaction: 'like',
      approvalStatus: isAutoApproved ? 'approved' : 'pending',
      authorUid: user?.uid
    };

    // Auto-reset active filters so the new content is immediately visible at the top
    setSelectedPlatform('all');
    setSelectedCategory('all');
    setSearchQuery('');
    setShowSavedOnly(false);

    setContents((prev) => [newItem, ...prev]);
    api.addContent(newItem);

    const isGenericTitle = !newItem.title || 
      newItem.title === 'ویدیوی یوتیوب' || 
      newItem.title === 'ویدیوی آپارات' || 
      newItem.title === 'پست اینستاگرام' || 
      newItem.title === 'محتوای اشتراک‌گذاری شده' || 
      newItem.title === 'مقاله وب' ||
      newItem.title.startsWith('مقاله در ') ||
      newItem.title.startsWith('پست منتخب در') ||
      newItem.title.startsWith('ویدیوی آموزشی');

    const needsThumb = !newItem.thumbnail || 
      !newItem.thumbnail.includes('upc.geekclub.ir') || 
      newItem.thumbnail.startsWith('data:') ||
      newItem.thumbnail.includes('unsplash');

    const shouldEnrichInBackground = Boolean(itemData.needsEnrichment || isGenericTitle || needsThumb);

    if (shouldEnrichInBackground) {
      addToast('info', 'لینک ثبت گردید؛ در حال دریافت اطلاعات و عکس اصلی از سایت مبدا در پس‌زمینه...');

      (async () => {
        try {
          let enriched: any = null;

          // 1. Call server-side /api/contents/:id/enrich endpoint
          try {
            const res = await fetch(`/api/contents/${newItem.id}/enrich`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: newItem.url })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.data) {
                enriched = data.data;
              }
            }
          } catch (err) {
            console.warn('POST /api/contents/:id/enrich fetch error:', err);
          }

          // 2. If enriched data is still generic or missing real title, call /api/extract-metadata directly
          const hasRealTitle = enriched?.title && 
            !['ویدیوی یوتیوب', 'ویدیوی آپارات', 'پست اینستاگرام', 'محتوای اشتراک‌گذاری شده', 'مقاله وب'].includes(enriched.title) &&
            !enriched.title.startsWith('مقاله در ');

          if (!enriched || !hasRealTitle || !enriched.thumbnail) {
            try {
              const metaRes = await fetch(`/api/extract-metadata?url=${encodeURIComponent(newItem.url)}`);
              if (metaRes.ok) {
                const metaData = await metaRes.json();
                if (metaData.success && (metaData.title || metaData.thumbnail)) {
                  enriched = { ...enriched, ...metaData };
                }
              }
            } catch (err) {
              console.warn('GET /api/extract-metadata fetch error:', err);
            }
          }

          // 3. Fallback to client-side oEmbed/heuristic parsing if server extraction was incomplete
          if (!enriched || !enriched.title || !hasRealTitle) {
            try {
              const localMeta = await fetchMetadataFromUrl(newItem.url);
              if (localMeta && (localMeta.title || localMeta.thumbnail)) {
                enriched = { ...enriched, ...localMeta };
              }
            } catch (err) {
              console.warn('Local client metadata fetch error:', err);
            }
          }

          if (enriched && (enriched.title || enriched.thumbnail)) {
            // Ensure thumbnail is stored on personal CDN
            let finalCover = enriched.thumbnail || enriched.image;
            if (finalCover && !finalCover.includes('upc.geekclub.ir') && !finalCover.startsWith('data:')) {
              try {
                const cdnUrl = await transferExternalUrlToCDN(finalCover, 'contents', `cover_${newItem.platform}`);
                if (cdnUrl && cdnUrl.includes('upc.geekclub.ir')) {
                  finalCover = cdnUrl;
                }
              } catch {}
            }

            const updates: Partial<ContentItem> = {
              ...(enriched.title && enriched.title.trim() ? { title: enriched.title.trim() } : {}),
              ...(enriched.description && enriched.description.trim() ? { description: enriched.description.trim() } : {}),
              ...(finalCover ? { thumbnail: finalCover } : {}),
              ...(enriched.videoUrl ? { videoUrl: enriched.videoUrl } : {}),
              ...(enriched.mediaType ? { mediaType: enriched.mediaType } : {}),
              ...(enriched.images && enriched.images.length > 0 ? { images: enriched.images } : {}),
              ...(enriched.slides && enriched.slides.length > 0 ? { slides: enriched.slides } : {}),
              ...(enriched.readingOrWatchTime ? { readingOrWatchTime: enriched.readingOrWatchTime } : {}),
              ...(enriched.embedUrl ? { embedUrl: enriched.embedUrl } : {}),
              ...(enriched.authorName && (!newItem.author?.name || newItem.author.name === 'کاربر گیک کلاب') ? {
                author: {
                  ...newItem.author,
                  name: enriched.authorName,
                  handle: `@${enriched.authorName.replace(/\s+/g, '_').toLowerCase()}`
                }
              } : {}),
              needsEnrichment: false
            };

            // Update React state immediately so card reflects real title and cover photo
            setContents((prev) =>
              prev.map((c) => {
                if (c.id !== newItem.id) return c;
                return {
                  ...c,
                  ...updates
                };
              })
            );

            // Persist merged updates to Cloud Firestore & local DB
            await api.updateContent(newItem.id, updates);

            if (enriched.videoUrl) {
              addToast('success', 'ویدیو و رسانه‌های اینستاگرام با موفقیت دریافت و روی CDN ذخیره گردید ✨');
            } else {
              addToast('success', 'اطلاعات کامل و کاور محتوا با موفقیت از سایت مبدا فراخوانی و ذخیره شد ✨');
            }
          }
        } catch (err) {
          console.warn('Background metadata enrichment failed:', err);
        }
      })();
    }

    if (isAutoApproved) {
      addToast('success', 'محتوای شما به عنوان کاربر عضو با موفقیت در صفحه اصلی منتشر گردید!');
    } else {
      addToast('info', 'محتوای شما به عنوان کاربر مهمان ثبت گردید و پس از بررسی و تأیید ادمین در سایت قرار خواهد گرفت.');
    }
  };

  // --- User Auth Handlers ---
  const handleLogin = (newUser: UserProfile) => {
    const isSuperAdmin = Boolean(
      newUser.email && newUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );

    const existing = usersList.find(
      (u) => u.uid === newUser.uid || (u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase())
    );

    const resolvedUser: UserProfile = {
      ...(existing || {}),
      ...newUser,
      photoURL: newUser.photoURL || existing?.photoURL || (isSuperAdmin ? SUPER_ADMIN_USER.photoURL : ''),
      isAdmin: isSuperAdmin ? true : Boolean(existing?.isAdmin),
      autoApproveContent: isSuperAdmin ? true : (existing?.autoApproveContent ?? Boolean(newUser.autoApproveContent)),
      role: isSuperAdmin ? 'مدیر کل سایت (Super Admin)' : (existing?.role || newUser.role || 'کاربر عضو')
    };

    setUser(resolvedUser);
    setUsersList((prev) => {
      const idx = prev.findIndex(
        (u) => u.uid === resolvedUser.uid || (u.email && resolvedUser.email && u.email.toLowerCase() === resolvedUser.email.toLowerCase())
      );
      if (idx >= 0) {
        return prev.map((u, i) => (i === idx ? resolvedUser : u));
      }
      return [resolvedUser, ...prev];
    });

    if (isSuperAdmin) {
      addToast('success', '👑 خوش آمدید مدیریت ارشد! پنل مدیریت با تمام اختیارات برای شما فعال گردید.');
    } else {
      addToast('success', `خوش آمدید، ${resolvedUser.displayName}! با موفقیت وارد شدید.`);
    }
  };

  const handleLogout = () => {
    logoutGoogle().catch(() => {});
    setUser(null);
    addToast('info', 'از حساب کاربری خود خارج شدید.');
  };

  const handleDirectGoogleLogin = async () => {
    setIsLoggingInWithGoogle(true);
    try {
      const verified = await loginWithGooglePopup();
      // Ask user for their username immediately after successful Google authentication
      setTempGoogleUser(verified);
      setIsUsernameModalOpen(true);
    } catch (err: any) {
      console.error('Direct Google login error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setIsDomainHelpModalOpen(true);
      } else if (err?.code === 'auth/popup-blocked') {
        addToast('error', 'پنجره ورود گوگل توسط مرورگر مسدود شد. لطفاً پاپ‌آپ را در مرورگر فعال نمایید.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        addToast('info', 'فرآیند ورود لغو شد.');
      } else {
        addToast('error', err?.message || 'خطا در ارتباط با سرورهای گوگل.');
      }
    } finally {
      setIsLoggingInWithGoogle(false);
    }
  };

  const handleCompleteUsernameSetup = (profile: UserProfile) => {
    handleLogin(profile);
    setIsUsernameModalOpen(false);
    setTempGoogleUser(null);
  };

  const handleBypassWithEmail = (email: string, name: string) => {
    setTempGoogleUser({
      uid: `usr-${Date.now()}`,
      displayName: name,
      email: email,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
    });
    setIsUsernameModalOpen(true);
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
    api.updateContent(contentId, { approvalStatus: 'approved' });
    addToast('success', 'محتوا با موفقیت تأیید شد و در فید عمومی سایت منتشر گردید.');
  };

  const handleRejectContent = (contentId: string) => {
    setContents((prev) =>
      prev.map((c) =>
        c.id === contentId ? { ...c, approvalStatus: 'rejected' } : c
      )
    );
    api.updateContent(contentId, { approvalStatus: 'rejected' });
    addToast('error', 'محتوا رد شد و از صف انتشار خارج گردید.');
  };

  const handleMarkMessageRead = (messageId: string) => {
    setInbox((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, read: true } : msg))
    );
  };

  const handleAddProfileComment = (text: string) => {
    if (!user) {
      handleDirectGoogleLogin();
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
    const deletedAtStr = shouldDelete ? new Date().toLocaleDateString('fa-IR') : undefined;
    setContents((prev) =>
      prev.map((c) =>
        c.id === contentId
          ? {
              ...c,
              isDeleted: shouldDelete,
              deletedAt: deletedAtStr
            }
          : c
      )
    );

    api.updateContent(contentId, {
      isDeleted: shouldDelete,
      deletedAt: deletedAtStr
    });

    if (shouldDelete) {
      addToast('info', 'محتوا به سطل بازیافت منتقل شد و از فید پنهان گردید (قابل بازگردانی از پنل ادمین).');
    } else {
      addToast('success', 'محتوا با موفقیت از سطل بازیافت به فید عمومی بازگردانده شد.');
    }
  };

  const handlePermanentDelete = (contentId: string) => {
    setContents((prev) => prev.filter((c) => c.id !== contentId));
    api.deleteContent(contentId);
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
    setShowTrashOnly(false);
  };

  const isAdmin = Boolean(
    user && (
      user.isAdmin ||
      user.role === 'super_admin' ||
      user.role?.includes('admin') ||
      user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    )
  );

  const trashCount = useMemo(() => {
    return contents.filter((c) => c.isDeleted).length;
  }, [contents]);

  // --- Filtered & Sorted Content List ---
  const filteredContents = useMemo(() => {
    // If Single Post Permalink Mode is active
    if (singlePostId) {
      const match = contents.filter((item) => !item.isDeleted && (item.id === singlePostId || item.id.endsWith(singlePostId)));
      if (match.length > 0) {
        return match;
      }
    }

    return contents
      .filter((item) => {
        // Trash filter for admin
        if (showTrashOnly) {
          return Boolean(item.isDeleted);
        }

        // Soft-delete filter: Exclude items in trash from public feed
        if (item.isDeleted) {
          return false;
        }

        // Moderation filter: Exclude rejected items
        if (item.approvalStatus === 'rejected') {
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
  }, [contents, selectedPlatform, selectedCategory, showSavedOnly, searchQuery, sortOption, showTrashOnly, singlePostId]);

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
    <div className="min-h-screen bg-[#090d16] light:bg-[#efefef] text-slate-100 light:text-slate-900 transition-colors duration-300 flex flex-col font-sans selection:bg-indigo-600 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onStartGoogleLogin={handleDirectGoogleLogin}
        isLoggingIn={isLoggingInWithGoogle}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
        onOpenRSSModal={isAdmin ? () => setIsRSSModalOpen(true) : undefined}
        onOpenAdminModal={() => {
          if (isAdmin) {
            setIsAdminModalOpen(true);
          } else {
            setIsAdminPortalModalOpen(true);
          }
        }}
        onLogout={handleLogout}
        savedCount={savedCount}
        unreadInboxCount={inbox.filter((m) => !m.read).length}
        onToggleSavedOnly={() => setShowSavedOnly(!showSavedOnly)}
        showSavedOnly={showSavedOnly}
        totalItemsCount={contents.filter((c) => !c.isDeleted).length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Guest Welcome Banner */}
      {!user && (
        <WelcomeBanner
          onStartGoogleLogin={handleDirectGoogleLogin}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          isLoggingIn={isLoggingInWithGoogle}
        />
      )}
      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Single Post Permalink Banner */}
        {singlePostId && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/40 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-right">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  در حال مشاهده لینک اختصاصی مطلب
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2.5 py-0.5 rounded-full font-mono">
                    Single Post
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  شما در حال مشاهده مستقیم این مطلب هستید. برای مشاهده تمام اخبار و ویدیوها روی دکمه بازگشت کلیک کنید.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSinglePostId(null);
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <span>مشاهده همه مطالب سایت</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}
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
          showSavedOnly={showSavedOnly}
          onToggleSavedOnly={() => setShowSavedOnly(!showSavedOnly)}
          savedCount={savedCount}
          isAdmin={isAdmin}
          showTrashOnly={showTrashOnly}
          onToggleTrashOnly={() => setShowTrashOnly(!showTrashOnly)}
          trashCount={trashCount}
        />

        {/* Trash Notice Banner when Admin is viewing Trash */}
        {showTrashOnly && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-600/30 text-rose-300 shrink-0 border border-rose-500/40">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-100 flex items-center gap-2">
                  <span>سطل زباله محتواها</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-xs font-mono">
                    {trashCount} مورد
                  </span>
                </h4>
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  محتواهای منتقل شده به سطل زباله از صفحه اصلی پنهان هستند. در صورت تمایل می‌توانید هر مورد را با دکمه «بازگردانی» به صفحه اصلی بازگردانید یا با «حذف دائمی» کاملاً پاک کنید.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTrashOnly(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition cursor-pointer shrink-0 border border-slate-700/80 shadow-md"
            >
              بازگشت به فید اصلی سایت
            </button>
          </div>
        )}

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
                onRestoreContent={(id) => handleToggleSoftDelete(id, false)}
                onPermanentDelete={handlePermanentDelete}
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
      <footer className="border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl py-8 text-xs text-slate-400 mt-12 shadow-lg shadow-slate-950/20">
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

            {isAdmin && (
              <button
                onClick={() => setIsRSSModalOpen(true)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition cursor-pointer"
                title="مشاهده و دریافت آدرس فید خبرخوان RSS"
              >
                <Rss className="w-3.5 h-3.5 text-amber-400" />
                فید RSS (خبرخوان)
              </button>
            )}

            <button
              onClick={() => {
                if (isAdmin) {
                  setIsAdminModalOpen(true);
                } else {
                  setIsAdminPortalModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 text-[#0077d9] hover:text-[#0066bd] font-bold transition cursor-pointer bg-[#0077d9]/10 hover:bg-[#0077d9]/20 px-2.5 py-1 rounded-lg border border-[#0077d9]/30"
              style={{ color: '#0077d9' }}
              title="ورود به پنل مدیریت سایت و سطل زباله"
            >
              <Crown className="w-3.5 h-3.5 text-[#0077d9]" style={{ color: '#0077d9' }} />
              <span style={{ color: '#0077d9' }}>پنل مدیریت سایت</span>
            </button>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-[#0077d9] hover:text-[#0066bd] transition cursor-pointer"
              style={{ color: '#0077d9' }}
            >
              <ArrowUp className="w-4 h-4 text-[#0077d9]" style={{ color: '#0077d9' }} />
              <span className="text-[#0077d9]" style={{ color: '#0077d9' }}>بازگشت به بالا</span>
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
        onStartGoogleLogin={() => {
          setActiveCommentsItem(null);
          handleDirectGoogleLogin();
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
        existingContents={contents}
        onOpenExistingContent={(item) => {
          if (item.platform === 'article') {
            setActiveArticleItem(item);
          } else {
            setActiveCommentsItem(item);
          }
        }}
      />

      {/* Username Setup Modal - Asked immediately after successful Google login */}
      <UsernameSetupModal
        isOpen={isUsernameModalOpen}
        googleUser={tempGoogleUser}
        existingUsers={usersList}
        onComplete={handleCompleteUsernameSetup}
        onCancel={() => {
          setIsUsernameModalOpen(false);
          setTempGoogleUser(null);
        }}
      />

      {/* Domain Auth Help Modal for preview / Cloud Run domain setup */}
      <DomainAuthHelpModal
        isOpen={isDomainHelpModalOpen}
        onClose={() => setIsDomainHelpModalOpen(false)}
        onBypassWithEmail={handleBypassWithEmail}
      />

      {user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          contents={contents}
          onUpdateUser={handleUpdateUser}
          inbox={inbox}
          onMarkMessageRead={handleMarkMessageRead}
          profileComments={profileComments}
          onAddProfileComment={handleAddProfileComment}
          onOpenArticle={(item) => setActiveArticleItem(item)}
          onOpenComments={(item) => setActiveCommentsItem(item)}
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
        onUpdateContents={(updatedItems) => setContents(updatedItems)}
      />

      {/* Dedicated Admin Portal Login Modal */}
      <AdminPortalLoginModal
        isOpen={isAdminPortalModalOpen}
        onClose={() => setIsAdminPortalModalOpen(false)}
        currentUser={user}
        onAdminLogin={handleLogin}
        onOpenAdminPanel={() => setIsAdminModalOpen(true)}
      />

      {/* RSS Feed & Newsreader Modal */}
      <RSSModal
        isOpen={isRSSModalOpen}
        onClose={() => setIsRSSModalOpen(false)}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
