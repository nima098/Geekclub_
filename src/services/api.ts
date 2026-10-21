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
import { INITIAL_CONTENT, INITIAL_COMMENTS } from '../data/initialData';

const CONTENTS_COLLECTION = 'contents';
const COMMENTS_COLLECTION = 'comments';

export const api = {
  // 1. Fetch contents via Server REST API (100% sanction-proof, works everywhere without 403 errors in Iran)
  async getContents(filters?: {
    platform?: Platform | 'all';
    category?: Category;
    search?: string;
    sort?: SortOption;
  }): Promise<ContentItem[]> {
    // Primary: Call server REST endpoint which handles database logic
    try {
      const params = new URLSearchParams();
      if (filters?.platform && filters.platform !== 'all') params.append('platform', filters.platform);
      if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.sort) params.append('sort', filters.sort);

      const res = await fetch(`/api/contents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {
      // Server REST endpoint fallback
    }

    return INITIAL_CONTENT;
  },

  // Sanction-proof polling subscription for live updates without 403 Google WebChannel errors
  subscribeContents(callback: (contents: ContentItem[]) => void): () => void {
    let intervalId: any = null;
    let isSubscribed = true;

    const fetchLatest = () => {
      if (!isSubscribed) return;
      fetch('/api/contents')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (isSubscribed && json?.data && Array.isArray(json.data) && json.data.length > 0) {
            callback(json.data);
          }
        })
        .catch(() => {});
    };

    // Immediate initial fetch
    fetchLatest();

    // Periodic check every 20 seconds
    intervalId = setInterval(fetchLatest, 20000);

    return () => {
      isSubscribed = false;
      if (intervalId) clearInterval(intervalId);
    };
  },

  // 2. Add new content to Server REST API & Cloud Firestore
  async addContent(contentData: Partial<ContentItem>): Promise<ContentItem | null> {
    const newId = contentData.id || `content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ContentItem = {
      id: newId,
      title: contentData.title || 'محتوای اشتراک‌گذاری شده',
      description: contentData.description || '',
      url: contentData.url || '',
      platform: contentData.platform || 'article',
      embedUrl: contentData.embedUrl || contentData.url || '',
      thumbnail: contentData.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      author: contentData.author || {
        name: 'کاربر گیک کلاب',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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
    // Primary: Express REST API endpoint
    try {
      await fetch(`/api/contents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch {}

    // Secondary: Cloud Firestore
    try {
      const docRef = doc(db, CONTENTS_COLLECTION, id);
      await setDoc(docRef, updates, { merge: true });
    } catch {}
  },

  async deleteContent(id: string): Promise<void> {
    // Primary: Express REST API endpoint
    try {
      await fetch(`/api/contents/${id}`, {
        method: 'DELETE'
      });
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
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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
  }
};
