import { 
  ContentItem, 
  CommentItem, 
  UserProfile, 
  SiteAdminSettings,
  FeedbackItem,
  InboxMessage,
  ProfileComment
} from '../types/content';
import { FALLBACK_IMAGES, getAuthorAvatar } from '../utils/imageHelper';

export const SUPER_ADMIN_EMAIL = '3dsaz1990@gmail.com';

export const SUPER_ADMIN_USER: UserProfile = {
  uid: 'admin-super-uid',
  displayName: 'مدیر کل سیستم',
  username: 'admin',
  email: SUPER_ADMIN_EMAIL,
  hideEmail: false,
  photoURL: getAuthorAvatar('مدیر کل سیستم'),
  bio: 'مدیریت ارشد پلتفرم اشتراک‌گذاری رسانه گیک‌کلاب',
  allowProfileComments: true,
  joinedAt: 'مهر ۱۴۰۴',
  isAdmin: true,
  autoApproveContent: true,
  role: 'super_admin',
  hasCompletedRegistration: true
};

export const DEFAULT_USER: UserProfile = {
  uid: 'admin-super-uid',
  displayName: 'مدیر کل سیستم (3dsaz)',
  username: 'admin',
  email: SUPER_ADMIN_EMAIL,
  hideEmail: false,
  photoURL: getAuthorAvatar('مدیر کل سیستم'),
  bio: 'مدیریت ارشد پلتفرم اشتراک‌گذاری رسانه گیک‌کلاب',
  allowProfileComments: true,
  joinedAt: 'مهر ۱۴۰۴',
  isAdmin: true,
  autoApproveContent: true,
  role: 'super_admin',
  hasCompletedRegistration: true
};

export const INITIAL_REGISTERED_USERS: UserProfile[] = [
  SUPER_ADMIN_USER,
  DEFAULT_USER
];

export const DEFAULT_SITE_SETTINGS: SiteAdminSettings = {
  requireContentApproval: true,
  notifyOnPending: true,
  allowYouTube: true,
  allowInstagram: true,
  allowArticles: true,
  allowAparat: true,
  enableCaptcha: false,
  enableAutoModeration: true,
  bannedKeywords: [],
  bannedDomains: []
};

