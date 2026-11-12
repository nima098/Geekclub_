/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Navbar,
  FilterBar,
  ContentCard, 
  CommentsModal, 
  ArticleReaderModal, 
  AddContentModal, 
  UsernameSetupModal, 
  DomainAuthHelpModal, 
  ProfileModal, 
  FeedbackModal, 
  AdminPanelModal, 
  AdminPortalLoginModal, 
  RSSModal, 
  Toast, 
  ToastMessage 
} from './components';
import { FALLBACK_IMAGES, getPlatformFallbackImage, getAuthorAvatar } from './utils/imageHelper';
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
  SUPER_ADMIN_USER,
  SUPER_ADMIN_EMAIL,
  INITIAL_INBOX,
  INITIAL_PROFILE_COMMENTS,
  INITIAL_FEEDBACK,
  DEFAULT_SITE_SETTINGS,
  INITIAL_REGISTERED_USERS
} from './data/initialData';
import { logoutGoogle } from './lib/firebase';
import { loginWithDirectGoogleOAuth } from './lib/googleAuth';
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

// --- Optimistic delete/restore protection ---------------------------------------------------------
// BUGFIX ("deleted content comes back after a few seconds"): the feed is re-fetched every 4 seconds and
// the response REPLACED the local state. A poll that was already in flight (or hit a stale server
// instance) therefore brought the deleted item back. We now remember local delete/restore actions and
// re-apply them on top of every poll result until the server confirms the change.
type PendingKind = 'soft' | 'restore' | 'perm';
interface PendingOverride { kind: PendingKind; at: number; deletedAt?: string; }
const PENDING_OVERRIDE_TTL_MS = 2 * 60 * 1000;
const stripContentPrefix = (id: string) => id.replace(/^(post|content)-/, '');

