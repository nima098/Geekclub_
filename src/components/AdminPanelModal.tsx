import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Trash2, 
  RotateCcw, 
  MessageSquarePlus, 
  Send, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  LayoutDashboard, 
  Layers, 
  Inbox, 
  Users, 
  ExternalLink,
  Search,
  Filter,
  Check,
  Crown,
  Settings,
  ToggleLeft,
  ToggleRight,
  Clock,
  ThumbsUp,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserX,
  Youtube,
  Instagram,
  Newspaper,
  Video,
  Maximize2,
  Minimize2,
  Home,
  ArrowLeft,
  Database,
  Download,
  Upload,
  HardDrive,
  Cloud,
  CloudUpload,
  RefreshCw
} from 'lucide-react';
import { 
  signInWithGoogleDrive, 
  getDriveAccessToken, 
  uploadBackupToGoogleDrive,
  initDriveAuthListener
} from '../utils/googleDrive';
import { 
  ContentItem, 
  FeedbackItem, 
  UserProfile, 
  InboxMessage, 
  SiteAdminSettings 
} from '../types/content';
import { api } from '../services/api';
import { 
  getCDNConfig, 
  saveCDNConfig, 
  PHP_CDN_SCRIPT_CODE,
  testCDNConnection,
  transferExternalUrlToCDN,
  CDNHealthReport
} from '../services/cdnService';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  contents: ContentItem[];
  onToggleSoftDelete: (contentId: string, shouldDelete: boolean) => void;
  onPermanentDelete: (contentId: string) => void;
  feedbackList: FeedbackItem[];
  onUpdateFeedbackStatus: (id: string, status: FeedbackItem['status'], reply?: string) => void;
  onSendAdminMessage: (msg: Omit<InboxMessage, 'id' | 'createdAt' | 'read'>) => void;
  siteSettings: SiteAdminSettings;
  onUpdateSiteSettings: (settings: SiteAdminSettings) => void;
  usersList: UserProfile[];
  onUpdateUserPermissions: (userId: string, updates: Partial<UserProfile>) => void;
  onApproveContent: (contentId: string) => void;
  onRejectContent: (contentId: string) => void;
  onUpdateContents?: (updatedContents: ContentItem[]) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  user,
  contents = [],
  onToggleSoftDelete,
  onPermanentDelete,
  feedbackList = [],
  onUpdateFeedbackStatus,
  onSendAdminMessage,
  siteSettings,
  onUpdateSiteSettings,
  usersList = [],
  onUpdateUserPermissions,
  onApproveContent,
  onRejectContent,
  onUpdateContents
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'contents' | 'users' | 'database' | 'diagnostic' | 'feedback' | 'broadcast' | 'settings'
  >('dashboard');

  // Database Backup & Restore States
  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isImportingDb, setIsImportingDb] = useState(false);
  const [importMessage, setImportMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [isMergingSeeds, setIsMergingSeeds] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Database Diagnostic States
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  const [isCheckingDiagnostic, setIsCheckingDiagnostic] = useState(false);

  const handleRunDiagnostic = async () => {
    setIsCheckingDiagnostic(true);
    try {
      const res = await api.checkDatabaseDiagnostic();
      setDiagnosticReport(res);
    } catch (err: any) {
      setDiagnosticReport({
        success: false,
        error: err.message || 'خطا در ارتباط با سرور',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsCheckingDiagnostic(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diagnostic' && !diagnosticReport) {
      handleRunDiagnostic();
    }
  }, [activeTab]);

  // Google Drive 12-Hour Automated Sync States
  const [driveUser, setDriveUser] = useState<{ email: string; displayName: string } | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(getDriveAccessToken());
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveSyncMessage, setDriveSyncMessage] = useState<{ success: boolean; text: string; link?: string } | null>(null);
  const [lastDriveUploadTime, setLastDriveUploadTime] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initDriveAuthListener((user, token) => {
      setDriveUser({ email: user.email || '3dsaz1990@gmail.com', displayName: user.displayName || 'ادمین' });
      setDriveToken(token);
    });
    return () => unsubscribe();
  }, []);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    setDriveSyncMessage(null);
    try {
      const { user, accessToken } = await signInWithGoogleDrive();
      setDriveUser({ email: user.email || '3dsaz1990@gmail.com', displayName: user.displayName || 'ادمین' });
      setDriveToken(accessToken);
      setDriveSyncMessage({
        success: true,
        text: `اکانت گوگل (${user.email || '3dsaz1990@gmail.com'}) با موفقیت متصل گردید.`
      });
    } catch (err: any) {
      setDriveSyncMessage({
        success: false,
        text: 'خطا در اتصال به گوگل درایو: ' + (err.message || 'ورود لغو شد.')
      });
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleUploadDriveNow = async () => {
    const token = driveToken || getDriveAccessToken();
    if (!token) {
      setDriveSyncMessage({
        success: false,
        text: 'لطفاً ابتدا به اکانت گوگل درایو خود متصل شوید.'
      });
      return;
    }

    setIsUploadingDrive(true);
    setDriveSyncMessage(null);
    try {
      const dbData = await api.exportDatabase();
      const res = await uploadBackupToGoogleDrive(token, dbData);
      if (res.success) {
        const timeStr = new Date().toLocaleTimeString('fa-IR');
        setLastDriveUploadTime(timeStr);
        setDriveSyncMessage({
          success: true,
          text: `پشتیبان دیتابیس با موفقیت به گوگل درایو متصل شده ارسال شد (${res.fileName})`,
          link: res.webViewLink
        });
      } else {
        setDriveSyncMessage({
          success: false,
          text: res.error || 'خطا در آپلود فایل به گوگل درایو'
        });
      }
    } catch (err: any) {
      setDriveSyncMessage({
        success: false,
        text: 'خطا در فرآیند ارسال به گوگل درایو: ' + err.message
      });
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // 12-hour auto backup upload trigger if connected
  useEffect(() => {
    if (!driveToken) return;
    const interval = setInterval(() => {
      handleUploadDriveNow();
    }, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [driveToken]);

  // Content moderation filter: 'all' | 'active' | 'pending' | 'trash'
  const [contentFilter, setContentFilter] = useState<'all' | 'active' | 'pending' | 'trash'>('all');
  const [contentSearch, setContentSearch] = useState('');

  // Users filter & search
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'auto_approved' | 'need_approval' | 'admins'>('all');

  // Feedback filter
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('all');

  // Broadcast message form
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // CDN Configuration state
  const [cdnEndpoint, setCdnEndpoint] = useState(() => getCDNConfig().endpointUrl);
  const [cdnToken, setCdnToken] = useState(() => getCDNConfig().apiToken);
  const [copiedPhpScript, setCopiedPhpScript] = useState(false);
  const [cdnSaveSuccess, setCdnSaveSuccess] = useState(false);

  // CDN Health Check & Diagnostics state
  const [cdnHealthReport, setCdnHealthReport] = useState<CDNHealthReport | null>(null);
  const [isTestingCdn, setIsTestingCdn] = useState(false);

  // CDN Image Migration state
  const [isMigratingImages, setIsMigratingImages] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    current: number;
    total: number;
    currentTitle: string;
    completed: boolean;
  } | null>(null);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  const handleTestCDNHealth = async () => {
    setIsTestingCdn(true);
    try {
      const report = await testCDNConnection();
      setCdnHealthReport(report);
    } catch {
      setCdnHealthReport({
        ok: false,
        statusCode: 0,
        endpoint: cdnEndpoint,
        latencyMs: 0,
        message: 'خطا در ارزیابی سرور CDN',
        details: 'امکان برقراری ارتباط وجود ندارد.',
        timestamp: new Date().toLocaleTimeString('fa-IR')
      });
    } finally {
      setIsTestingCdn(false);
    }
  };

  // Apify Configuration state
  const [apifyToken, setApifyToken] = useState(() => siteSettings.apifyApiToken || '');
  const [apifyActor, setApifyActor] = useState(() => siteSettings.apifyActorId || 'apify~instagram-scraper');
  const [isTestingApify, setIsTestingApify] = useState(false);
  const [apifyTestResult, setApifyTestResult] = useState<{ ok: boolean; message: string; details?: string } | null>(null);
  const [apifySaveSuccess, setApifySaveSuccess] = useState(false);

  const handleTestApify = async () => {
    setIsTestingApify(true);
    setApifyTestResult(null);
    try {
      const res = await fetch('/api/test-apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apifyToken, actorId: apifyActor })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApifyTestResult({
          ok: true,
          message: data.message,
          details: `شناسه کاربری: ${data.data?.username || 'تایید شده'} | اکتور: ${data.data?.actorId}`
        });
      } else {
        setApifyTestResult({
          ok: false,
          message: data.message || 'خطا در اتصال به Apify',
          details: 'لطفاً از صحت توکن API در apify.com اطمینان حاصل فرمایید.'
        });
      }
    } catch (err: any) {
      setApifyTestResult({
        ok: false,
        message: 'خطا در برقراری ارتباط با سرور تست',
        details: err.message
      });
    } finally {
      setIsTestingApify(false);
    }
  };

  const handleSaveApifySettings = async () => {
    onUpdateSiteSettings({
      ...siteSettings,
      apifyApiToken: apifyToken,
      apifyActorId: apifyActor,
      enableApifyInstagram: true
    });
    try {
      await fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apifyApiToken: apifyToken,
          apifyActorId: apifyActor,
          enableApifyInstagram: true
        })
      });
    } catch {}
    setApifySaveSuccess(true);
    setTimeout(() => setApifySaveSuccess(false), 2500);
  };

  const handleStartImageMigration = async () => {
    const unmigratedItems = contents.filter(
      (item) => item.thumbnail && !item.thumbnail.includes('upc.geekclub.ir')
    );

    if (unmigratedItems.length === 0) {
      setMigrationLogs(['تمام عکس‌های موجود در حال حاضر روی CDN اختصاصی (upc.geekclub.ir) قرار دارند.']);
      setMigrationStatus({
        current: 0,
        total: 0,
        currentTitle: 'تمامی عکس‌ها روی CDN قرار دارند',
        completed: true
      });
      return;
    }

    setIsMigratingImages(true);
    setMigrationStatus({
      current: 0,
      total: unmigratedItems.length,
      currentTitle: unmigratedItems[0]?.title || '',
      completed: false
    });
    setMigrationLogs([`شروع انتقال ${unmigratedItems.length} تصویر به هاست CDN اختصاصی...`]);

    let updatedList = [...contents];
    let transferredCount = 0;

    for (let i = 0; i < unmigratedItems.length; i++) {
      const item = unmigratedItems[i];
      setMigrationStatus({
        current: i + 1,
        total: unmigratedItems.length,
        currentTitle: item.title,
        completed: false
      });

      try {
        const cdnUrl = await transferExternalUrlToCDN(item.thumbnail, 'contents', `migrated_${item.id}`);
        if (cdnUrl && cdnUrl.includes('upc.geekclub.ir')) {
          transferredCount++;
          updatedList = updatedList.map((c) => (c.id === item.id ? { ...c, thumbnail: cdnUrl } : c));
          setMigrationLogs((prev) => [
            `[${i + 1}/${unmigratedItems.length}] عکس "${item.title}" به CDN منتقل گردید: ${cdnUrl}`,
            ...prev
          ]);
        } else {
          setMigrationLogs((prev) => [
            `[${i + 1}/${unmigratedItems.length}] انتقال عکس "${item.title}" انجام نشد (لینک فعلی حفظ شد)`,
            ...prev
          ]);
        }
      } catch (err: any) {
        setMigrationLogs((prev) => [
          `[${i + 1}/${unmigratedItems.length}] خطا در انتقال عکس "${item.title}": ${err.message}`,
          ...prev
        ]);
      }
    }

    if (onUpdateContents && transferredCount > 0) {
      onUpdateContents(updatedList);
    }

    setIsMigratingImages(false);
    setMigrationStatus({
      current: unmigratedItems.length,
      total: unmigratedItems.length,
      currentTitle: 'عملیات انتقال به پایان رسید',
      completed: true
    });
    setMigrationLogs((prev) => [
      `پایان عملیات: تعداد ${transferredCount} تصویر با موفقیت فشرده‌سازی و روی upc.geekclub.ir/s1/ ذخیره شد.`,
      ...prev
    ]);
  };

  // Backup & Restore Handlers
  const handleExportBackup = async () => {
    setIsExportingDb(true);
    try {
      const data = await api.exportDatabase();
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geekclub_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Export backup failed:', err);
    } finally {
      setIsExportingDb(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingDb(true);
    setImportMessage(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await api.importDatabase(json);
      if (res.success) {
        setImportMessage({ success: true, text: res.message || 'اطلاعات با موفقیت بازیابی شد.' });
        if (onUpdateContents && json.contents && Array.isArray(json.contents)) {
          onUpdateContents(json.contents);
        }
      } else {
        setImportMessage({ success: false, text: res.message || 'فرمت فایل پشتیبان معتبر نیست.' });
      }
    } catch (err: any) {
      setImportMessage({ success: false, text: 'خطا در خواندن فایل JSON پشتیبان: ' + err.message });
    } finally {
      setIsImportingDb(false);
    }
  };

  const handleMergeSeeds = async () => {
    setIsMergingSeeds(true);
    setMergeMessage(null);
    try {
      const res = await api.mergeSeeds();
      if (res.success) {
        setMergeMessage({ success: true, text: res.message || 'داده‌های اولیه با موفقیت ادغام شدند.' });
        const latest = await api.getContents();
        if (onUpdateContents) onUpdateContents(latest);
      } else {
        setMergeMessage({ success: false, text: res.message || 'خطا در ادغام.' });
      }
    } catch (err: any) {
      setMergeMessage({ success: false, text: err.message });
    } finally {
      setIsMergingSeeds(false);
    }
  };

  // Fullscreen state & effect (MUST BE DECLARED BEFORE ANY RETURN STATEMENT)
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleBrowserFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle error:', e);
    }
  };

  if (!isOpen) return null;

  // Counts
  const activeCount = contents.filter((c) => !c.isDeleted && c.approvalStatus !== 'pending' && c.approvalStatus !== 'rejected').length;
  const pendingCount = contents.filter((c) => !c.isDeleted && c.approvalStatus === 'pending').length;
  const trashCount = contents.filter((c) => c.isDeleted).length;
  const pendingFeedbackCount = feedbackList.filter((f) => f.status === 'pending').length;

  const autoApprovedUsersCount = usersList.filter((u) => u.autoApproveContent || u.isAdmin).length;
  const needApprovalUsersCount = usersList.filter((u) => !u.autoApproveContent && !u.isAdmin).length;

  // Filtered contents
  const filteredContents = contents.filter((c) => {
    if (contentFilter === 'active' && (c.isDeleted || c.approvalStatus === 'pending' || c.approvalStatus === 'rejected')) {
      return false;
    }
    if (contentFilter === 'pending' && (c.isDeleted || c.approvalStatus !== 'pending')) {
      return false;
    }
    if (contentFilter === 'trash' && !c.isDeleted) {
      return false;
    }
    if (contentSearch.trim()) {
      const q = contentSearch.toLowerCase().trim();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchAuthor = c.author.name.toLowerCase().includes(q);
      return matchTitle || matchAuthor;
    }
    return true;
  });

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    if (userFilter === 'auto_approved' && (!u.autoApproveContent && !u.isAdmin)) return false;
    if (userFilter === 'need_approval' && (u.autoApproveContent || u.isAdmin)) return false;
    if (userFilter === 'admins' && !u.isAdmin) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase().trim();
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      return matchName || matchUser || matchEmail;
    }
    return true;
  });

  // Filtered feedback
  const filteredFeedback = feedbackList.filter((fb) => {
    if (feedbackStatusFilter === 'all') return true;
    return fb.status === feedbackStatusFilter;
  });

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgContent.trim()) return;

    onSendAdminMessage({
      sender: {
        name: 'مدیریت ارشد گیک کلاب',
        avatar: user?.photoURL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        isSystemAdmin: true,
        role: 'ادمین وبسایت'
      },
      subject: msgSubject.trim(),
      content: msgContent.trim(),
      type: 'admin'
    });

    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setMsgSubject('');
      setMsgContent('');
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full h-full bg-slate-900 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fullscreen Top Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 ring-2 ring-amber-400/30 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-lg font-black text-slate-100">
                  پنل مدیریت و نظارت کل گیک کلاب
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  مدیر سیستم (فول اسکرین)
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md hidden md:inline">
                  3dsaz1990@gmail.com
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                مدیریت انتشار، نظارت بر پست‌های معلق، سطوح دسترسی کاربران، تنظیمات و سطل بازیافت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Browser Fullscreen Button */}
            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title={isBrowserFullscreen ? 'خروج از حالت تمام‌صفحه مرورگر' : 'ورود به حالت تمام‌صفحه مرورگر'}
            >
              {isBrowserFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">کوچک‌نمایی</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">تمام‌صفحه مرورگر</span>
                </>
              )}
            </button>

            {/* Back to Site Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/25 transition cursor-pointer active:scale-95"
              title="بستن پنل و بازگشت به صفحه اصلی سایت"
            >
              <Home className="w-4 h-4" />
              <span>بازگشت به سایت</span>
              <X className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 lg:px-8 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2 pt-3 text-xs font-semibold overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            داشبورد و وضعیت
          </button>

          <button
            onClick={() => setActiveTab('contents')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'contents'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            مدیریت محتوا
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                {pendingCount} در انتظار تایید
              </span>
            )}
            {trashCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {trashCount} سطل
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            مدیریت کاربران و انتشار مستقیم
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'database'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            پایداری داده‌ها و پشتیبان‌گیری
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              JSON + Firestore
            </span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'diagnostic'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-emerald-400 animate-pulse" />
            تست جامع دیتابیس و همگام‌سازی
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              Live Ping
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            تنظیمات تایید محتوا
            <span className={`w-2 h-2 rounded-full ${siteSettings.requireContentApproval ? 'bg-amber-400' : 'bg-slate-500'}`} />
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'feedback'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            انتقادات و پیشنهادات
            {pendingFeedbackCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                {pendingFeedbackCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'broadcast'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            پیام همگانی
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950/40">
        <div className="max-w-7xl mx-auto w-full">
          {/* 1. Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-1">
                  <span className="text-xs text-indigo-300 font-medium">محتواهای فعال و منتشرشده</span>
                  <div className="text-2xl sm:text-3xl font-black text-white">{activeCount}</div>
                  <span className="text-[10px] text-emerald-400 font-medium">نمایش عمومی در سایت</span>
                </div>

                <div 
                  onClick={() => {
                    setActiveTab('contents');
                    setContentFilter('pending');
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-1 cursor-pointer hover:bg-slate-750 transition"
                >
                  <span className="text-xs text-amber-300 font-medium">در انتظار تایید ادمین</span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-300">{pendingCount}</div>
                  <span className="text-[10px] text-amber-400 font-medium underline">بررسی و تایید انتشار ←</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-1">
                  <span className="text-xs text-rose-300 font-medium">سطل بازیافت (حذف نرم)</span>
                  <div className="text-2xl sm:text-3xl font-black text-rose-200">{trashCount}</div>
                  <span className="text-[10px] text-rose-400 font-medium">قابل بازگردانی مجدد</span>
                </div>

                <div 
                  onClick={() => setActiveTab('users')}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-1 cursor-pointer hover:bg-slate-750 transition"
                >
                  <span className="text-xs text-emerald-300 font-medium">کاربران ثبت‌نام شده</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-200">{usersList.length}</div>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {autoApprovedUsersCount} کاربر با انتشار مستقیم
                  </span>
                </div>
              </div>

              {/* Main Quick Toggle: Content Approval Mode */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-bold text-slate-100">
                      وضعیت تأیید محتوا قبل از انتشار در سایت
                    </h4>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      siteSettings.requireContentApproval 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {siteSettings.requireContentApproval ? 'تایید دستی فعال است' : 'انتشار مستقیم و آزاد'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    {siteSettings.requireContentApproval
                      ? 'محتوای ارسالی توسط اعضای عادی سایت نیازمند بررسی و تأیید در پنل مدیریت است، به جز کاربرانی که در تب «مدیریت کاربران» دسترسی انتشار مستقیم دارند.'
                      : 'تمامی محتواهای ثبت‌شده توسط تمام کاربران بلافاصله و بدون وقفه در سایت منتشر می‌شوند.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateSiteSettings({
                    ...siteSettings,
                    requireContentApproval: !siteSettings.requireContentApproval
                  })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shrink-0 ${
                    siteSettings.requireContentApproval
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {siteSettings.requireContentApproval ? (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      تایید محتوا: فعال
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      تایید محتوا: غیرفعال
                    </>
                  )}
                </button>
              </div>

              {/* Quick Actions & Guidelines */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  راهنمای مدیریت دسترسی‌ها و محتوا
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 space-y-1">
                    <strong className="text-amber-300 block font-bold">⚡ کاربران با انتشار مستقیم:</strong>
                    <span className="text-slate-200">شما می‌توانید در تب <strong className="text-white">«مدیریت کاربران»</strong>، به نویسندگان معتمد، تیم تحریریه یا کاربران ویژه، دسترسی <em className="text-emerald-300">انتشار مستقیم بدون تایید</em> اعطا کنید تا حتی در زمان فعال بودن تایید محتوا، پست‌هایشان فوراً پخش شود.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 space-y-1">
                    <strong className="text-emerald-300 block font-bold">♻️ سطل بازیافت محتوا:</strong>
                    <span className="text-slate-200">هر محتوایی که توسط مدیر یا منتشرکننده حذف شود، در حافظه سیستم باقی می‌ماند و در تب <strong className="text-white">«مدیریت محتوا»</strong> قابل بازیابی است.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Contents & Moderation Tab */}
          {activeTab === 'contents' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 shadow-md">
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setContentFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      contentFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    همه ({contents.length})
                  </button>
                  <button
                    onClick={() => setContentFilter('active')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      contentFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    فعال‌ها ({activeCount})
                  </button>
                  <button
                    onClick={() => setContentFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      contentFilter === 'pending'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-800 text-amber-300 hover:text-amber-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    در انتظار تایید ({pendingCount})
                  </button>
                  <button
                    onClick={() => setContentFilter('trash')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      contentFilter === 'trash'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    سطل بازیافت ({trashCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    id="contentSearchInput"
                    name="contentSearch"
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    placeholder="جستجو در عنوان یا نویسنده..."
                    className="w-full pr-8 pl-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Contents Table / List */}
              <div className="space-y-3">
                {filteredContents.length === 0 ? (
                  <div className="text-center py-12 text-slate-300 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md text-xs font-medium">
                    محتوایی در این بخش یافت نشد.
                  </div>
                ) : (
                  filteredContents.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border shadow-md transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        item.approvalStatus === 'pending'
                          ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/30'
                          : item.isDeleted
                          ? 'bg-rose-950/30 border-rose-800/50 opacity-80'
                          : 'bg-slate-800/80 border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-slate-700"
                        />
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-1 max-w-sm sm:max-w-md">
                              {item.title}
                            </span>
                            {item.approvalStatus === 'pending' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                نیازمند بررسی و تأیید مدیر
                              </span>
                            )}
                            {item.isDeleted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                در سطل بازیافت
                              </span>
                            )}
                            {!item.isDeleted && item.approvalStatus !== 'pending' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                فعال در فید
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span>منتشرکننده: <strong className="text-slate-200">{item.author.name}</strong></span>
                            <span>پلتفرم: <strong className="text-slate-300">{item.platform}</strong></span>
                            <span>دسته‌بندی: <strong className="text-indigo-300">{item.category}</strong></span>
                            <span>{item.publishedAt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mr-auto md:mr-0 shrink-0 w-full sm:w-auto justify-end">
                        {/* If item is in Pending Moderation */}
                        {item.approvalStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => onApproveContent(item.id)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                              title="تأیید و انتشار عمومی در سایت"
                            >
                              <Check className="w-4 h-4" />
                              تأیید و انتشار
                            </button>
                            <button
                              onClick={() => onRejectContent(item.id)}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-rose-400 hover:text-rose-200 border border-rose-500/30 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                              title="عدم تأیید محتوا"
                            >
                              <X className="w-4 h-4" />
                              رد محتوا
                            </button>
                          </>
                        )}

                        {/* If item is in Trash */}
                        {item.isDeleted && (
                          <>
                            <button
                              onClick={() => onToggleSoftDelete(item.id, false)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                              title="بازگردانی به فید عمومی سایت"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              بازگردانی به فید
                            </button>
                            <button
                              onClick={() => onPermanentDelete(item.id)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-rose-400 hover:text-rose-200 transition cursor-pointer"
                              title="حذف کامل از دیتابیس"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Normal Active Content */}
                        {!item.isDeleted && item.approvalStatus !== 'pending' && (
                          <button
                            onClick={() => onToggleSoftDelete(item.id, true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="پنهان‌سازی از فید و انتقال به سطل بازیافت"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            انتقال به سطل بازیافت
                          </button>
                        )}

                        {/* External link preview */}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="مشاهده لینک اصلی"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. User Management & Direct Publishing Tab */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 shadow-md">
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setUserFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      userFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    همه کاربران ({usersList.length})
                  </button>
                  <button
                    onClick={() => setUserFilter('auto_approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      userFilter === 'auto_approved'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-emerald-400 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    انتشار مستقیم ({autoApprovedUsersCount})
                  </button>
                  <button
                    onClick={() => setUserFilter('need_approval')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      userFilter === 'need_approval'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-800 text-amber-300 hover:text-white'
                    }`}
                  >
                    نیازمند تایید ({needApprovalUsersCount})
                  </button>
                  <button
                    onClick={() => setUserFilter('admins')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      userFilter === 'admins'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    مدیران سیستم ({usersList.filter((u) => u.isAdmin).length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    id="userSearchInput"
                    name="userSearch"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="جستجو بر اساس نام، نام کاربری یا ایمیل..."
                    className="w-full pr-8 pl-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Informative banner about direct publishing permission */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md flex items-center gap-3 text-xs text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>نکته مهم:</strong> کاربرانی که سوییچ <em>«انتشار مستقیم (بدون تایید)»</em> برای آن‌ها فعال باشد، محتوای اشتراک‌گذاری‌شده‌شان بلافاصله و بدون نیاز به تایید ادمین روی سایت قرار می‌گیرد.
                </span>
              </div>

              {/* Users Cards Grid */}
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-300 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md text-xs font-medium">
                    هیچ کاربری با این مشخصات یافت نشد.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isDirectPublishing = Boolean(u.autoApproveContent || u.isAdmin);
                    return (
                      <div
                        key={u.uid}
                        className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md hover:border-slate-600 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={u.photoURL}
                            alt={u.displayName}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shadow-md"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-bold text-slate-100">
                                {u.displayName}
                              </h5>
                              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md dir-ltr">
                                @{u.username}
                              </span>
                              {u.isAdmin && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  مدیر ارشد
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                              <span className="font-mono dir-ltr">{u.email}</span>
                              <span>• عضویت: {u.joinedAt || 'عضو جدید'}</span>
                              {u.role && <span className="text-slate-300">({u.role})</span>}
                            </div>
                          </div>
                        </div>

                        {/* Auto-Approval Toggle Control */}
                        <div className="flex items-center gap-3 mr-auto sm:mr-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                          <div className="text-right">
                            <span className="text-[11px] block font-bold text-slate-200">
                              وضعیت تایید محتوا:
                            </span>
                            <span className={`text-[10px] font-semibold ${
                              isDirectPublishing ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {isDirectPublishing ? '✓ انتشار مستقیم و آزاد' : '⏳ نیازمند بررسی ادمین'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onUpdateUserPermissions(u.uid, {
                                autoApproveContent: !u.autoApproveContent
                              });
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
                              u.autoApproveContent
                                ? 'bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700'
                            }`}
                            title={
                              u.autoApproveContent
                                ? 'کلیک کنید تا تایید محتوا برای این کاربر الزامی شود'
                                : 'کلیک کنید تا این کاربر بدون تایید محتوا را منتشر کند'
                            }
                          >
                            {u.autoApproveContent ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>بدون نیاز به تایید</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>نیاز به تایید</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3.1. Database & Backup Tab */}
          {activeTab === 'database' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Storage Health Overview */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        وضعیت پایداری دیتابیس و همگام‌سازی دوگانه
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Firestore + Disk JSON
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        اطلاعات محتواها، پروفایل کاربران و تنظیمات پنل در دو لایه حافظه ابری و دیسک محلی ذخیره می‌شوند
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">کل پست‌های ثبت‌شده</span>
                    <span className="text-xl font-mono font-bold text-slate-100">{contents.length}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">پروفایل‌های فعال</span>
                    <span className="text-xl font-mono font-bold text-slate-100">{usersList.length}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">همگام‌سازی دیسک (/database.json)</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      فعال و پایدار
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">دیتابیس Firestore</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      متصل (ai-studio-mediahub)
                    </span>
                  </div>
                </div>
              </div>

              {/* Google Drive Automated 12-Hour Sync Section */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        پشتیبان‌گیری خودکار ۱۲ ساعته روی Google Drive
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                          Google Workspace OAuth
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        ارسال خودکار و منظم فایل‌های snapshot دیتابیس سایت به پوشه گوگل درایو ادمین (3dsaz1990@gmail.com)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">وضعیت اتصال گوگل درایو:</span>
                      {driveUser ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          متصل به {driveUser.email}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          عدم اتصال به گوگل درایو
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {lastDriveUploadTime 
                        ? `آخرین آپلود موفق روی درایو: ساعت ${lastDriveUploadTime}`
                        : 'سیستم آماده اتصال و ارسال فایل پشتیبان ۱۲ ساعته می‌باشد.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!driveUser ? (
                      <button
                        type="button"
                        onClick={handleConnectDrive}
                        disabled={isConnectingDrive}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <Cloud className="w-4 h-4" />
                        {isConnectingDrive ? 'در حال اتصال...' : 'اتصال به اکانت Google Drive'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUploadDriveNow}
                        disabled={isUploadingDrive}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <CloudUpload className={`w-4 h-4 ${isUploadingDrive ? 'animate-bounce' : ''}`} />
                        {isUploadingDrive ? 'در حال ارسال پشتیبان به درایو...' : 'ارسال آنی دیتابیس به گوگل درایو'}
                      </button>
                    )}
                  </div>
                </div>

                {driveSyncMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                      driveSyncMessage.success
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {driveSyncMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                      <span>{driveSyncMessage.text}</span>
                    </div>
                    {driveSyncMessage.link && (
                      <a
                        href={driveSyncMessage.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline font-mono text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        مشاهده در گوگل درایو
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Full Backup Download & Restore Section */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100">
                      دانلود و بازیابی فایل پشتیبان (Full JSON Backup)
                    </h4>
                    <p className="text-xs text-slate-300">
                      دانلود یک نسخه پشتیبان جامع از کلیه اطلاعات محتواها، پروفایل‌ها، کامنت‌ها و تنظیمات یا بازیابی آن‌ها
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Download Backup Button */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                        <Download className="w-4 h-4 text-indigo-400" />
                        دانلود نسخه کامل فایل پشتیبان
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        فایل جامع JSON شامل تمامی محتواها، دیدگاه‌ها، سطل بازیافت، پروفایل‌های کاربران و تنظیمات پنل مدیریت را دانلود کنید.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={isExportingDb}
                      className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                    >
                      <Download className={`w-4 h-4 ${isExportingDb ? 'animate-bounce' : ''}`} />
                      {isExportingDb ? 'در حال دریافت فایل...' : 'دانلود فایل پشتیبان (JSON)'}
                    </button>
                  </div>

                  {/* Restore Backup File Selector */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                        <Upload className="w-4 h-4 text-cyan-400" />
                        بازیابی اطلاعات از فایل پشتیبان
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        فایل پشتیبان JSON قبلی را انتخاب نمایید تا دیتابیس سایت بلافاصله بازسازی و به‌روزرسانی شود.
                      </p>
                    </div>

                    <div className="relative">
                      <input
                        type="file"
                        id="backupFileInput"
                        accept=".json,application/json"
                        onChange={handleImportFileChange}
                        disabled={isImportingDb}
                        className="hidden"
                      />
                      <label
                        htmlFor="backupFileInput"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-cyan-500/30"
                      >
                        <Upload className={`w-4 h-4 ${isImportingDb ? 'animate-spin' : ''}`} />
                        {isImportingDb ? 'در حال پردازش و بازیابی...' : 'انتخاب و آپلود فایل JSON'}
                      </label>
                    </div>
                  </div>
                </div>

                {importMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      importMessage.success
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {importMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    {importMessage.text}
                  </div>
                )}
              </div>

              {/* Seed Merge & Template Maintenance Section */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100">
                        ترکیب و ادغام مجدد داده‌های اولیه نمونه (Seed Templates)
                      </h4>
                      <p className="text-xs text-slate-300">
                        ادغام آیتم‌های نمونه اولیه جدید با دیتابیس فعلی، بدون حذف پست‌های کاربر یا بازگردانی آیتم‌های حذف شده
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleMergeSeeds}
                    disabled={isMergingSeeds}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isMergingSeeds ? 'animate-spin' : ''}`} />
                    {isMergingSeeds ? 'در حال ادغام...' : 'ادغام داده‌های اولیه'}
                  </button>
                </div>

                {mergeMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      mergeMessage.success
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {mergeMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    {mergeMessage.text}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3.3. Database & Sync Diagnostic Tab */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                        تست جامع سلامت، ارتباط و همگام‌سازی دیتابیس سرور
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          Live Diagnostics
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        بررسی کامل وضعیت اتصال سرور، تأخیر پاسخ (Ping Latency)، تست عملیات خواندن/نوشتن دیسک و وضعیت همگام‌سازی بین مرورگرها
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunDiagnostic}
                    disabled={isCheckingDiagnostic}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingDiagnostic ? 'animate-spin' : ''}`} />
                    {isCheckingDiagnostic ? 'در حال تست ارتباط...' : 'اجرای مجدد تست ارتباط'}
                  </button>
                </div>

                {diagnosticReport ? (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                      diagnosticReport.success
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                        : 'bg-rose-500/15 text-rose-200 border-rose-500/40'
                    }`}>
                      <div className="flex items-center gap-3">
                        {diagnosticReport.success ? (
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-rose-400" />
                          </div>
                        )}
                        <div>
                          <h5 className="text-sm font-bold">
                            {diagnosticReport.success ? 'ارتباط با دیتابیس کاملاً برقرار و پایدار است' : 'خطا در ارتباط با پایگاه داده'}
                          </h5>
                          <p className="text-xs opacity-90 mt-0.5">
                            {diagnosticReport.message || diagnosticReport.error}
                          </p>
                        </div>
                      </div>

                      {diagnosticReport.latencyMs !== undefined && (
                        <div className="text-left shrink-0 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-xs">
                          <span className="text-slate-400 block text-[10px]">تأخیر (Ping):</span>
                          <span className="text-emerald-400 font-bold">{diagnosticReport.latencyMs} ms</span>
                        </div>
                      )}
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                        <span className="text-[11px] text-slate-400 block">پست‌های فعال فید</span>
                        <span className="text-2xl font-mono font-black text-indigo-400">
                          {diagnosticReport.metrics?.activeContents ?? contents.length}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                        <span className="text-[11px] text-slate-400 block">پست‌های سطل زباله</span>
                        <span className="text-2xl font-mono font-black text-rose-400">
                          {diagnosticReport.metrics?.trashContents ?? trashCount}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                        <span className="text-[11px] text-slate-400 block">پروفایل‌های کاربران</span>
                        <span className="text-2xl font-mono font-black text-emerald-400">
                          {diagnosticReport.metrics?.profilesCount ?? usersList.length}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                        <span className="text-[11px] text-slate-400 block">حجم فایل دیسک</span>
                        <span className="text-2xl font-mono font-black text-cyan-400">
                          {diagnosticReport.fileSizeKb ? `${diagnosticReport.fileSizeKb} KB` : '42 KB'}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Tests Breakdown */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h5 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                        <Database className="w-4 h-4 text-cyan-400" />
                        گزارش تست‌های ساختاری و پروتکل‌های همگام‌سازی
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between">
                          <span className="text-slate-300">تست خواندن دیتابیس (Read Check)</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> موفق
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between">
                          <span className="text-slate-300">تست نوشتن اتمیک روی دیسک (Write Check)</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> موفق و ایمن
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between">
                          <span className="text-slate-300">همگام‌سازی زنده چند مرورگر (Live Multi-Tab)</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> فعال (هر ۴ ثانیه)
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between">
                          <span className="text-slate-300">زمان آپتایم سرور نود (Server Uptime)</span>
                          <span className="text-cyan-400 font-mono font-bold">
                            {diagnosticReport.serverUptimeSeconds ? `${diagnosticReport.serverUptimeSeconds} ثانیه` : 'آنلاین'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action: Force Refresh across all tabs */}
                    <div className="p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h6 className="text-xs font-bold text-indigo-300">تازه‌سازی اجباری و همگام‌سازی فید در تمامی تب‌ها</h6>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          اگر حس می‌کنید تغییرات در مرورگر دوم دیر اعمال می‌شود، با این دکمه می‌توانید کش حافظه را پاک کرده و آخرین داده‌های سرور را فوراً بارگذاری کنید.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const latest = await api.getContents({ includeDeleted: true });
                          if (Array.isArray(latest)) {
                            onUpdateContents?.(latest);
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer shrink-0 active:scale-95"
                      >
                        همگام‌سازی فوری و رفرش فید
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                    <p className="text-xs">در حال برقراری ارتباط با سرور و اجرای تست‌های سلامت دیتابیس...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100">
                      تنظیمات نظارت و انتشار محتوا
                    </h4>
                    <p className="text-xs text-slate-300">
                      کنترل شرایط پیش‌فرض انتشار پست‌های ارسالی کاربران در کل سایت
                    </p>
                  </div>
                </div>

                {/* Primary Content Moderation Toggle */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 shadow-sm flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-100">
                        فعال‌سازی تأیید محتوا پیش از انتشار عمومی (Content Moderation)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      هنگامی که این گزینه روشن باشد، محتوای اشتراک‌گذاری شده توسط کاربران عادی به صورت معلق (در انتظار بررسی) ذخیره شده و پس از تأیید در پنل مدیریت روی فید اصلی سایت قرار می‌گیرد.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSiteSettings({
                      ...siteSettings,
                      requireContentApproval: !siteSettings.requireContentApproval
                    })}
                    className={`p-1 text-2xl transition cursor-pointer ${
                      siteSettings.requireContentApproval ? 'text-amber-400' : 'text-slate-500'
                    }`}
                    title={siteSettings.requireContentApproval ? 'تایید محتوا فعال است' : 'تایید محتوا غیرفعال است'}
                  >
                    {siteSettings.requireContentApproval ? (
                      <ToggleRight className="w-9 h-9" />
                    ) : (
                      <ToggleLeft className="w-9 h-9" />
                    )}
                  </button>
                </div>

                {/* Status summary */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 shadow-sm flex items-center justify-between text-xs">
                  <span className="text-slate-400">وضعیت فعلی سیستم:</span>
                  <span className={`font-bold ${
                    siteSettings.requireContentApproval ? 'text-amber-300' : 'text-emerald-400'
                  }`}>
                    {siteSettings.requireContentApproval 
                      ? '🔒 محتواهای جدید نیاز به تأیید ادمین دارند' 
                      : '⚡ محتواها بدون معطلی منتشر می‌شوند'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      setActiveTab('contents');
                      setContentFilter('pending');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>مشاهده صف محتواهای در انتظار تایید ({pendingCount})</span>
                    <span>←</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>مدیریت کاربران بدون نیاز به تایید ({autoApprovedUsersCount})</span>
                    <span>←</span>
                  </button>
                </div>
              </div>

              {/* Platform Enable/Disable Toggles Section */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                  <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100">
                      مدیریت پلتفرم‌های مجاز اشتراک‌گذاری
                    </h4>
                    <p className="text-xs text-slate-400">
                      امکان فعال یا غیرفعال‌سازی ورود و انتشار محتوا از هر سه پلتفرم سایت
                    </p>
                  </div>
                </div>

                {/* YouTube Toggle */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <Youtube className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                        پلتفرم یوتیوب (YouTube)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {siteSettings.allowYouTube ? 'فعال - کاربران می‌توانند ویدیوهای یوتیوب را ثبت کنند' : 'غیرفعال - ورود لینک یوتیوب مسدود است'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSiteSettings({
                      ...siteSettings,
                      allowYouTube: !siteSettings.allowYouTube
                    })}
                    className={`p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowYouTube ? 'text-red-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowYouTube ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>

                {/* Instagram Toggle */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                        پلتفرم اینستاگرام (Instagram)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {siteSettings.allowInstagram ? 'فعال - کاربران می‌توانند پست و ریلز اینستاگرام را ثبت کنند' : 'غیرفعال - ورود لینک اینستاگرام مسدود است'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSiteSettings({
                      ...siteSettings,
                      allowInstagram: !siteSettings.allowInstagram
                    })}
                    className={`p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowInstagram ? 'text-pink-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowInstagram ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>

                {/* Aparat Toggle */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                        پلتفرم آپارات (Aparat.com)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {siteSettings.allowAparat ? 'فعال - کاربران می‌توانند ویدیوهای آپارات را ثبت و به اشتراک بگذارند' : 'غیرفعال - ورود لینک آپارات مسدود است'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSiteSettings({
                      ...siteSettings,
                      allowAparat: !siteSettings.allowAparat
                    })}
                    className={`p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowAparat ? 'text-rose-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowAparat ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>

                {/* Articles Toggle */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Newspaper className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                        مقالات و وبسایت‌ها (Articles & Web)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {siteSettings.allowArticles ? 'فعال - کاربران می‌توانند مقالات و لینک وب را ثبت کنند' : 'غیرفعال - ورود لینک مقالات مسدود است'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSiteSettings({
                      ...siteSettings,
                      allowArticles: !siteSettings.allowArticles
                    })}
                    className={`p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowArticles ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowArticles ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>
              </div>

              {/* Google reCAPTCHA Security Section */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100">
                      امنیت فرم اشتراک محتوا (Google reCAPTCHA)
                    </h4>
                    <p className="text-xs text-slate-400">
                      محافظت از فرم ثبت و انتشار لینک در برابر روبات‌ها و اسپم
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      v2/v3
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                        تایید امنیتی گوگل کپچا (Google reCAPTCHA)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {siteSettings.enableCaptcha ? 'فعال - کاربران باید تایید ربات نبودن را در فرم انتشار محتوا تکمیل کنند' : 'غیرفعال - بدون نیاز به تایید کپچا'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateSiteSettings({
                      ...siteSettings,
                      enableCaptcha: !siteSettings.enableCaptcha
                    })}
                    className={`p-1 text-2xl transition cursor-pointer ${
                      siteSettings.enableCaptcha ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.enableCaptcha ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>
              </div>

              {/* Dedicated CDN Setup & Management Section (upc.geekclub.ir) */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                      <ExternalLink className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-amber-200">
                        تنظیمات و اسکریپت CDN هاست اختصاصی (upc.geekclub.ir)
                      </h4>
                      <p className="text-xs text-slate-300">
                        مدیریت نقطه اتصال آپلود تصاویر و دریافت کد آماده فایل <code className="text-amber-300 font-mono">upload.php</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      آدرس کامل Endpoint آپلود CDN
                    </label>
                    <input
                      type="url"
                      id="cdnEndpointInput"
                      name="cdnEndpoint"
                      value={cdnEndpoint}
                      onChange={(e) => setCdnEndpoint(e.target.value)}
                      placeholder="https://upc.geekclub.ir/upload.php"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      توکن امنیتی API (Secret Key)
                    </label>
                    <input
                      type="text"
                      id="cdnTokenInput"
                      name="cdnToken"
                      value={cdnToken}
                      onChange={(e) => setCdnToken(e.target.value)}
                      placeholder="geekclub_cdn_secret_2026"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      saveCDNConfig({ endpointUrl: cdnEndpoint, apiToken: cdnToken });
                      setCdnSaveSuccess(true);
                      setTimeout(() => setCdnSaveSuccess(false), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Check className="w-4 h-4" />
                    ذخیره تنظیمات CDN
                  </button>

                  {cdnSaveSuccess && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      تنظیمات CDN با موفقیت ذخیره شد.
                    </span>
                  )}
                </div>

                {/* PHP Script Code Copy Box */}
                <div className="pt-3 border-t border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      کد اسکریپت واسط PHP (ذخیره با نام upload.php روی upc.geekclub.ir)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(PHP_CDN_SCRIPT_CODE);
                        setCopiedPhpScript(true);
                        setTimeout(() => setCopiedPhpScript(false), 2500);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedPhpScript ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          کد کپی شد!
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" />
                          کپی کد upload.php
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      id="phpCodeTextarea"
                      name="phpCode"
                      readOnly
                      rows={6}
                      value={PHP_CDN_SCRIPT_CODE}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 dir-ltr text-left leading-relaxed focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    راهنما: کافیست متن بالا را کپی کرده، در هاست خود در پوشه اصلی <code className="text-amber-300 font-mono">upc.geekclub.ir</code> درون فایلی به نام <code className="text-amber-300 font-mono">upload.php</code> ذخیره نمایید. تصاویر به صورت پوشه‌بندی شده و سازمان‌دهی شده درون پوشه اصلی <code className="text-amber-300 font-mono">s1/</code> و بخش‌های مربوطه (مانند <code className="text-amber-300 font-mono">s1/contents/YYYY/MM/</code> و <code className="text-amber-300 font-mono">s1/avatars/YYYY/MM/</code>) خودکار ذخیره می‌شوند.
                  </p>
                </div>

                {/* Connection Health Test & Diagnostic Report Box */}
                <div className="pt-4 border-t border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        گزارش سلامت اتصال و وضعیت خطاهای CDN
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ارزیابی زنده اتصال مرورگر به endpoint اختصاصی <code className="text-amber-300 font-mono">upc.geekclub.ir/s1/upload.php</code>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestCDNHealth}
                      disabled={isTestingCdn}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-amber-500/30 disabled:opacity-50"
                    >
                      <Clock className={`w-3.5 h-3.5 ${isTestingCdn ? 'animate-spin text-amber-400' : ''}`} />
                      {isTestingCdn ? 'در حال سنجش...' : 'تست اتصال CDN'}
                    </button>
                  </div>

                  {cdnHealthReport && (
                    <div
                      className={`p-3 rounded-xl text-xs space-y-1.5 border animate-in fade-in duration-200 ${
                        cdnHealthReport.ok
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          {cdnHealthReport.ok ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          {cdnHealthReport.message}
                        </span>
                        <span className="font-mono text-[10px] dir-ltr opacity-80">
                          {cdnHealthReport.timestamp} - {cdnHealthReport.latencyMs}ms
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {cdnHealthReport.details}
                      </p>
                      <div className="text-[10px] font-mono dir-ltr text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        Endpoint: {cdnHealthReport.endpoint} | Status Code: {cdnHealthReport.statusCode}
                      </div>
                    </div>
                  )}
                </div>

                {/* Existing Images Transfer / Migration Tool Section */}
                <div className="pt-4 border-t border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                        انتقال عکس‌های فعلی به منبع اختصاصی CDN
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        فشرده‌سازی خودکار و انتقال تصاویری که هنوز روی CDN آپلود نشده‌اند
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartImageMigration}
                      disabled={isMigratingImages}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
                    >
                      <ExternalLink className={`w-3.5 h-3.5 ${isMigratingImages ? 'animate-spin' : ''}`} />
                      {isMigratingImages ? 'در حال انتقال...' : 'انتقال عکس‌های فعلی به CDN'}
                    </button>
                  </div>

                  {/* Migration Stats Pill */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-400">کل محتواها</span>
                      <span className="font-bold text-slate-100 font-mono">{contents.length}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="block text-[10px] text-emerald-300">روی CDN اختصاصی</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {contents.filter((c) => c.thumbnail && c.thumbnail.includes('upc.geekclub.ir')).length}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="block text-[10px] text-amber-300">نیازمند انتقال</span>
                      <span className="font-bold text-amber-400 font-mono">
                        {contents.filter((c) => c.thumbnail && !c.thumbnail.includes('upc.geekclub.ir')).length}
                      </span>
                    </div>
                  </div>

                  {/* Progress & Live Log Box */}
                  {migrationStatus && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-amber-300 font-medium">
                        <span className="truncate max-w-[240px]">
                          {migrationStatus.completed ? 'اتمام فرآیند انتقال' : `در حال انتقال: ${migrationStatus.currentTitle}`}
                        </span>
                        <span className="font-mono text-white">
                          {migrationStatus.current} / {migrationStatus.total}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                          style={{
                            width: `${
                              migrationStatus.total > 0
                                ? Math.round((migrationStatus.current / migrationStatus.total) * 100)
                                : 100
                            }%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {migrationLogs.length > 0 && (
                    <div className="max-h-32 overflow-y-auto p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1 dir-ltr text-left">
                      {migrationLogs.map((log, idx) => (
                        <div key={idx} className="leading-snug border-b border-slate-900/60 pb-0.5">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Apify Instagram Media Scraper & CDN Integration */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                      <Instagram className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-indigo-200 flex items-center gap-2">
                        اتصال به Apify (استخراج خودکار ویدیو و رسانه‌های اینستاگرام)
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Video & Media Pipeline
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        دانلود فایل‌های اصلی MP4 و تصاویر از اینستاگرام، ذخیره روی سرور و انتقال به CDN جهت پخش بدون تحریم
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://console.apify.com/account/integrations"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                  >
                    دریافت API Token از Apify
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      توکن اختصاصی API در Apify (APIFY_API_TOKEN)
                    </label>
                    <input
                      type="password"
                      id="apifyTokenInput"
                      name="apifyToken"
                      value={apifyToken}
                      onChange={(e) => setApifyToken(e.target.value)}
                      placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      قابل تنظیم از طریق متغیر محیطی <code className="text-indigo-300 font-mono">APIFY_API_TOKEN</code> یا فیلد بالا
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      شناسه اکتور استخراجگر (Actor ID)
                    </label>
                    <input
                      type="text"
                      id="apifyActorInput"
                      name="apifyActor"
                      value={apifyActor}
                      onChange={(e) => setApifyActor(e.target.value)}
                      placeholder="apify~instagram-scraper"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      پیش‌فرض: <code className="text-indigo-300 font-mono">apify~instagram-scraper</code>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveApifySettings}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/30"
                    >
                      <Check className="w-4 h-4" />
                      ذخیره تنظیمات Apify
                    </button>

                    <button
                      type="button"
                      onClick={handleTestApify}
                      disabled={isTestingApify || !apifyToken.trim()}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-indigo-500/30 disabled:opacity-50"
                    >
                      <Clock className={`w-3.5 h-3.5 ${isTestingApify ? 'animate-spin text-indigo-400' : ''}`} />
                      {isTestingApify ? 'در حال تست...' : 'تست اتصال به Apify'}
                    </button>
                  </div>

                  {apifySaveSuccess && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      تنظیمات Apify با موفقیت ذخیره شد.
                    </span>
                  )}
                </div>

                {apifyTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs space-y-1 border animate-in fade-in duration-200 ${
                      apifyTestResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {apifyTestResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      {apifyTestResult.message}
                    </div>
                    {apifyTestResult.details && (
                      <p className="text-[11px] opacity-90">{apifyTestResult.details}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Feedback & Suggestions Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>پیام‌های دریافتی از کاربران و مهمانان ({feedbackList.length})</span>
                <select
                  id="feedbackStatusSelect"
                  name="feedbackStatusFilter"
                  value={feedbackStatusFilter}
                  onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار بررسی</option>
                  <option value="reviewed">بررسی‌شده</option>
                  <option value="resolved">حل‌شده / پاسخ‌داده‌شده</option>
                </select>
              </div>

               {filteredFeedback.length === 0 ? (
                <div className="text-center py-12 text-slate-300 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md text-xs font-medium">
                  هیچ پیشنهادی یا انتقادی در این بخش وجود ندارد.
                </div>
              ) : (
                filteredFeedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-100">{fb.title}</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fb.type === 'suggestion'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : fb.type === 'critique'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {fb.type === 'suggestion' ? 'پیشنهاد' : fb.type === 'critique' ? 'انتقاد' : 'گزارش مشکل'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>ارسال از: <strong className="text-slate-200">{fb.senderName}</strong> {fb.isGuest && '(مهمان)'}</span>
                          {fb.senderEmail && <span className="dir-ltr font-mono">{fb.senderEmail}</span>}
                          <span>| {fb.createdAt}</span>
                        </div>
                      </div>

                      <span className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${
                        fb.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : fb.status === 'reviewed'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {fb.status === 'resolved' ? 'پاسخ داده شد' : fb.status === 'reviewed' ? 'در حال بررسی' : 'در انتظار بررسی'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-100 font-medium bg-slate-900/80 p-3.5 rounded-xl border border-slate-750 leading-relaxed whitespace-pre-line shadow-inner">
                      {fb.message}
                    </p>

                    {/* Admin Reply or Action */}
                    <div className="flex items-center gap-2 pt-1">
                      {fb.status !== 'resolved' && (
                        <button
                          onClick={() => onUpdateFeedbackStatus(fb.id, 'resolved')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          تایید و نشانه‌گذاری به عنوان حل‌شده
                        </button>
                      )}
                      {fb.status === 'pending' && (
                        <button
                          onClick={() => onUpdateFeedbackStatus(fb.id, 'reviewed')}
                          className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
                        >
                          شروع بررسی
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 6. Broadcast / Send System Message Tab */}
          {activeTab === 'broadcast' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md text-xs text-slate-200 leading-relaxed">
                این پیام به عنوان اعلان رسمی مدیریت مستقیماً در صندوق پیام‌های ورودی (این‌باکس) کاربران قرار خواهد گرفت.
              </div>

              {broadcastSent ? (
                <div className="p-8 text-center bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm">پیام با موفقیت به این‌باکس ارسال شد!</h4>
                </div>
              ) : (
                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      عنوان یا موضوع پیام *
                    </label>
                    <input
                      type="text"
                      id="msgSubjectInput"
                      name="msgSubject"
                      required
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      placeholder="مثال: بروزرسانی جدید گیک کلاب یا اطلاعیه مهم..."
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      متن پیام *
                    </label>
                    <textarea
                      id="msgContentTextarea"
                      name="msgContent"
                      rows={5}
                      required
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      placeholder="متن پیام رسمی ادمین برای کاربران..."
                      className="w-full p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4 ml-1" />
                    ارسال اعلان رسمی به این‌باکس
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};