export const INITIAL_CONTENT: ContentItem[] = [
  {
    id: 'ig-1',
    title: '۵ ترفند فوق‌العاده در جاوااسکریپت که کدنویسی را ۳ برابر سریع‌تر می‌کند',
    description: 'ترفندهای کاربردی ES2024 و میانبرهای آرایه‌ها و آبجکت‌ها که خوانایی و عملکرد کدهای جاوااسکریپت و تایپ‌اسکریپت شما را بالا می‌برد.',
    url: 'https://www.instagram.com/reel/C8kP2qXyZa1/',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/reel/C8kP2qXyZa1/embed',
    thumbnail: FALLBACK_IMAGES.instagram,
    author: {
      name: 'کد با سارا',
      avatar: getAuthorAvatar('کد با سارا'),
      handle: '@codewith_sara',
      isVerified: true
    },
    category: 'programming',
    tags: ['جاوااسکریپت', 'ترفند کدنویسی', 'فرانت‌اند', 'تایپ‌اسکریپت'],
    publishedAt: 'دیروز',
    readingOrWatchTime: '۶۰ ثانیه ریلز',
    likesCount: 310,
    dislikesCount: 4,
    commentsCount: 45,
    userReaction: null,
    sourceDomain: 'instagram.com',
    hasCustomTitle: true
  },
  {
    id: 'yt-2',
    title: 'آموزش ساخت اپلیکیشن فول‌استک با ری‌اکت و تیلویند (صفر تا صد)',
    description: 'در این آموزش جامع، یک پروژه واقعی از صفر را با معماری استاندارد و کامپوننت‌های مدرن پیاده‌سازی و روی بستر ابری مستقر می‌کنیم.',
    url: 'https://www.youtube.com/watch?v=LDB4uaJ87e0',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/LDB4uaJ87e0',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_af47b80a.jpg',
    author: {
      name: 'فرهاد نصیری',
      avatar: getAuthorAvatar('فرهاد نصیری'),
      handle: '@farhad_dev',
      isVerified: true
    },
    category: 'programming',
    tags: ['ری‌اکت', 'Tailwind CSS', 'فول استک', 'آموزش پروژه محور'],
    publishedAt: '۲ روز پیش',
    readingOrWatchTime: '۳۵ دقیقه',
    likesCount: 224,
    dislikesCount: 5,
    commentsCount: 28,
    userReaction: null,
    sourceDomain: 'youtube.com'
  },
  {
    id: 'art-2',
    title: 'بررسی راهکارهای بهینه‌سازی دیتابیس برای سرویس‌های با ترافیک بالا',
    description: 'بررسی تکنیک‌های کش‌گذاری چندلایه با Redis، ایندکس‌گذاری بهینه و استراتژی‌های پارتیشن‌بندی اطلاعات در سیستم‌های توزیع‌شده.',
    url: 'https://medium.com/@techlead/high-scale-database-strategies',
    platform: 'article',
    embedUrl: 'https://medium.com/@techlead/high-scale-database-strategies',
    thumbnail: FALLBACK_IMAGES.article,
    author: {
      name: 'مهندس آرش شریفی',
      avatar: getAuthorAvatar('مهندس آرش شریفی'),
      handle: 'معمار نرم‌افزار',
      isVerified: true
    },
    category: 'tech',
    tags: ['پایگاه داده', 'مقیاس‌پذیری', 'Redis', 'معماری سیستم'],
    publishedAt: '۳ روز پیش',
    readingOrWatchTime: '۱۲ دقیقه مطالعه',
    likesCount: 165,
    dislikesCount: 3,
    commentsCount: 14,
    userReaction: null,
    sourceDomain: 'medium.com',
    articleContent: `وقتی تعداد درخواست‌های همزمان به هزاران کوئری در ثانیه می‌رسد، دیتابیس‌های سنتی اولین نقطه‌ای هستند که دچار گلوگاه می‌شوند.

راهکارهای اساسی برای حفظ پایداری:
۱. استفاده از لایه Cache-Aside با Redis جهت کاهش کوئری‌های تکراری
۲. بازبینی و حذف ایندکس‌های بلااستفاده و بهینه‌سازی کلاسترد ایندکس‌ها
۳. جداسازی کوئری‌های خواندن و نوشتن از طریق Read Replicas
۴. استفاده از Connection Pool کارآمد به جای ایجاد کانکشن در هر درخواست

با اعمال این روش‌ها می‌توانید تا ۷۰ درصد بار روی دیتابیس اصلی را کاهش داده و زمان پاسخگویی (Latency) را به کمتر از ۲۰ میلی‌ثانیه برسانید.`
  },
  {
    id: 'ig-2',
    title: 'آنباکس و تست ابزار هوشمند ضبط پادکست و تولید محتوا ۲۰۲۶',
    description: 'بررسی میکروفون استودیویی و کارت صدای بی‌سیم جدید با فناوری حذف نویز هوشمند مبتنی بر هوش مصنوعی سخت‌افزاری.',
    url: 'https://www.instagram.com/p/C9ab12cdEFg/',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/p/C9ab12cdEFg/embed',
    thumbnail: FALLBACK_IMAGES.instagram,
    author: {
      name: 'استودیو پادکس',
      avatar: getAuthorAvatar('استودیو پادکس'),
      handle: '@podx_studio',
      isVerified: false
    },
    category: 'entertainment',
    tags: ['تولید محتوا', 'پادکست', 'تجهیزات استودیو', 'اینستاگرام'],
    publishedAt: '۴ روز پیش',
    readingOrWatchTime: 'پست اسلایدی',
    likesCount: 420,
    dislikesCount: 8,
    commentsCount: 52,
    userReaction: null,
    sourceDomain: 'instagram.com',
    hasCustomTitle: true
  },
  {
    id: 'art-3',
    title: 'اصول راه‌اندازی استارتاپ تکنولوژی با رویکرد چابک (Lean Startup)',
    description: 'چگونه ایده اولیه خود را با حداقل هزینه و ساخت MVP اعتبارسنجی کنید و از صرف ماه‌ها زمان روی محصولی که مشتری ندارد جلوگیری نمایید.',
    url: 'https://techcrunch.ir/startup-lean-validation-guide',
    platform: 'article',
    embedUrl: 'https://techcrunch.ir/startup-lean-validation-guide',
    thumbnail: FALLBACK_IMAGES.article,
    author: {
      name: 'الهام سعیدی',
      avatar: getAuthorAvatar('الهام سعیدی'),
      handle: 'مشاور استارتاپ‌ها',
      isVerified: true
    },
    category: 'business',
    tags: ['استارتاپ', 'کسب و کار', 'مدیریت محصول', 'MVP'],
    publishedAt: '۱ هفته پیش',
    readingOrWatchTime: '۹ دقیقه مطالعه',
    likesCount: 205,
    dislikesCount: 6,
    commentsCount: 17,
    userReaction: null,
    sourceDomain: 'techcrunch.ir',
    articleContent: `بزرگ‌ترین اشتباه بنیان‌گذاران، غرق شدن در ساخت بی‌نقص محصول قبل از صحبت با مشتریان واقعی است.

چرخه ساخت - سنجش - یادگیری (Build - Measure - Learn):
۱. فرضیه‌های اصلی خود را مشخص کنید: مشتریان چه مشکلی دارند و آیا حاضرند برای حل آن پول پرداخت کنند؟
۲. کمینه‌محصول‌پذیرفتنی (MVP) را در سریع‌ترین زمان ممکن به دست کاربر برسانید.
۳. داده‌های رفتاری را با معیارهای عملیاتی بسنجید نه معیارهای کاذب.
۴. در صورت لزوم چرخش استراتژیک (Pivot) انجام دهید یا با اطمینان مقیاس کار را افزایش دهید.`
  }
];

