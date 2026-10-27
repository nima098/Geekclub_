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
    id: 'ig-da7z2zvjklL',
    title: 'پست آلبومی و چند اسلایدی اینستاگرام',
    description: 'پست چند اسلایدی اینستاگرام شامل عکس‌ها و ویدیوهای دریافت شده از طریق Apify و آپلود شده روی CDN اختصاصی upc.geekclub.ir/s1/instagram/.',
    url: 'https://www.instagram.com/p/Da7Z2zvjklL/?utm_source=ig_web_copy_link&mdxt=MzRlODBiNWFlZA==&srtk=MzRlODBiNWFlZA==',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/p/Da7Z2zvjklL/embed',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
    mediaType: 'carousel',
    slides: [
      {
        type: 'image',
        url: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg'
      },
      {
        type: 'image',
        url: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_9b7ad12d.jpg'
      },
      {
        type: 'image',
        url: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_af47b80a.jpg'
      }
    ],
    author: {
      name: 'پیج اینستاگرام گیک',
      avatar: getAuthorAvatar('پیج اینستاگرام گیک'),
      handle: '@geek_instagram',
      isVerified: true
    },
    category: 'tech',
    tags: ['اینستاگرام', 'آلبوم', 'اسلایدر', 'CDN'],
    publishedAt: 'همین الان',
    readingOrWatchTime: '۳ اسلاید چندرسانه‌ای',
    likesCount: 15,
    dislikesCount: 0,
    commentsCount: 2,
    userReaction: 'like',
    sourceDomain: 'instagram.com',
    approvalStatus: 'approved',
    isDeleted: true
  },
  {
    id: 'yt-pending-1',
    title: 'بررسی فریم‌ورک جدید Astro 5 و بهینه‌سازی سرعت بارگذاری صفحات وب',
    description: 'در این ویدیو به بررسی قابلیت‌های معماری جزیره‌ای (Islands Architecture) و رندرینگ هیبریدی در نسخه جدید استرو پرداخته می‌شود.',
    url: 'https://www.youtube.com/watch?v=i7gxLKpn1h0',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/i7gxLKpn1h0',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230334_29545f1c.jpg',
    author: {
      name: 'سارا ناصری (کاربر عضو)',
      avatar: getAuthorAvatar('سارا ناصری'),
      handle: '@sara_ux',
      isVerified: false
    },
    category: 'programming',
    tags: ['Astro', 'فرانت‌اند', 'بهینه‌سازی'],
    publishedAt: '۱۰ دقیقه پیش',
    readingOrWatchTime: '۱۴ دقیقه',
    likesCount: 0,
    dislikesCount: 0,
    commentsCount: 0,
    userReaction: null,
    sourceDomain: 'youtube.com',
    approvalStatus: 'pending',
    authorUid: 'usr-sara',
    isDeleted: true
  },
  {
    id: 'yt-1',
    title: 'معرفی جامع مدل‌های نسل جدید هوش مصنوعی و کاربرد آنها در برنامه‌نویسی',
    description: 'در این ویدیو به بررسی عمیق ابزارهای هوش مصنوعی توسعه‌یافته در سال اخیر و نحوه ادغام آنها در پایپ‌لاین‌های توسعه نرم‌افزار پرداخته شده است.',
    url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/bMknfKXIFA8',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_9b7ad12d.jpg',
    author: {
      name: 'آکادمی کد و فناوری',
      avatar: getAuthorAvatar('آکادمی کد و فناوری'),
      handle: '@codetech_fa',
      isVerified: true
    },
    category: 'ai',
    tags: ['هوش مصنوعی', 'برنامه‌نویسی', 'تکنولوژی', 'LLM'],
    publishedAt: '۲ ساعت پیش',
    readingOrWatchTime: '۱۸ دقیقه',
    likesCount: 142,
    dislikesCount: 6,
    commentsCount: 19,
    userReaction: null,
    sourceDomain: 'youtube.com',
    isDeleted: true
  },
  {
    id: 'art-1',
    title: 'اصول طراحی رابط کاربری مدرن در سال ۲۰۲۶: فراتر از مینیمالیسم',
    description: 'چرا طراحی‌های بیش از حد ساده در حال منسوخ شدن هستند و چگونه ترکیب بافت، تایپوگرافی معنادار و ریزانیمیشن‌ها تجربه کاربری را متحول می‌کند.',
    url: 'https://virgool.io/@ux_design/modern-ui-principles',
    platform: 'article',
    embedUrl: 'https://virgool.io/@ux_design/modern-ui-principles',
    thumbnail: FALLBACK_IMAGES.article,
    author: {
      name: 'نیما ارجمند',
      avatar: getAuthorAvatar('نیما ارجمند'),
      handle: 'طراح ارشد محصول',
      isVerified: true
    },
    category: 'design',
    tags: ['طراحی رابط کاربری', 'UI/UX', 'طراحی محصول', 'ترندهای دیزاین'],
    publishedAt: '۵ ساعت پیش',
    readingOrWatchTime: '۷ دقیقه مطالعه',
    likesCount: 89,
    dislikesCount: 2,
    commentsCount: 12,
    userReaction: 'like',
    sourceDomain: 'virgool.io',
    articleContent: `در چند سال اخیر شاهد دوره‌ای بودیم که همه اپلیکیشن‌ها به سمت خاکستری‌های بی‌روح و دکمه‌های هم‌شکل حرکت کردند. اما اکنون کاربران به دنبال شخصیت و هویت بصری هستند.

اصول کلیدی که امروزه برای هر محصول حیاتی است:
۱. سلسله‌مراتب تایپوگرافی قدرتمند با فونت‌های رسا و خوانا
۲. کنتراست رنگی هدفمند که مسیر چشم مخاطب را هدایت می‌کند
۳. میکروانیمیشن‌هایی که بازخورد فوری از کنش‌های کاربر ارائه می‌دهند
۴. طراحی واکنش‌گرا و دسترس‌پذیری برای تمامی نمایشگرها

توصیه مهم برای طراحان این است که همیشه پیش از شروع ساخت کامپوننت‌ها، سیستم طراحی (Design System) یکپارچه و مقیاس‌پذیر بسازند تا تجربه تعاملی کاربران در تمام مراحل پیوسته باقی بماند.`,
    isDeleted: true
  },
  {
    id: 'ig-new-dzf',
    title: 'بررسی تخصصی و تست گجت‌های هوشمند برنامه‌نویسی و میز کار توسعه‌دهندگان',
    description: 'نگاهی به ابزارهای ارگونومیک، کیبورد مکانیکال سفارشی و نورپردازی استودیویی مناسب گیک‌ها و برنامه‌نویسان حرفه‌ای.',
    url: 'https://www.instagram.com/reel/DZfG1Nui61u/',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/reel/DZfG1Nui61u/embed',
    thumbnail: FALLBACK_IMAGES.instagram,
    author: {
      name: 'گیک استودیو',
      avatar: getAuthorAvatar('گیک استودیو'),
      handle: '@geek_setup',
      isVerified: true
    },
    category: 'tech',
    tags: ['گجت', 'میز کار', 'برنامه‌نویسی', 'اینستاگرام'],
    publishedAt: 'همین الان',
    readingOrWatchTime: 'ریلز اینستاگرام',
    likesCount: 128,
    dislikesCount: 2,
    commentsCount: 19,
    userReaction: 'like',
    sourceDomain: 'instagram.com',
    approvalStatus: 'approved',
    isDeleted: true
  },
  {
    id: 'aparat-1',
    title: 'آموزش جامع هوش مصنوعی و یادگیری ماشین به زبان ساده',
    description: 'در این ویدیو از آپارات، مبانی اساسی شبکه‌های عصبی و یادگیری عمیق همراه با مثال‌های عملی در پایتون توضیح داده شده است.',
    url: 'https://www.aparat.com/v/kulb1i9',
    platform: 'aparat',
    embedUrl: 'https://www.aparat.com/video/video/embed/videohash/kulb1i9/vt/frame',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230336_d9a4e772.jpg',
    author: {
      name: 'کانال هوش مصنوعی ایران',
      avatar: getAuthorAvatar('کانال هوش مصنوعی ایران'),
      handle: '@ai_iran',
      isVerified: true
    },
    category: 'ai',
    tags: ['آپارات', 'هوش مصنوعی', 'پایتون', 'آموزش'],
    publishedAt: '۳ ساعت پیش',
    readingOrWatchTime: '۲۲ دقیقه ویدیو',
    likesCount: 164,
    dislikesCount: 5,
    commentsCount: 23,
    userReaction: 'like',
    sourceDomain: 'aparat.com',
    approvalStatus: 'approved',
    isDeleted: true
  },
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
    sourceDomain: 'instagram.com'
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
    sourceDomain: 'instagram.com'
  },
  {
    id: 'yt-3',
    title: 'آشنایی با مهندسی پرامپت حرفه‌ای و تکنیک‌های پیشرفته ارتباط با مدل‌های زبان بزرگ',
    description: 'چگونه بهترین خروجی را از مدل‌های هوش مصنوعی بگیریم؟ بررسی روش‌های Few-Shot، Chain-of-Thought و قالب‌بندی خروجی JSON.',
    url: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/SqcY0GlETPk',
    thumbnail: 'https://upc.geekclub.ir/s1/contents/2026/10/gc_20261020_230335_da3d8448.jpg',
    author: {
      name: 'دکتر مانی دانشور',
      avatar: getAuthorAvatar('دکتر مانی دانشور'),
      handle: '@mani_ai_lab',
      isVerified: true
    },
    category: 'ai',
    tags: ['مهندسی پرامپت', 'هوش مصنوعی', 'پرامپت نویسی', 'تکنولوژی'],
    publishedAt: '۵ روز پیش',
    readingOrWatchTime: '۲۲ دقیقه',
    likesCount: 380,
    dislikesCount: 7,
    commentsCount: 33,
    userReaction: null,
    sourceDomain: 'youtube.com',
    isDeleted: true
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
