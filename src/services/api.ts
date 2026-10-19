import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ContentItem, CommentItem, Platform, Category, SortOption, FeedbackItem, SiteAdminSettings } from '../types/content';
import { INITIAL_CONTENT, INITIAL_COMMENTS, DEFAULT_SITE_SETTINGS } from '../data/initialData';

const CONTENTS_COLLECTION = 'contents';
const COMMENTS_COLLECTION = 'comments';
const SETTINGS_COLLECTION = 'siteSettings';
const FEEDBACK_COLLECTION = 'feedback';

// Flag to track whether initial seed has run in this session
let isSeeded = false;

async function seedInitialDataIfEmpty() {
  if (isSeeded) return;
  try {
    const snapshot = await getDocs(collection(db, CONTENTS_COLLECTION));
    if (snapshot.empty) {
      console.log('Firestore contents collection empty. Seeding initial data...');
      const batch = writeBatch(db);
      for (const item of INITIAL_CONTENT) {
        const itemRef = doc(db, CONTENTS_COLLECTION, item.id);
        batch.set(itemRef, item);
      }
      await batch.commit();

      // Seed comments
      const commentBatch = writeBatch(db);
      for (const [contentId, commentList] of Object.entries(INITIAL_COMMENTS)) {
        for (const comment of commentList) {
          const cRef = doc(db, COMMENTS_COLLECTION, comment.id);
          commentBatch.set(cRef, comment);
        }
      }
      await commentBatch.commit();
      console.log('Firestore initial seed completed successfully.');
    }
    isSeeded = true;
  } catch (err) {
    console.warn('Error checking/seeding Firestore:', err);
  }
}

export const api = {
  // 1. Fetch contents with optional filters directly from Cloud Firestore
  async getContents(filters?: {
    platform?: Platform | 'all';
    category?: Category;
    search?: string;
    sort?: SortOption;
  }): Promise<ContentItem[]> {
    try {
      await seedInitialDataIfEmpty();
      const snapshot = await getDocs(collection(db, CONTENTS_COLLECTION));
      let results: ContentItem[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as ContentItem));

      if (filters?.platform && filters.platform !== 'all') {
        results = results.filter((c) => c.platform === filters.platform);
      }

      if (filters?.category && filters.category !== 'all') {
        results = results.filter((c) => c.category === filters.category);
      }

      if (filters?.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        results = results.filter((c) => {
          const matchTitle = c.title?.toLowerCase().includes(q);
          const matchDesc = c.description?.toLowerCase().includes(q);
          const matchAuthor = c.author?.name?.toLowerCase().includes(q);
          const matchTags = c.tags?.some((t: string) => t.toLowerCase().includes(q));
          return matchTitle || matchDesc || matchAuthor || matchTags;
        });
      }

      if (filters?.sort === 'most_liked') {
        results.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      } else if (filters?.sort === 'most_comments') {
        results.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
      } else if (filters?.sort === 'trending') {
        results.sort((a, b) => {
          const scoreA = (a.likesCount || 0) * 2 + (a.commentsCount || 0) * 3 - (a.dislikesCount || 0);
          const scoreB = (b.likesCount || 0) * 2 + (b.commentsCount || 0) * 3 - (b.dislikesCount || 0);
          return scoreB - scoreA;
        });
      }

      return results;
    } catch (err) {
      console.warn('Firestore fetch failed, falling back to local Express/initial state:', err);
      try {
        const params = new URLSearchParams();
        if (filters?.platform && filters.platform !== 'all') params.append('platform', filters.platform);
        if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.sort) params.append('sort', filters.sort);

        const res = await fetch(`/api/contents?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          return json.data;
        }
      } catch (e) {
        console.warn('Express API fallback error:', e);
      }
      return INITIAL_CONTENT;
    }
  },

  // Real-time Firestore subscription for live updates across Vercel and local dev
  subscribeContents(callback: (contents: ContentItem[]) => void): () => void {
    let unsub: (() => void) | null = null;
    seedInitialDataIfEmpty().then(() => {
      unsub = onSnapshot(collection(db, CONTENTS_COLLECTION), (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
        if (items.length > 0) {
          callback(items);
        }
      }, (err) => {
        console.warn('Firestore snapshot error:', err);
      });
    }).catch(() => {});

    return () => {
      if (unsub) unsub();
    };
  },

  // 2. Add new content to Cloud Firestore
  async addContent(contentData: Partial<ContentItem>): Promise<ContentItem | null> {
    try {
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
        sourceDomain: contentData.sourceDomain || 'web'
      };

      // Save to Cloud Firestore permanently
      await setDoc(doc(db, CONTENTS_COLLECTION, newId), newItem);

      // Also notify local Express server if present
      fetch('/api/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      }).catch(() => {});

      return newItem;
    } catch (err) {
      console.warn('Firestore addContent error:', err);
    }
    return null;
  },

  // 3. Update content (approval / edit / delete / reaction)
  async updateContent(id: string, updates: Partial<ContentItem>): Promise<void> {
    try {
      const docRef = doc(db, CONTENTS_COLLECTION, id);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.warn('Firestore updateContent error:', err);
    }
  },

  async deleteContent(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, CONTENTS_COLLECTION, id));
    } catch (err) {
      console.warn('Firestore deleteContent error:', err);
    }
  },

  // 4. React to content (like / dislike)
  async reactToContent(id: string, reaction: 'like' | 'dislike'): Promise<ContentItem | null> {
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

        // Also notify Express server if available
        fetch(`/api/contents/${id}/reaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction })
        }).catch(() => {});

        return { ...content, ...updatedData };
      }
    } catch (err) {
      console.warn('Firestore reactToContent error:', err);
    }
    return null;
  },

  // 5. Fetch comments for a content item from Firestore
  async getComments(contentId: string): Promise<CommentItem[]> {
    try {
      const q = query(collection(db, COMMENTS_COLLECTION), where('contentId', '==', contentId));
      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CommentItem));
      if (comments.length > 0) return comments;
    } catch (err) {
      console.warn('Firestore getComments error:', err);
    }
    return INITIAL_COMMENTS[contentId] || [];
  },

  // 6. Add a comment to Firestore
  async addComment(contentId: string, text: string, author?: any): Promise<CommentItem | null> {
    try {
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

      await setDoc(doc(db, COMMENTS_COLLECTION, newCommentId), newComment);

      // Increment commentsCount on content item
      const contentRef = doc(db, CONTENTS_COLLECTION, contentId);
      const contentSnap = await getDoc(contentRef);
      if (contentSnap.exists()) {
        const currentCount = contentSnap.data().commentsCount || 0;
        await updateDoc(contentRef, { commentsCount: currentCount + 1 });
      }

      return newComment;
    } catch (err) {
      console.warn('Firestore addComment error:', err);
    }
    return null;
  },

  // 7. Like a comment in Firestore
  async likeComment(contentId: string, commentId: string): Promise<CommentItem | null> {
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      const snap = await getDoc(commentRef);
      if (snap.exists()) {
        const comment = snap.data() as CommentItem;
        const isLiked = comment.userLiked;
        const newLikes = isLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1;
        const updated = { likes: newLikes, userLiked: !isLiked };
        await updateDoc(commentRef, updated);
        return { ...comment, ...updated };
      }
    } catch (err) {
      console.warn('Firestore likeComment error:', err);
    }
    return null;
  }
};