export const INITIAL_COMMENTS: Record<string, CommentItem[]> = {
  'yt-1': [
    {
      id: 'c-1',
      contentId: 'yt-1',
      author: {
        name: 'رضا کمالی',
        avatar: getAuthorAvatar('رضا کمالی')
      },
      text: 'فوق‌العاده بود! بالاخره یه ویدیو پیدا کردم که عمیق به مقایسه این مدل‌ها بپردازه.',
      createdAt: '۱ ساعت پیش',
      likes: 12
    }
  ],
  'art-1': [
    {
      id: 'c-2',
      contentId: 'art-1',
      author: {
        name: 'مریم حسینی',
        avatar: getAuthorAvatar('مریم حسینی')
      },
      text: 'دقیقاً با نکته ریزانیمیشن‌ها موافقم. حس سرزنده‌بودن به اپ میده.',
      createdAt: '۳ ساعت پیش',
      likes: 8
    }
  ]
};

export const INITIAL_INBOX: InboxMessage[] = [
  {
    id: 'msg-1',
    sender: {
      name: 'پشتیبانی گیک‌کلاب',
      avatar: getAuthorAvatar('پشتیبانی گیک‌کلاب'),
      isSystemAdmin: true,
      role: 'سیستم'
    },
    subject: 'خوش‌آمدگویی به پلتفرم گیک‌کلاب',
    content: 'به جامعه برنامه‌نویسان و تولیدکنندگان محتوای تکنولوژی خوش آمدید! می‌توانید از بخش ارسال محتوا، لینک‌های آموزشی خود را اشتراک بگذارید.',
    createdAt: 'دیروز',
    read: true,
    type: 'system'
  }
];

export const INITIAL_PROFILE_COMMENTS: Record<string, ProfileComment[]> = {
  'usr-sara': [
    {
      id: 'pc-1',
      profileUserId: 'usr-sara',
      author: {
        name: 'فرهاد نصیری',
        avatar: getAuthorAvatar('فرهاد نصیری'),
        username: 'farhad_dev'
      },
      text: 'پست‌های فوق‌العاده‌ای در حوزه UI/UX منتشر می‌کنی. موفق باشی!',
      createdAt: '۲ روز پیش'
    }
  ]
};

export const INITIAL_FEEDBACK: FeedbackItem[] = [
  {
    id: 'fb-1',
    senderName: 'امین',
    senderEmail: 'amin@gmail.com',
    isGuest: false,
    type: 'suggestion',
    title: 'پیشنهاد افزودن حالت تاریک هوشمند',
    message: 'اگر امکان سوئیتچ خودکار بین تم تاریک و روشن بر اساس ساعت وجود داشته باشد عالی است.',
    createdAt: '۳ روز پیش',
    status: 'reviewed'
  }
];
