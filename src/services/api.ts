import { auth } from '../lib/firebase';
import { ContentItem, CommentItem, Platform, Category, SortOption } from '../types/content';
import { FALLBACK_IMAGES, getAuthorAvatar } from '../utils/imageHelper';
import { INITIAL_CONTENT, INITIAL_COMMENTS } from '../data/initialData';

const CONTENTS_COLLECTION = 'contents';
const COMMENTS_COLLECTION = 'comments';
const DELETED_IDS_KEY = 'mediahub_deleted_ids_v1';
const ADMIN_TOKEN_KEY = 'mediahub_admin_key_v1';

// SECURITY: no admin secret is shipped in the bundle anymore. The admin key is typed in by the admin
// (verified by the server) and kept only for the current browser session.
function getAdminToken(): string {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token: string) {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY); // clean up legacy persistent storage
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {}
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {}
}

// Returns the best credential available: the admin key, or a fresh Firebase ID token of the signed-in user.
async function getAuthToken(): Promise<string> {
  const key = getAdminToken();
  if (key) return key;
  try {
    if (auth.currentUser) return await auth.currentUser.getIdToken();
  } catch {}
  return '';
}

export async function getAdminHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['X-Admin-Key'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const rawUser = localStorage.getItem('mediahub_user_v1');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.email && u.isAdmin) {
        headers['X-Admin-Email'] = u.email;
        headers['X-Admin-Role'] = 'admin';
      }
    }
  } catch {}

  return headers;
}

// Used on read requests so admins also receive trash/archive data (public users never do).
async function getReadHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Admin-Key'] = token;
  }

  try {
    const rawUser = localStorage.getItem('mediahub_user_v1');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.email && u.isAdmin) {
        headers['X-Admin-Email'] = u.email;
        headers['X-Admin-Role'] = 'admin';
      }
    }
  } catch {}

  return headers;
}

/** Asks the SERVER whether this admin key is valid. */
export async function verifyAdminKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getDeletedIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDeletedId(id: string) {
  try {
    const current = getDeletedIds();
    const cleanId = id.replace(/^(post|content)-/, '');
    const toAdd = [id, cleanId, `post-${cleanId}`, `content-${cleanId}`];
    const updated = Array.from(new Set([...current, ...toAdd]));
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(updated));
  } catch {}
}