export default function App() {
  const pendingOverridesRef = useRef<Map<string, PendingOverride>>(new Map());

  const applyPendingOverrides = (items: ContentItem[]): ContentItem[] => {
    const overrides = pendingOverridesRef.current;
    if (overrides.size === 0) return items;
    const now = Date.now();
    let result = items;

    for (const [id, ov] of Array.from(overrides.entries())) {
      if (now - ov.at > PENDING_OVERRIDE_TTL_MS) {
        overrides.delete(id);
        continue;
      }
      const clean = stripContentPrefix(id);
      const isMatch = (c: ContentItem) => c.id === id || stripContentPrefix(c.id) === clean;
      const serverItem = result.find(isMatch);

      if (ov.kind === 'perm') {
        if (!serverItem) { overrides.delete(id); continue; } // server confirmed the deletion
        result = result.filter((c) => !isMatch(c));
      } else if (ov.kind === 'soft') {
        if (!serverItem || serverItem.isDeleted) { overrides.delete(id); continue; } // confirmed
        result = result.map((c) => (isMatch(c) ? { ...c, isDeleted: true, deletedAt: ov.deletedAt } : c));
      } else if (ov.kind === 'restore') {
        if (serverItem && !serverItem.isDeleted) { overrides.delete(id); continue; } // confirmed
        result = result.map((c) => (isMatch(c) ? { ...c, isDeleted: false, deletedAt: undefined } : c));
      }
    }
    return result;
  };

  // --- Server-Authoritative Contents State ---
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && Array.isArray((window as any).__INITIAL_DATA__)) return false;
    try {
      const cached = localStorage.getItem('mediahub_content_v2');
      if (cached && JSON.parse(cached).length > 0) return false;
    } catch {}
    return true;
  });

  const [contents, setContents] = useState<ContentItem[]>(() => {
    try {
      // 0. Primary: Server-injected authoritative initial data (zero latency, zero flicker)
      if (typeof window !== 'undefined' && Array.isArray((window as any).__INITIAL_DATA__)) {
        const raw = (window as any).__INITIAL_DATA__;
        const serverDel: string[] = Array.isArray((window as any).__DELETED_IDS__) ? (window as any).__DELETED_IDS__ : [];
        const delSet = new Set(serverDel.map((s) => String(s)));
        return raw.filter((c: ContentItem) => {
          if (!c) return false;
          // Keep soft-deleted items so Trash can show them!
          if (c.isDeleted) return true;
          const strId = String(c.id);
          const clean = strId.replace(/^(post|content)-/, '');
          return !delSet.has(strId) && !delSet.has(clean) && !delSet.has(`post-${clean}`) && !delSet.has(`content-${clean}`);
        });
      }

      const serverDelIds: string[] = typeof window !== 'undefined' && Array.isArray((window as any).__DELETED_IDS__)
        ? (window as any).__DELETED_IDS__
        : [];
      const serverDelSet = new Set(serverDelIds.map((s) => String(s)));

      // Clean stale tombstone IDs from local storage so previous soft-deletes don't block restored items
      try {
        localStorage.removeItem('mediahub_deleted_ids_v1');
      } catch {}

      // 1. Prefer real server contents cached from previous visits
      let itemsToProcess: ContentItem[] = [];
      const cached = localStorage.getItem('mediahub_content_v2');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            itemsToProcess = parsed;
          }
        } catch {}
      }

      // 2. Only fallback to INITIAL_CONTENT if no local cache exists
      if (itemsToProcess.length === 0) {
        itemsToProcess = INITIAL_CONTENT;
      }

      itemsToProcess = itemsToProcess.filter((item) => {
        if (!item || !item.id) return false;
        if (item.seedStatus === 'pending_approval') return false;
        // Keep soft-deleted items so Trash can show them!
        if (item.isDeleted) return true;
        const strId = String(item.id);
        const clean = strId.replace(/^(post|content)-/, '');
        return !serverDelSet.has(strId) && !serverDelSet.has(clean) && !serverDelSet.has(`post-${clean}`) && !serverDelSet.has(`content-${clean}`);
      });

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
      return null;
    } catch {
      return null;
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
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.style.backgroundColor = '#efefef';
        document.documentElement.style.color = '#0f172a';
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#efefef');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.style.backgroundColor = '#090d16';
        document.documentElement.style.color = '#f8fafc';
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#090d16');
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

  // Check URL query parameters (?p=id, ?post=id, ?id=id, ?admin=true), path (/category/post-123) and hash (#admin, #id)
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

      // 1. Check Query params: ?p=id or ?post=id or ?id=id
      const postIdParam = urlParams.get('p') || urlParams.get('post') || urlParams.get('id');
      
      // 2. Check Clean Path: e.g. /tech/post-yt-1 or /programming/content-123 or /tech/yt-1
      const pathname = window.location.pathname;
      let pathPostId: string | null = null;
      if (pathname && pathname !== '/') {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length >= 1) {
          const lastPart = parts[parts.length - 1];
          if (lastPart.startsWith('post-') || lastPart.startsWith('content-')) {
            pathPostId = lastPart.replace(/^(post|content)-/, '');
          } else if (parts.length >= 2 && lastPart !== 'admin' && lastPart !== 'api') {
            pathPostId = lastPart;
          }
        }
      }

      // 3. Check Hash
      const rawHash = window.location.hash ? window.location.hash.replace('#', '').trim() : null;

      const resolvedId = postIdParam || pathPostId || (rawHash && rawHash !== 'admin' && rawHash.length > 2 ? rawHash : null);

      if (resolvedId && resolvedId !== 'admin') {
        setSinglePostId(resolvedId);
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

  // Sync document title when viewing single post
  useEffect(() => {
    if (singlePostId) {
      const match = contents.find((c) => c.id === singlePostId || c.id.endsWith(singlePostId));
      if (match) {
        document.title = `${match.title} | گیک‌کلاب`;
        return;
      }
    }
    document.title = 'گیک‌کلاب | GeekClub - مرجع محتوای گلچین شده';
  }, [singlePostId, contents]);

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

  // Load profiles from backend REST / Firestore on startup
  useEffect(() => {
    api.getProfiles().then((remoteProfiles) => {
      if (remoteProfiles && Object.keys(remoteProfiles).length > 0) {
        setUsersList((prev) => {
          const map = new Map(prev.map((u) => [u.uid, u]));
          Object.values(remoteProfiles).forEach((p: any) => {
            if (p && p.uid) {
              map.set(p.uid, { ...map.get(p.uid), ...p });
            }
          });
          return Array.from(map.values());
        });
      }
    }).catch(() => {});
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  useEffect(() => {
    // Ensure soft-deleted or active items that exist in the database are NOT mistakenly tombstoned locally
    const cleanupDeletedIdsCache = (items: ContentItem[]) => {
      try {
        const raw = localStorage.getItem('mediahub_deleted_ids_v1');
        if (raw) {
          const existing: string[] = JSON.parse(raw);
          const activeOrTrashIds = new Set<string>();
          for (const item of items) {
            if (item && item.id) {
              const strId = String(item.id);
              activeOrTrashIds.add(strId);
              const clean = strId.replace(/^(post|content)-/, '');
              activeOrTrashIds.add(clean);
              activeOrTrashIds.add(`post-${clean}`);
              activeOrTrashIds.add(`content-${clean}`);
            }
          }
          const cleaned = existing.filter((id) => !activeOrTrashIds.has(id));
          localStorage.setItem('mediahub_deleted_ids_v1', JSON.stringify(cleaned));
        }
      } catch {}
    };

    async function syncBackendData() {
      try {
        const serverContents = await api.getContents({ includeDeleted: true });
        if (Array.isArray(serverContents)) {
          const fresh = applyPendingOverrides(serverContents);
          setContents(fresh);
          cleanupDeletedIdsCache(fresh);
          try {
            localStorage.setItem('mediahub_content_v2', JSON.stringify(fresh));
          } catch {}
        }
      } catch (err) {
        console.warn('Initial server sync warning:', err);
      } finally {
        setIsInitialLoading(false);
      }
    }
    syncBackendData();

    // Subscribe to server live contents updates across all users & open browsers
    const unsubscribe = api.subscribeContents((items) => {
      // BUGFIX: an EMPTY list is valid (e.g. the last item was deleted) and must not be ignored.
      if (Array.isArray(items)) {
        const fresh = applyPendingOverrides(items);
        setContents(fresh);
        cleanupDeletedIdsCache(fresh);
        setIsInitialLoading(false);
        try {
          localStorage.setItem('mediahub_content_v2', JSON.stringify(fresh));
        } catch {}
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
    const cat = item.category || 'tech';
    const permalink = `${origin}/${cat}/post-${item.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(permalink);
      addToast('success', 'لینک اختصاصی این مطلب با فرمت دسته‌بندی و اسلاگ کپی شد ✨');
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

    const isGenericTitle = newItem.platform !== 'instagram' && (!newItem.title || 
      newItem.title === 'ویدیوی یوتیوب' || 
      newItem.title === 'ویدیوی آپارات' || 
      newItem.title === 'محتوای اشتراک‌گذاری شده' || 
      newItem.title === 'مقاله وب' ||
      newItem.title.startsWith('مقاله در ') ||
      newItem.title.startsWith('ویدیوی آموزشی'));

    const needsThumb = !newItem.thumbnail || 
      (!newItem.thumbnail.includes('upc.geekclub.ir') && !newItem.thumbnail.startsWith('/uploads/')) || 
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
            // Ensure thumbnail is stored on personal CDN or local storage
            let finalCover = enriched.thumbnail || enriched.image;
            if (finalCover && finalCover.includes('upc.geekclub.ir/uploads/')) {
              finalCover = finalCover.substring(finalCover.indexOf('/uploads/'));
            }
            if (finalCover && !finalCover.includes('upc.geekclub.ir') && !finalCover.startsWith('/uploads/') && !finalCover.startsWith('data:')) {
              try {
                const cdnUrl = await transferExternalUrlToCDN(finalCover, 'contents', `cover_${newItem.platform}`);
                if (cdnUrl && cdnUrl.includes('upc.geekclub.ir') && !cdnUrl.includes('upc.geekclub.ir/uploads/')) {
                  finalCover = cdnUrl;
                }
              } catch {}
            }

            const updates: Partial<ContentItem> = {
              ...(newItem.platform === 'instagram'
                ? (newItem.hasCustomTitle && newItem.title && newItem.title.trim() ? { title: newItem.title.trim() } : { title: '' })
                : (enriched.title && enriched.title.trim() ? { title: enriched.title.trim() } : {})),
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
    api.saveProfile(resolvedUser).catch(() => {});
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
      const verified = await loginWithDirectGoogleOAuth();

      // Check if user already exists in usersList and has completed registration
      const existing = usersList.find(
        (u) =>
          (u.email && verified.email && u.email.toLowerCase() === verified.email.toLowerCase()) ||
          u.uid === verified.uid
      );

      const isAlreadyRegistered = Boolean(
        existing && (existing.hasCompletedRegistration || (existing.username && existing.username !== 'user'))
      );

      if (isAlreadyRegistered && existing) {
        // Returning user -> direct login without showing registration popup
        handleLogin({
          ...existing,
          photoURL: verified.photoURL || existing.photoURL,
          displayName: existing.displayName || verified.displayName
        });
      } else {
        // First-time login -> show registration completion popup
        setTempGoogleUser(verified);
        setIsUsernameModalOpen(true);
      }
    } catch (err: any) {
      console.error('Direct Google OAuth login error:', err);
      if (err?.message?.includes('popup_closed') || err?.code === 'auth/popup-closed-by-user') {
        addToast('info', 'فرآیند ورود لغو شد.');
      } else {
        addToast('error', 'خطا در تایید دامنه گوگل (origin_mismatch). راهنمای ثبت دامنه یا ورود با ایمیل باز شد.');
        setIsDomainHelpModalOpen(true);
      }
    } finally {
      setIsLoggingInWithGoogle(false);
    }
  };

  const handleCompleteUsernameSetup = (profile: UserProfile) => {
    handleLogin({
      ...profile,
      hasCompletedRegistration: true
    });
    setIsUsernameModalOpen(false);
    setTempGoogleUser(null);
  };

  const handleBypassWithEmail = (email: string, name: string) => {
    const existing = usersList.find(
      (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
    );

    const isAlreadyRegistered = Boolean(
      existing && (existing.hasCompletedRegistration || (existing.username && existing.username !== 'user'))
    );

    if (isAlreadyRegistered && existing) {
      handleLogin(existing);
    } else {
      setTempGoogleUser({
        uid: existing?.uid || `usr-${Date.now()}`,
        displayName: name || existing?.displayName || 'کاربر گیک',
        email: email,
        photoURL: existing?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'user')}`
      });
      setIsUsernameModalOpen(true);
    }
  };

  // --- Profile, Inbox & Guestbook Handlers ---
  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    api.saveProfile(updatedUser).catch(() => {});
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
  const refreshContentsFromServer = async () => {
    const fresh = await api.getContents({ includeDeleted: true });
    if (Array.isArray(fresh)) setContents(applyPendingOverrides(fresh));
  };

  const handleToggleSoftDelete = async (contentId: string, shouldDelete: boolean) => {
    const deletedAtStr = shouldDelete ? new Date().toLocaleDateString('fa-IR') : undefined;
    const cleanId = stripContentPrefix(contentId);

    // Remember the action so background polling cannot undo it before the server confirms it
    pendingOverridesRef.current.set(contentId, {
      kind: shouldDelete ? 'soft' : 'restore',
      at: Date.now(),
      deletedAt: deletedAtStr
    });

    setContents((prev) => {
      const updated = prev.map((c) => {
        if (c.id === contentId || stripContentPrefix(c.id) === cleanId) {
          return {
            ...c,
            isDeleted: shouldDelete,
            deletedAt: deletedAtStr
          };
        }
        return c;
      });
      try {
        localStorage.setItem('mediahub_content_v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const ok = shouldDelete
      ? await api.softDeleteContent(contentId, deletedAtStr)
      : await api.restoreContent(contentId);

    if (!ok) {
      // The server refused / was unreachable: undo the optimistic change instead of silently reverting later
      pendingOverridesRef.current.delete(contentId);
      await refreshContentsFromServer();
      addToast('error', 'تغییر روی سرور ذخیره نشد. دسترسی مدیریتی یا اتصال به سرور را بررسی کنید.');
      return;
    }

    // Always ensure soft-deleted or restored items are NOT in the permanent-deletion tombstone list
    try {
      const raw = localStorage.getItem('mediahub_deleted_ids_v1');
      if (raw) {
        const curr = JSON.parse(raw);
        const filtered = curr.filter((id: string) => id !== contentId && id !== cleanId && id !== `post-${cleanId}` && id !== `content-${cleanId}`);
        localStorage.setItem('mediahub_deleted_ids_v1', JSON.stringify(filtered));
      }
    } catch {}

    if (shouldDelete) {
      addToast('info', 'محتوا به سطل بازیافت منتقل شد و از فید پنهان گردید (قابل بازگردانی از پنل ادمین).');
    } else {
      addToast('success', 'محتوا با موفقیت از سطل بازیافت به فید عمومی بازگردانده شد.');
    }
  };

  const handlePermanentDelete = async (contentId: string) => {
    const cleanId = stripContentPrefix(contentId);

    pendingOverridesRef.current.set(contentId, { kind: 'perm', at: Date.now() });

    try {
      const raw = localStorage.getItem('mediahub_deleted_ids_v1');
      const curr = raw ? JSON.parse(raw) : [];
      const toAdd = [contentId, cleanId, `post-${cleanId}`, `content-${cleanId}`];
      localStorage.setItem('mediahub_deleted_ids_v1', JSON.stringify(Array.from(new Set([...curr, ...toAdd]))));
    } catch {}

    setContents((prev) => {
      const updated = prev.filter((c) => c.id !== contentId && stripContentPrefix(c.id) !== cleanId);
      try {
        localStorage.setItem('mediahub_content_v2', JSON.stringify(updated.filter((c) => !c.isDeleted)));
      } catch {}
      return updated;
    });

    const ok = await api.deleteContent(contentId);
    if (!ok) {
      pendingOverridesRef.current.delete(contentId);
      await refreshContentsFromServer();
      addToast('error', 'حذف دائمی روی سرور انجام نشد. دسترسی مدیریتی یا اتصال به سرور را بررسی کنید.');
      return;
    }
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

  const handleGoHome = () => {
    setSinglePostId(null);
    handleResetFilters();
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    return contents.filter((c) => c.isDeleted || c.isArchived).length;
  }, [contents]);

  // --- Filtered & Sorted Content List ---
  const filteredContents = useMemo(() => {
    // If Single Post Permalink Mode is active
    if (singlePostId) {
      const match = contents.filter((item) => !(item.isDeleted || item.isArchived) && (item.id === singlePostId || item.id.endsWith(singlePostId)));
      if (match.length > 0) {
        return match;
      }
    }

    return contents
      .filter((item) => {
        // Trash filter for admin
        if (showTrashOnly) {
          return Boolean(item.isDeleted || item.isArchived);
        }

        // Soft-delete filter: Exclude items in trash from public feed
        if (item.isDeleted || item.isArchived) {
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
    <div className="min-h-screen bg-[#090d16] light:bg-[#efefef] text-slate-100 light:text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white w-full">
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
        onGoHome={handleGoHome}
      />
      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6 lg:pr-64">
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
                window.history.pushState({}, '', '/');
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
        {isInitialLoading && filteredContents.length === 0 ? (
          <div className={getGridClasses()}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-4 animate-pulse">
                <div className="w-full h-48 bg-slate-800/80 rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-800 rounded-lg w-3/4" />
                  <div className="h-3 bg-slate-800/60 rounded-lg w-1/2" />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800" />
                  <div className="h-3 bg-slate-800 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContents.length > 0 ? (
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
                onOpenArticleReader={(targetItem) => {
                  setActiveArticleItem(targetItem);
                  const cat = targetItem.category || 'tech';
                  window.history.pushState({}, '', `/${cat}/post-${targetItem.id}`);
                }}
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
      <footer className="border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl py-8 text-xs text-slate-400 mt-12 shadow-lg shadow-slate-950/20 lg:pr-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleGoHome();
              }}
              className="font-bold text-slate-200 hover:text-[#0077d9] transition-colors cursor-pointer"
              title="بازگشت به صفحه اصلی سایت"
            >
              گیک کلاب (GeekClub)
            </a>
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
