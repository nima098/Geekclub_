export type Platform = 'youtube' | 'instagram' | 'article' | 'aparat';

export type Category = 
  | 'all'
  | 'tech'
  | 'ai'
  | 'programming'
  | 'design'
  | 'business'
  | 'science'
  | 'entertainment';

export interface CategoryDefinition {
  id: Category;
  label: string;
  keywords: string[];
}

export const SITE_CATEGORIES: CategoryDefinition[] = [
  { id: 'ai', label: 'هوش مصنوعی', keywords: ['ai', 'هوش مصنوعی', 'gpt', 'llm', 'پرامپت', 'ماشین', 'deep learning'] },
  { id: 'programming', label: 'برنامه‌نویسی', keywords: ['کد', 'کدنویسی', 'react', 'javascript', 'python', 'تایپ‌اسکریپت', 'جاوااسکریپت', 'فرانت‌اند', 'برنامه‌نویسی', 'vscode', 'توسعه'] },
  { id: 'tech', label: 'تکنولوژی', keywords: ['تکنولوژی', 'فناوری', 'سخت‌افزار', 'گجت', 'موبایل', 'دیتابیس', 'سرور', 'شبکه'] },
  { id: 'design', label: 'طراحی رابط کاربری', keywords: ['ui', 'ux', 'دیزاین', 'طراحی', 'فیگما', 'تجربه کاربری', 'رابط کاربری'] },
  { id: 'business', label: 'استارتاپ و بیزینس', keywords: ['استارتاپ', 'کسب‌وکار', 'کارآفرینی', 'مارکتینگ', 'mvp', 'سرمایه', 'بیزینس'] },
  { id: 'entertainment', label: 'سرگرمی و رسانه', keywords: ['سرگرمی', 'رسانه', 'پادکست', 'ویدیو', 'گیم', 'بازی', 'فیلم'] },
  { id: 'science', label: 'علم و پژوهش', keywords: ['علم', 'دانش', 'پژوهش', 'فیزیک', 'نجوم', 'پزشکی', 'تحقیق'] },
];

export function inferCategoryFromContent(title: string, description: string, tags: string[] = []): Category {
  const combined = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
  for (const cat of SITE_CATEGORIES) {
    if (cat.keywords.some((k) => combined.includes(k.toLowerCase()))) {
      return cat.id;
    }
  }
  return 'tech';
}


export interface Author {
  name: string;
  avatar: string;
  handle?: string;
  isVerified?: boolean;
}

export interface CommentItem {
  id: string;
  contentId: string;
  author: {
    name: string;
    avatar: string;
    email?: string;
  };
  text: string;
  createdAt: string;
  likes: number;
  userLiked?: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: Platform;
  embedUrl: string;
  thumbnail: string;
  author: Author;
  category: Category;
  tags: string[];
  publishedAt: string;
  readingOrWatchTime: string;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  userReaction?: 'like' | 'dislike' | null;
  saved?: boolean;
  articleContent?: string;
  sourceDomain?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  authorUid?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  moderationReason?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string; // custom @handle
  email: string;
  hideEmail: boolean; // hide email from other users
  photoURL: string;
  bio?: string;
  allowProfileComments: boolean; // default true
  joinedAt?: string;
  isAdmin?: boolean;
  autoApproveContent?: boolean; // When true, content is published immediately without admin approval
  role?: string;
}

export interface SiteAdminSettings {
  requireContentApproval: boolean;
  notifyOnPending?: boolean;
  allowYouTube: boolean;
  allowInstagram: boolean;
  allowArticles: boolean;
  allowAparat: boolean;
  enableCaptcha: boolean;
  bannedKeywords?: string[];
  bannedDomains?: string[];
  enableAutoModeration?: boolean;
}

export interface FeedbackItem {
  id: string;
  senderName: string;
  senderEmail?: string;
  isGuest: boolean;
  type: 'suggestion' | 'critique' | 'bug' | 'other';
  title: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  adminReply?: string;
}

export interface InboxMessage {
  id: string;
  sender: {
    name: string;
    avatar: string;
    isSystemAdmin?: boolean;
    role?: string;
  };
  subject: string;
  content: string;
  createdAt: string;
  read: boolean;
  type: 'admin' | 'user' | 'system';
}

export interface ProfileComment {
  id: string;
  profileUserId: string;
  author: {
    name: string;
    avatar: string;
    username?: string;
  };
  text: string;
  createdAt: string;
}

export type SortOption = 'newest' | 'most_liked' | 'most_comments' | 'trending';
export type ViewMode = 'grid3' | 'grid2' | 'compact';
