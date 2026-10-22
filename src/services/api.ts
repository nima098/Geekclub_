import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ContentItem, CommentItem, Platform, Category, SortOption } from '../types/content';
import { FALLBACK_IMAGES, getAuthorAvatar } from '../utils/imageHelper';
import { INITIAL_CONTENT, INITIAL_COMMENTS } from '../data/initialData';

const CONTENTS_COLLECTION = 'contents';
const COMMENTS_COLLECTION = 'comments';
const DELETED_IDS_KEY = 'mediahub_deleted_ids_v1';
const ADMIN_TOKEN_KEY = 'mediahub_admin_key_v1';

function getAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY) || '3dsaz2026';
  } catch {
    return '3dsaz2026';
  }
}

export function setAdminToken(token: string) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {}
}

function getAdminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    'X-Admin-Key': token,
    'Authorization': `Bearer ${token}`
  };
}

function getDeletedIds(): string[] {
  try {
    // Clear legacy localStorage blacklist to ensure soft-deleted items show in Trash Bin
    localStorage.removeItem(DELETED_IDS_KEY);
  } catch {}
  return [];
}

function addDeletedId(id: string) {
  try {
    const current = getDeletedIds();
    if (!current.includes(id)) {
      const updated = [...current, id];
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

function removeDeletedId(id: string) {
  try {
    const current = getDeletedIds();
    if (current.includes(id)) {
      const updated = current.filter((item) => item !== id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

export const api = {
  // 1. Fetch contents via Server REST API (100% sanction-proof, works everywhere without 403 errors in Iran)
  async getContents(filters?: {
    platform?: Platform | 'all';
    category?: Category;
    search?: string;
    sort?: SortOption;
    includeDeleted?: boolean;
  }): Promise<ContentItem[]> {
    // Primary: Call server REST endpoint which handles database logic
    try {
      const params = new URLSearchParams();
      if (filters?.platform && filters.platform !== 'all') params.append('platform', filters.platform);
      if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.sort) params.append('sort', filters.sort);
      if (filters?.includeDeleted) {
        params.append('includeDeleted', 'true');
      }
      params.append('_t', Date.now().toString());

      const res = await fetch(`/api/contents?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          try {
            sessionStorage.setItem('geekclub_synced_contents_v2', JSON.stringify(json.data));
          } catch {}
          return json.data.filter((c: ContentItem) => {
            if (!filters?.includeDeleted && (c.isDeleted || c.isArchived)) return false;
            return true;
          });
        }
      }
    } catch {
      // Server REST endpoint fallback
    }

    try {
      const cached = sessionStorage.getItem('geekclub_synced_contents_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((c: ContentItem) => filters?.includeDeleted || (!c.isDeleted && !c.isArchived));
        }
      }
    } catch {}

    return INITIAL_CONTENT.filter((c) => filters?.includeDeleted || (!c.isDeleted && !c.isArchived));
  },

  // Centralized polling subscription for live updates across all open browsers
  subscribeContents(callback: (contents: ContentItem[]) => void): () => void {
    let intervalId: any = null;
    let isSubscribed = true;

    const fetchLatest = () => {
      if (!isSubscribed) return;
      fetch(`/api/contents?includeDeleted=true&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (isSubscribed && json?.data && Array.isArray(json.data)) {
            try {
              sessionStorage.setItem('geekclub_synced_contents_v2', JSON.stringify(json.data));
            } catch {}
            callback(json.data);
          }
        })
        .catch(() => {});
    };

    // Immediate initial fetch
    fetchLatest();

    // Periodic check every 3 seconds for immediate multi-browser sync
    intervalId = setInterval(fetchLatest, 3000);

    return () => {
      isSubscribed = false;
      if (intervalId) clearInterval(intervalId);
    };
  },

  // 2. Add new content to Server REST API & Cloud Firestore
  async addContent(contentData: Partial<ContentItem>): Promise<ContentItem | null> {
    const newId = contentData.id || `content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    removeDeletedId(newId);

    const newItem: ContentItem = {
      id: newId,
      title: contentData.title || 'محتوای اشتراک‌گذاری شده',
      description: contentData.description || '',
      url: contentData.url || '',
      platform: contentData.platform || 'article',
      embedUrl: contentData.embedUrl || contentData.url || '',
      thumbnail: contentData.thumbnail || FALLBACK_IMAGES.article,
      author: contentData.author || {
        name: 'کاربر گیک کلاب',
        avatar: getAuthorAvatar('کاربر گیک کلاب'),
        handle: '@geek',
        isVerified: false
      },
      category: contentData.category || 'tech',
      tags: Array.isArray(contentData.tags) && contentData.tags.length > 0 ? contentData.tags : ['محتوا', 'گیک_کلاب'],
      publishedAt: contentData.publishedAt || 'همین الان',
      readingOrWatchTime: contentData.readingOrWatchTime || '۵ دقیقه',
      likesCount: contentData.likesCount ?? 1,
      dislikesCount: contentData.dislikesCount ?? 0,
      commentsCount: contentData.commentsCount ?? 0,
      approvalStatus: contentData.approvalStatus || 'approved',
      authorUid: contentData.authorUid || '',
      articleContent: contentData.articleContent || contentData.description || '',
      sourceDomain: contentData.sourceDomain || 'web',
      needsEnrichment: Boolean(contentData.needsEnrichment),
      videoUrl: contentData.videoUrl || '',
      mediaType: contentData.mediaType || (contentData.slides && contentData.slides.length > 1 ? 'carousel' : 'image'),
      images: contentData.images || [],
      slides: contentData.slides || [],
      apifyFetched: Boolean(contentData.apifyFetched)
    };

    // Primary: Express REST API endpoint
    try {
      await fetch('/api/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    } catch {}

    // Secondary: Cloud Firestore (silent error catch for 403 networks)
    try {
      await setDoc(doc(db, CONTENTS_COLLECTION, newId), newItem);
    } catch {}

    return newItem;
  },

  // 3. Update content (approval / edit / delete / reaction)
  async updateContent(id: string, updates: Partial<ContentItem>): Promise<void> {
    const encodedId = encodeURIComponent(id);
    const headers = getAdminHeaders();

    // Primary: Express REST API endpoint with POST and PATCH fallbacks
    try {
      await fetch(`/api/contents/${encodedId}/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(updates)
      });
    } catch {
      try {
        await fetch(`/api/contents/${encodedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updates)
        });
      } catch {}
    }

    // Secondary: Cloud Firestore
    try {
      const docRef = doc(db, CONTENTS_COLLECTION, id);
      await setDoc(docRef, updates, { merge: true });
    } catch {}
  },

  async softDeleteContent(id: string, deletedAt?: string): Promise<void> {
    const timeStr = deletedAt || new Date().toISOString();
    const encodedId = encodeURIComponent(id);
    const headers = getAdminHeaders();

    // Primary: Express REST API endpoint
    try {
      const res = await fetch(`/api/contents/${encodedId}/soft-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ isDeleted: true, deletedAt: timeStr })
      });
      if (!res.ok) {
        await fetch(`/api/contents/${encodedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isDeleted: true, isArchived: true, deletedAt: timeStr })
        });
      }
    } catch {
      try {
        await fetch(`/api/contents/${encodedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isDeleted: true, isArchived: true, deletedAt: timeStr })
        });
      } catch {}
    }

    // Keep session cache in sync
    try {
      const cached = sessionStorage.getItem('geekclub_synced_contents_v2');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const updated = list.map((c: ContentItem) =>
            c.id === id || c.id.replace(/^(post|content)-/, '') === id.replace(/^(post|content)-/, '')
              ? { ...c, isDeleted: true, isArchived: true, deletedAt: timeStr }
              : c
          );
          sessionStorage.setItem('geekclub_synced_contents_v2', JSON.stringify(updated));
        }
      }
    } catch {}

    // Secondary: Cloud Firestore
    try {
      const docRef = doc(db, CONTENTS_COLLECTION, id);
      await setDoc(docRef, { isDeleted: true, isArchived: true, deletedAt: timeStr }, { merge: true });
    } catch {}
  },

  async restoreContent(id: string): Promise<void> {
    const encodedId = encodeURIComponent(id);
    const headers = getAdminHeaders();

    // Primary: Express REST API endpoint
    try {
      const res = await fetch(`/api/contents/${encodedId}/restore`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ isDeleted: false })
      });
      if (!res.ok) {
        await fetch(`/api/contents/${encodedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isDeleted: false, isArchived: false })
        });
      }
    } catch {
      try {
        await fetch(`/api/contents/${encodedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isDeleted: false, isArchived: false })
        });
      } catch {}
    }

    // Keep session cache in sync
    try {
      const cached = sessionStorage.getItem('geekclub_synced_contents_v2');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const updated = list.map((c: ContentItem) =>
            c.id === id || c.id.replace(/^(post|content)-/, '') === id.replace(/^(post|content)-/, '')
              ? { ...c, isDeleted: false, isArchived: false }
              : c
          );
          sessionStorage.setItem('geekclub_synced_contents_v2', JSON.stringify(updated));
        }
      }
    } catch {}

    // Secondary: Cloud Firestore
    try {
      const docRef = doc(db, CONTENTS_COLLECTION, id);
      await setDoc(docRef, { isDeleted: false, isArchived: false }, { merge: true });
    } catch {}
  },

  async deleteContent(id: string): Promise<void> {
    const encodedId = encodeURIComponent(id);
    const headers = getAdminHeaders();

    // Primary: Express REST API endpoint
    try {
      await fetch(`/api/contents/${encodedId}/permanent-delete`, {
        method: 'POST',
        headers
      });
    } catch {
      try {
        await fetch(`/api/contents/${encodedId}`, {
          method: 'DELETE',
          headers
        });
      } catch {}
    }

    // Keep session cache in sync
    try {
      const cached = sessionStorage.getItem('geekclub_synced_contents_v2');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const updated = list.filter((c: ContentItem) =>
            c.id !== id && c.id.replace(/^(post|content)-/, '') !== id.replace(/^(post|content)-/, '')
          );
          sessionStorage.setItem('geekclub_synced_contents_v2', JSON.stringify(updated));
        }
      }
    } catch {}

    // Secondary: Cloud Firestore
    try {
      const docRef = doc(db, CONTENTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch {}
  },

  // 4. React to content (like / dislike)
  async reactToContent(id: string, reaction: 'like' | 'dislike'): Promise<ContentItem | null> {
    // Primary: Express REST API endpoint
    try {
      const res = await fetch(`/api/contents/${id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch {}

    // Secondary: Cloud Firestore
    try {
      const docRef = doc(db, CONTENTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const content = docSnap.data() as ContentItem;
        const prevReaction = content.userReaction;
        let newLikes = content.likesCount || 0;
        let newDislikes = content.dislikesCount || 0;
        let newReaction: 'like' | 'dislike' | null = reaction;

        if (reaction === 'like') {
          if (prevReaction === 'like') {
            newLikes = Math.max(0, newLikes - 1);
            newReaction = null;
          } else if (prevReaction === 'dislike') {
            newLikes = newLikes + 1;
            newDislikes = Math.max(0, newDislikes - 1);
          } else {
            newLikes = newLikes + 1;
          }
        } else if (reaction === 'dislike') {
          if (prevReaction === 'dislike') {
            newDislikes = Math.max(0, newDislikes - 1);
            newReaction = null;
          } else if (prevReaction === 'like') {
            newDislikes = newDislikes + 1;
            newLikes = Math.max(0, newLikes - 1);
          } else {
            newDislikes = newDislikes + 1;
          }
        }

        const updatedData = {
          likesCount: newLikes,
          dislikesCount: newDislikes,
          userReaction: newReaction
        };

        await updateDoc(docRef, updatedData);
        return { ...content, ...updatedData };
      }
    } catch {}

    return null;
  },

  // 5. Fetch comments
  async getComments(contentId: string): Promise<CommentItem[]> {
    try {
      const res = await fetch(`/api/contents/${contentId}/comments`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) return json.data;
      }
    } catch {}

    try {
      const q = query(collection(db, COMMENTS_COLLECTION), where('contentId', '==', contentId));
      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CommentItem));
      if (comments.length > 0) return comments;
    } catch {}

    return INITIAL_COMMENTS[contentId] || [];
  },

  // 6. Add comment
  async addComment(contentId: string, text: string, author?: any): Promise<CommentItem | null> {
    const newCommentId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newComment: CommentItem = {
      id: newCommentId,
      contentId,
      author: author || {
        name: 'کاربر گیک کلاب',
        avatar: getAuthorAvatar('کاربر گیک کلاب'),
        email: 'user@geekclub.io'
      },
      text: text.trim(),
      createdAt: 'همین الان',
      likes: 0,
      userLiked: false
    };

    try {
      await fetch(`/api/contents/${contentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author })
      });
    } catch {}

    try {
      await setDoc(doc(db, COMMENTS_COLLECTION, newCommentId), newComment);
    } catch {}

    return newComment;
  },

  // 7. Like comment
  async likeComment(contentId: string, commentId: string): Promise<CommentItem | null> {
    try {
      await fetch(`/api/comments/${contentId}/${commentId}/like`, {
        method: 'POST'
      });
    } catch {}

    return null;
  },

  // 8. Save user profile to REST API and Cloud Firestore
  async saveProfile(profile: any): Promise<void> {
    if (!profile) return;
    try {
      await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } catch {}

    try {
      if (profile.uid) {
        const docRef = doc(db, 'profiles', profile.uid);
        await setDoc(docRef, profile, { merge: true });
      }
    } catch {}
  },

  // 9. Fetch profiles from REST API or Firestore
  async getProfiles(): Promise<Record<string, any>> {
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data === 'object') return json.data;
      }
    } catch {}

    try {
      const snapshot = await getDocs(collection(db, 'profiles'));
      const profilesMap: Record<string, any> = {};
      snapshot.docs.forEach((docSnap) => {
        profilesMap[docSnap.id] = docSnap.data();
      });
      return profilesMap;
    } catch {}

    return {};
  },

  // 10. Database Export (Full Site JSON Backup)
  async exportDatabase(): Promise<any> {
    try {
      const res = await fetch('/api/database/export', {
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
    } catch {}
    return null;
  },

  // 11. Database Import (Full Site Restoration)
  async importDatabase(jsonData: any): Promise<{ success: boolean; message?: string; summary?: any }> {
    try {
      const res = await fetch('/api/database/import', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(jsonData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
    return { success: false, message: 'خطا در بازیابی اطلاعات' };
  },

  // 12. Merge Seed Data without deleting user items
  async mergeSeeds(): Promise<{ success: boolean; message?: string; mergedCount?: number }> {
    try {
      const res = await fetch('/api/database/merge-seeds', {
        method: 'POST',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
    return { success: false, message: 'خطا در ادغام داده‌های نمونه' };
  },

  // 13. Soft delete (archive) content
  async archiveContent(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/contents/${id}/archive`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },



  // 15. Update user role (admin, editor, user)
  async updateUserRole(key: string, role: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/profiles/${key}/role`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ role })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // 16. Get pending code seeds
  async getPendingSeeds(): Promise<ContentItem[]> {
    try {
      const res = await fetch('/api/seeds/pending', {
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) return json.data;
      }
    } catch {}
    return [];
  },

  // 17. Approve pending seed
  async approveSeed(id: string): Promise<boolean> {
    try {
      const res = await fetch('/api/seeds/approve', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ id })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // 18. Reject pending seed
  async rejectSeed(id: string): Promise<boolean> {
    try {
      const res = await fetch('/api/seeds/reject', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ id })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // 19. Trigger 12-hour database backup manually
  async backupDatabaseNow(): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const res = await fetch('/api/database/backup-now', {
        method: 'POST',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
    return { success: false, message: 'خطا در اجرای پشتیبان‌گیری' };
  },

  // 20. Check database diagnostic and connectivity
  async checkDatabaseDiagnostic(): Promise<any> {
    try {
      const res = await fetch(`/api/database-diagnostic?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        return await res.json();
      }
      return { success: false, message: 'HTTP error status: ' + res.status };
    } catch (err: any) {
      return { success: false, message: err.message || 'خطا در ارتباط با سرور' };
    }
  }
};

