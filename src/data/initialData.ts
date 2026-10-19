import { ContentItem, CommentItem, UserProfile, SiteAdminSettings } from '../types/content';

export const INITIAL_CONTENT: ContentItem[] = [
  {
    id: 'yt-pending-1',
    title: 'بررسی فریم‌ورک جدید Astro 5 و بهینه‌سازی سرعت بارگذاری صفحات وب',
    description: 'در این ویدیو به بررسی قابلیت‌های معماری جزیره‌ای (Islands Architecture) و رندرینگ هیبریدی در نسخه جدید استرو پرداخته می‌شود.',
    url: 'https://www.youtube.com/watch?v=5kFfqpQ3_iI',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/5kFfqpQ3_iI',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'سارا ناصری (کاربر عضو)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
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
    authorUid: 'usr-sara'
  },
  {
    id: 'yt-1',
    title: 'معرفی جامع مدل‌های نسل جدید هوش مصنوعی و کاربرد آنها در برنامه‌نویسی',
    description: 'در این ویدیو به بررسی عمیق ابزارهای هوش مصنوعی توسعه‌یافته در سال اخیر و نحوه ادغام آنها در پایپ‌لاین‌های توسعه نرم‌افزار پرداخته شده است.',
    url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/bMknfKXIFA8',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'آکادمی کد و فناوری',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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
    sourceDomain: 'youtube.com'
  },
  {
    id: 'art-1',
    title: 'اصول طراحی رابط کاربری مدرن در سال ۲۰۲۶: فراتر از مینیمالیسم',
    description: 'چرا طراحی‌های بیش از حد ساده در حال منسوخ شدن هستند و چگونه ترکیب بافت، تایپوگرافی معنادار و ریزانیمیشن‌ها تجربه کاربری را متحول می‌کند.',
    url: 'https://virgool.io/@ux_design/modern-ui-principles',
    platform: 'article',
    embedUrl: 'https://virgool.io/@ux_design/modern-ui-principles',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'نیما ارجمند',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
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

توصیه مهم برای طراحان این است که همیشه پیش از شروع ساخت کامپوننت‌ها، سیستم طراحی (Design System) یکپارچه و مقیاس‌پذیر بسازند تا تجربه تعاملی کاربران در تمام مراحل پیوسته باقی بماند.`
  },
  {
    id: 'ig-new-dzf',
    title: 'بررسی تخصصی و تست گجت‌های هوشمند برنامه‌نویسی و میز کار توسعه‌دهندگان',
    description: 'نگاهی به ابزارهای ارگونومیک، کیبورد مکانیکال سفارشی و نورپردازی استودیویی مناسب گیک‌ها و برنامه‌نویسان حرفه‌ای.',
    url: 'https://www.instagram.com/reel/DZfG1Nui61u/',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/reel/DZfG1Nui61u/embed',
    thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'گیک استودیو',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
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
    approvalStatus: 'approved'
  },
  {
    id: 'aparat-1',
    title: 'آموزش جامع هوش مصنوعی و یادگیری ماشین به زبان ساده',
    description: 'در این ویدیو از آپارات، مبانی اساسی شبکه‌های عصبی و یادگیری عمیق همراه با مثال‌های عملی در پایتون توضیح داده شده است.',
    url: 'https://www.aparat.com/v/m435165',
    platform: 'aparat',
    embedUrl: 'https://www.aparat.com/video/video/embed/videohash/m435165/vt/frame',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'کانال هوش مصنوعی ایران',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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
    approvalStatus: 'approved'
  },
  {
    id: 'ig-1',
    title: '۵ ترفند فوق‌العاده در جاوااسکریپت که کدنویسی را ۳ برابر سریع‌تر می‌کند',
    description: 'ترفندهای کاربردی ES2024 و میانبرهای آرایه‌ها و آبجکت‌ها که خوانایی و عملکرد کدهای جاوااسکریپت و تایپ‌اسکریپت شما را بالا می‌برد.',
    url: 'https://www.instagram.com/reel/C8kP2qXyZa1/',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/reel/C8kP2qXyZa1/embed',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'کد با سارا',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'فرهاد نصیری',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'مهندس آرش شریفی',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'استودیو پادکس',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'دکتر مانی دانشور',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
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
    sourceDomain: 'youtube.com'
  },
  {
    id: 'art-3',
    title: 'اصول راه‌اندازی استارتاپ تکنولوژی با رویکرد چابک (Lean Startup)',
    description: 'چگونه ایده اولیه خود را با حداقل هزینه و ساخت MVP اعتبارسنجی کنید و از صرف ماه‌ها زمان روی محصولی که مشتری ندارد جلوگیری نمایید.',
    url: 'https://techcrunch.ir/startup-lean-validation-guide',
    platform: 'article',
    embedUrl: 'https://techcrunch.ir/startup-lean-validation-guide',
    thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'الهام سعیدی',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
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
      id: 'c-101',
      contentId: 'yt-1',
      author: {
        name: 'رضا کمالی',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        email: 'reza@example.com'
      },
      text: 'خیلی ویدیوی مفیدی بود! به خصوص بخش مربوط به ادغام ابزارهای هوش مصنوعی در محیط توسعه عالی توضیح داده شد. ممنون از سازنده محتوا.',
      createdAt: '۱ ساعت پیش',
      likes: 12,
      userLiked: false
    },
    {
      id: 'c-102',
      contentId: 'yt-1',
      author: {
        name: 'مریم حسینی',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        email: 'maryam@example.com'
      },
      text: 'آیا برای مدل‌های لوکال هم پارت دوم ضبط می‌کنید؟ خیلی مشتاقم بررسی کنید.',
      createdAt: '۳۰ دقیقه پیش',
      likes: 5,
      userLiked: true
    }
  ],
  'art-1': [
    {
      id: 'c-201',
      contentId: 'art-1',
      author: {
        name: 'پویا سلیمی',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
        email: 'pouya@example.com'
      },
      text: 'کاملاً موافقم. دوران وب‌سایت‌های تخت و کپی‌پیستی به سر آمده و جزئیات ریز است که تفاوت ایجاد می‌کند.',
      createdAt: '۲ ساعت پیش',
      likes: 8,
      userLiked: false
    }
  ],
  'ig-1': [
    {
      id: 'c-301',
      contentId: 'ig-1',
      author: {
        name: 'علیرضا داوودی',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        email: 'alireza@example.com'
      },
      text: 'ترفند سوم واقعاً زمان زیادی رو در پروژه‌های روزمره صرفه‌جویی می‌کنه. دمت گرم!',
      createdAt: '۴ ساعت پیش',
      likes: 19,
      userLiked: true
    }
  ]
};

export const DEFAULT_SITE_SETTINGS: SiteAdminSettings = {
  requireContentApproval: false, // Direct publishing enabled for all users
  notifyOnPending: true,
  allowYouTube: true,
  allowInstagram: true,
  allowArticles: true,
  allowAparat: true,
  enableCaptcha: false
};

export const SUPER_ADMIN_EMAIL = '3dsaz1990@gmail.com';

export const SUPER_ADMIN_USER: UserProfile = {
  uid: 'admin-super-3dsaz',
  displayName: 'مدیریت ارشد (3dsaz)',
  username: 'admin_3dsaz',
  email: '3dsaz1990@gmail.com',
  hideEmail: false,
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  bio: 'مدیر کل و صاحب امتیاز سامانه 👑',
  allowProfileComments: true,
  joinedAt: 'مهر ۱۴۰۵',
  isAdmin: true,
  autoApproveContent: true,
  role: 'مدیر کل سایت (Super Admin)'
};

export const DEFAULT_USER: UserProfile = {
  uid: 'user-google-101',
  displayName: 'کاربر گیک (مهمان)',
  username: 'geek_guest',
  email: 'user.creative@gmail.com',
  hideEmail: false,
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  bio: 'علاقه‌مند به تکنولوژی، هوش مصنوعی و جامعه برنامه‌نویسان 🚀',
  allowProfileComments: true,
  joinedAt: 'مهر ۱۴۰۵',
  isAdmin: false,
  autoApproveContent: false,
  role: 'کاربر عضو'
};

export const INITIAL_REGISTERED_USERS: UserProfile[] = [
  SUPER_ADMIN_USER,
  DEFAULT_USER,
  {
    uid: 'usr-farhad',
    displayName: 'فرهاد نصیری',
    username: 'farhad_dev',
    email: 'farhad.dev@gmail.com',
    hideEmail: false,
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    bio: 'توسعه‌دهنده فول‌استک و محتوانویس تکنولوژی',
    allowProfileComments: true,
    joinedAt: 'شهریور ۱۴۰۵',
    isAdmin: false,
    autoApproveContent: true, // Trusted user with direct publishing rights!
    role: 'کاربر معتمد (انتشار مستقیم)'
  },
  {
    uid: 'usr-sara',
    displayName: 'سارا ناصری',
    username: 'sara_ux',
    email: 'sara.ux@gmail.com',
    hideEmail: true,
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    bio: 'طراح رابط کاربری و تجربه کاربری (UI/UX)',
    allowProfileComments: true,
    joinedAt: 'مرداد ۱۴۰۵',
    isAdmin: false,
    autoApproveContent: false, // Normal user: content requires approval
    role: 'کاربر عضو'
  },
  {
    uid: 'usr-arash',
    displayName: 'آرش شریفی',
    username: 'arash_db',
    email: 'arash.sh@yahoo.com',
    hideEmail: false,
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    bio: 'مهندس سیستم و دیتابیس',
    allowProfileComments: true,
    joinedAt: 'تیر ۱۴۰۵',
    isAdmin: false,
    autoApproveContent: true, // Trusted user with direct publishing rights!
    role: 'نویسنده تخصصی'
  },
  {
    uid: 'usr-kamran',
    displayName: 'کامران بهرامی',
    username: 'kamran_ai',
    email: 'kamran.ai@gmail.com',
    hideEmail: false,
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    bio: 'علاقه‌مند به یادگیری ماشین و پردازش تصویر',
    allowProfileComments: false,
    joinedAt: 'مهر ۱۴۰۵',
    isAdmin: false,
    autoApproveContent: false, // Normal user: content requires approval
    role: 'کاربر عضو'
  }
];

export const INITIAL_INBOX = [
  {
    id: 'msg-1',
    sender: {
      name: 'تیم مدیریت گیک کلاب',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
      isSystemAdmin: true,
      role: 'ادمین ارشد وبسایت'
    },
    subject: 'خوش‌آمدگویی به جامعه گیک کلاب 🎉',
    content: 'سلام و درود!\nبه جمع گیک‌های خلاق خوش آمدید. شما می‌توانید بهترین ویدیوها، ریلزها و مقالات تخصصی خود را به اشتراک بگذارید، در گفت‌وگوها شرکت کنید و نمایه کاربری خود را سفارشی‌سازی فرمایید.\nاگر سوال یا پیشنهادی داشتید با ما در ارتباط باشید.',
    createdAt: 'دیروز',
    read: false,
    type: 'admin' as const
  },
  {
    id: 'msg-2',
    sender: {
      name: 'آرش شریفی',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      isSystemAdmin: false,
      role: 'کاربر ویژه'
    },
    subject: 'همکاری در پروژه مشترک هوش مصنوعی',
    content: 'سلام دوست عزیز، محتوایی که درباره مدل‌های زبانی به اشتراک گذاشته بودید عالی بود. مشتاقم در صورت تمایل با هم روی یک پروژه تست همکاری داشته باشیم.',
    createdAt: '۳ ساعت پیش',
    read: false,
    type: 'user' as const
  },
  {
    id: 'msg-3',
    sender: {
      name: 'ربات سیستمی گیک کلاب',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      isSystemAdmin: true,
      role: 'اعلان سیستم'
    },
    subject: 'پست شما به بخش برگزیده‌ها اضافه شد 🌟',
    content: 'تبریک می‌گوییم! محتوای اشتراک‌گذاری شده شما توانست بیش از ۱۰۰ واکنش مثبت از اعضای جامعه دریافت کند و در صفحه اصلی به عنوان محتوای برتر نمایش داده شود.',
    createdAt: '۵ ساعت پیش',
    read: true,
    type: 'system' as const
  }
];

export const INITIAL_PROFILE_COMMENTS = [
  {
    id: 'pc-1',
    profileUserId: 'user-google-101',
    author: {
      name: 'نیما ارجمند',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      username: 'nima_ux'
    },
    text: 'درود! سلیقه خیلی خوبی در انتخاب محتواها دارید. خوشحالم که در این جامعه همراه هستیم.',
    createdAt: '۲ ساعت پیش'
  },
  {
    id: 'pc-2',
    profileUserId: 'user-google-101',
    author: {
      name: 'سارا ناصری',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      username: 'sara_dev'
    },
    text: 'پروفایل فوق‌العاده‌ای چیدی! به امید محتواهای خفن بیشتر ✨',
    createdAt: 'دیروز'
  }
];

export const INITIAL_FEEDBACK = [
  {
    id: 'fb-1',
    senderName: 'محمد رادمنش',
    senderEmail: 'm.radmanesh@gmail.com',
    isGuest: false,
    type: 'suggestion' as const,
    title: 'اضافه کردن قابلیت پلی‌لیست برای ویدیوهای یوتیوب',
    message: 'سلام به تیم خفن گیک کلاب، اگر امکان ساخت پلی‌لیست شخصی از ویدیوهای یوتیوب وجود داشته باشه فوق‌العاده میشه تا بتونیم آموزش‌ها رو دسته‌بندی کنیم.',
    createdAt: '۳ ساعت پیش',
    status: 'pending' as const
  },
  {
    id: 'fb-2',
    senderName: 'کاربر مهمان',
    senderEmail: 'guest_reader@yahoo.com',
    isGuest: true,
    type: 'critique' as const,
    title: 'بهبود فونت در حالت مطالعه مقاله',
    message: 'فونت در حالت مطالعه عالیه اما اندازه سرتیترها اگر کمی بزرگ‌تر باشه خوانایی مقاله روی تبلت بهتر میشه.',
    createdAt: 'دیروز',
    status: 'reviewed' as const
  },
  {
    id: 'fb-3',
    senderName: 'سینا خلیلی',
    senderEmail: 'sina.khalili@outlook.com',
    isGuest: false,
    type: 'bug' as const,
    title: 'عدم بارگذاری کاور در برخی لینک‌های خاص اینستاگرام',
    message: 'در برخی ریلزهای پرایوت اینستاگرام کاور به درستی لود نمیشه که البته میدونم محدودیت متا هست، اما اگر بشه کاور سفارشی آپلود کرد عالیه.',
    createdAt: '۲ روز پیش',
    status: 'resolved' as const,
    adminReply: 'با تشکر از گزارش شما، امکان آپلود کاور سفارشی به فرم اشتراک محتوا اضافه شد.'
  }
];
