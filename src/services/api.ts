import { ContentItem, CommentItem, Platform, Category, SortOption } from '../types/content';

export const api = {
  // 1. Fetch contents with optional filters
  async getContents(filters?: {
    platform?: Platform | 'all';
    category?: Category;
    search?: string;
    sort?: SortOption;
  }): Promise<ContentItem[]> {
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
    } catch (err) {
      console.warn('Backend API not responding, falling back to local state:', err);
    }
    return [];
  },

  // 2. Add new content
  async addContent(contentData: Partial<ContentItem>): Promise<ContentItem | null> {
    try {
      const res = await fetch('/api/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contentData)
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (err) {
      console.warn('Backend API error adding content:', err);
    }
    return null;
  },

  // 3. React to content (like / dislike)
  async reactToContent(id: string, reaction: 'like' | 'dislike'): Promise<ContentItem | null> {
    try {
      const res = await fetch(`/api/contents/${id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (err) {
      console.warn('Backend API error registering reaction:', err);
    }
    return null;
  },

  // 4. Fetch comments for a content item
  async getComments(contentId: string): Promise<CommentItem[]> {
    try {
      const res = await fetch(`/api/contents/${contentId}/comments`);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (err) {
      console.warn('Backend API error getting comments:', err);
    }
    return [];
  },

  // 5. Add a comment
  async addComment(contentId: string, text: string, author?: any): Promise<CommentItem | null> {
    try {
      const res = await fetch(`/api/contents/${contentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (err) {
      console.warn('Backend API error adding comment:', err);
    }
    return null;
  },

  // 6. Like a comment
  async likeComment(contentId: string, commentId: string): Promise<CommentItem | null> {
    try {
      const res = await fetch(`/api/comments/${contentId}/${commentId}/like`, {
        method: 'POST'
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (err) {
      console.warn('Backend API error liking comment:', err);
    }
    return null;
  }
};