function removeDeletedId(id: string) {
  try {
    const current = getDeletedIds();
    const cleanId = id.replace(/^(post|content)-/, '');
    const updated = current.filter((item) => item !== id && item !== cleanId && item !== `post-${cleanId}` && item !== `content-${cleanId}`);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(updated));
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
      params.append('includeDeleted', 'true');
      params.append('_t', Date.now().toString());

      const res = await fetch(`/api/contents?${params.toString()}`, {
        cache: 'no-store',
        headers: await getReadHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          return json.data.filter((c: ContentItem) => {
            if (!filters?.includeDeleted && c.isDeleted) return false;
            return true;
          });
        }
      }
    } catch {
      // Server REST endpoint fallback
    }

    return INITIAL_CONTENT.filter((c) => filters?.includeDeleted || !c.isDeleted);
  },

  // Centralized polling subscription for live updates across all open browsers
  subscribeContents(callback: (contents: ContentItem[]) => void): () => void {
    let intervalId: any = null;
    let isSubscribed = true;

    const fetchLatest = async () => {
      if (!isSubscribed) return;
      const readHeaders = await getReadHeaders();
      fetch(`/api/contents?includeDeleted=true&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: readHeaders
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (isSubscribed && json?.data && Array.isArray(json.data)) {
            callback(json.data);
          }
        })
        .catch(() => {});
    };

    // Immediate initial fetch
    fetchLatest();

    // Periodic check every 4 seconds for immediate multi-browser sync
    intervalId = setInterval(fetchLatest, 4000);

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

    return newItem;
  },

  // 3. Update content (approval / edit / delete / reaction)
  async updateContent(id: string, updates: Partial<ContentItem>): Promise<void> {
    const encodedId = encodeURIComponent(id);
    const headers = await getAdminHeaders();

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
  },

  // Returns true only if the SERVER accepted the change (so the UI can react when it was refused)
  async softDeleteContent(id: string, deletedAt?: string): Promise<boolean> {
    const timeStr = deletedAt || new Date().toISOString();
    const encodedId = encodeURIComponent(id);
    const headers = await getAdminHeaders();
    let ok = false;

    // Primary: Express REST API endpoint
    try {
      const r = await fetch(`/api/contents/${encodedId}/soft-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ isDeleted: true, deletedAt: timeStr })
      });
      ok = r.ok;
    } catch {
      try {
        const r = await fetch(`/api/contents/${encodedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isDeleted: true, deletedAt: timeStr })
        });
        ok = r.ok;
      } catch {}
    }

    addDeletedId(id);
    return ok;
  },

  async restoreContent(id: string): Promise<boolean> {
    const encodedId = encodeURIComponent(id);
    const headers = await getAdminHeaders();
    let ok = false;

    try {
      const r = await fetch(`/api/contents/${encodedId}/restore`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ isDeleted: false })
      });
      ok = r.ok;
    } catch {
      try {
        const r = await fetch(`/api/contents/${encodedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isDeleted: false })
        });
        ok = r.ok;
      } catch {}
    }

    removeDeletedId(id);
    return ok;
  },

  async deleteContent(id: string): Promise<boolean> {
    const encodedId = encodeURIComponent(id);
    const headers = await getAdminHeaders();
    let ok = false;

    try {
      const r = await fetch(`/api/contents/${encodedId}/permanent-delete`, {
        method: 'POST',
        headers
      });
      ok = r.ok;
    } catch {
      try {
        const r = await fetch(`/api/contents/${encodedId}`, {
          method: 'DELETE',
          headers
        });
        ok = r.ok;
      } catch {}
    }

    addDeletedId(id);
    return ok;
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

  // 8. Save user profile to REST API
  async saveProfile(profile: any): Promise<void> {
    if (!profile) return;
    try {
      await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } catch {}
  },

  // 9. Fetch profiles from REST API
  async getProfiles(): Promise<Record<string, any>> {
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data === 'object') return json.data;
      }
    } catch {}

    return {};
  },

  // 10. Database Export (Full Site JSON Backup)
  async exportDatabase(): Promise<any> {
    try {
      const res = await fetch('/api/database/export', {
        headers: await getAdminHeaders()
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
        headers: await getAdminHeaders(),
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
        headers: await getAdminHeaders()
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
        headers: await getAdminHeaders()
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
        headers: await getAdminHeaders(),
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
        headers: await getAdminHeaders()
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
        headers: await getAdminHeaders(),
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
        headers: await getAdminHeaders(),
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
        headers: await getAdminHeaders()
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
  },

  // 21. Migrate existing JSON database to PostgreSQL
  async migrateToPostgres(): Promise<{ success: boolean; message?: string; details?: any }> {
    try {
      const res = await fetch('/api/database/migrate-to-postgres', {
        method: 'POST',
        headers: await getAdminHeaders()
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'خطا در مهاجرت به دیتابیس PostgreSQL' };
    }
  },

  // 22. Check Apify diagnostic and token status
  async checkApifyDiagnostic(): Promise<any> {
    try {
      const res = await fetch('/api/debug/apify', {
        headers: await getAdminHeaders()
      });
      if (res.ok) return await res.json();
      return { success: false, message: 'HTTP error ' + res.status };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  // 23. Test Apify Instagram extraction for a given URL
  async testApifyExtraction(url?: string): Promise<any> {
    try {
      const res = await fetch('/api/debug/apify-test', {
        method: 'POST',
        headers: await getAdminHeaders(),
        body: JSON.stringify({ url })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message, message: 'خطا در ارتباط با سرور تست' };
    }
  }
};

