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
  RefreshCw,
  Sun,
  Moon
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
import { 
  resolveCoverImageUrl, 
  handleImageError, 
  getPlatformFallbackImage 
} from '../utils/imageHelper';
import { api, getAdminHeaders } from '../services/api';
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
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
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
  onUpdateContents,
  theme: propTheme,
  onToggleTheme: propOnToggleTheme
}) => {
  const [internalTheme, setInternalTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
    return 'dark';
  });

  const activeTheme = propTheme || internalTheme;

  const handleToggleTheme = () => {
    if (propOnToggleTheme) {
      propOnToggleTheme();
    } else {
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      setInternalTheme(nextTheme);
      try {
        localStorage.setItem('geekclub_theme_v1', nextTheme);
        if (nextTheme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      } catch {}
    }
  };

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'contents' | 'users' | 'database' | 'diagnostic' | 'apify' | 'feedback' | 'broadcast' | 'settings'
  >('dashboard');

  // Database Backup & Restore States
  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isImportingDb, setIsImportingDb] = useState(false);
  const [importMessage, setImportMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [isMergingSeeds, setIsMergingSeeds] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [dbStats, setDbStats] = useState<any>(null);

  const fetchDbStats = async () => {
    try {
      const stats = await api.getDatabaseStats();
      if (stats && stats.data) {
        setDbStats(stats.data);
      }
    } catch {}
  };

  // Database Diagnostic States
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  const [isCheckingDiagnostic, setIsCheckingDiagnostic] = useState(false);

  const handleRunDiagnostic = async () => {
    setIsCheckingDiagnostic(true);
    try {
      const res = await api.checkDatabaseDiagnostic();
      setDiagnosticReport(res);
      fetchDbStats();
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

  // Apify Diagnostic States
  const [apifyDiagnosticReport, setApifyDiagnosticReport] = useState<any>(null);
  const [isCheckingApifyDiag, setIsCheckingApifyDiag] = useState(false);
  const [testInstagramUrl, setTestInstagramUrl] = useState('https://www.instagram.com/reel/C8_sample/');
  const [apifyTestRunResult, setApifyTestRunResult] = useState<any>(null);
  const [isRunningApifyTest, setIsRunningApifyTest] = useState(false);

  const handleRunApifyDiagnostic = async () => {
    setIsCheckingApifyDiag(true);
    try {
      const res = await api.checkApifyDiagnostic();
      setApifyDiagnosticReport(res);
    } catch (err: any) {
      setApifyDiagnosticReport({ success: false, message: err.message });
    } finally {
      setIsCheckingApifyDiag(false);
    }
  };

  const [isAbortingRuns, setIsAbortingRuns] = useState(false);
  const [abortResultMsg, setAbortResultMsg] = useState<string | null>(null);

  const handleAbortAllApifyRuns = async () => {
    setIsAbortingRuns(true);
    setAbortResultMsg(null);
    try {
      const res = await api.abortAllApifyRuns();
      setAbortResultMsg(res.message || 'عملیات آزادسازی صف پردازش‌ها با موفقیت انجام شد.');
      handleRunApifyDiagnostic();
    } catch (err: any) {
      setAbortResultMsg('خطا: ' + err.message);
    } finally {
      setIsAbortingRuns(false);
    }
  };

  const handleRunApifyLiveTest = async () => {
    setIsRunningApifyTest(true);
    setApifyTestRunResult(null);
    try {
      const res = await api.testApifyExtraction(testInstagramUrl);
      setApifyTestRunResult(res);
      handleRunApifyDiagnostic();
    } catch (err: any) {
      setApifyTestRunResult({ success: false, error: err.message, message: 'خطا در ارتباط با سرور تست' });
    } finally {
      setIsRunningApifyTest(false);
    }
  };

  // Automated System Diagnostics & Error Logs State
  const [fullDiagReport, setFullDiagReport] = useState<any>(null);
  const [systemLogsList, setSystemLogsList] = useState<any[]>([]);
  const [logFilterLevel, setLogFilterLevel] = useState<string>('all');
  const [logSearchTerm, setLogSearchTerm] = useState<string>('');
  const [isFixingTrash, setIsFixingTrash] = useState(false);
  const [fixTrashMsg, setFixTrashMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const logs = await api.getSystemDiagnosticLogs({ level: logFilterLevel });
      setSystemLogsList(logs);
    } catch {}
  };

  const handleRunFullSystemCheck = async () => {
    setIsCheckingDiagnostic(true);
    try {
      const res = await api.runFullSystemCheck();
      setFullDiagReport(res.data || res);
      const dbRes = await api.checkDatabaseDiagnostic();
      setDiagnosticReport(dbRes);
      fetchDbStats();
      fetchLogs();
    } catch (err: any) {
      setFullDiagReport({
        status: 'error',
        healthScore: 0,
        errors: [err.message || 'خطا در برقراری ارتباط با سرور']
      });
    } finally {
      setIsCheckingDiagnostic(false);
    }
  };

  const handleFixTrashTombstones = async () => {
    setIsFixingTrash(true);
    setFixTrashMsg(null);
    try {
      const res = await api.fixTrashTombstones();
      setFixTrashMsg(res.message || 'اصلاح با موفقیت انجام شد.');
      handleRunFullSystemCheck();
    } catch (err: any) {
      setFixTrashMsg('خطا: ' + err.message);
    } finally {
      setIsFixingTrash(false);
    }
  };

  const handleClearLogs = async () => {
    await api.clearSystemDiagnosticLogs();
    setSystemLogsList([]);
  };

  const [panelContents, setPanelContents] = useState<ContentItem[]>(() => contents || []);
  const [isRefreshingContents, setIsRefreshingContents] = useState(false);

  useEffect(() => {
    if (Array.isArray(contents) && contents.length > 0) {
      setPanelContents(contents);
    }
  }, [contents]);

  const fetchPanelContents = async () => {
    setIsRefreshingContents(true);
    try {
      const res = await fetch(`/api/contents?includeDeleted=true&includeArchived=true&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setPanelContents(json.data);
          onUpdateContents?.(json.data);
        }
      }
    } catch {} finally {
      setIsRefreshingContents(false);
    }
  };

  const handleRestoreItem = (id: string) => {
    onToggleSoftDelete(id, false);
    setPanelContents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isDeleted: false, isArchived: false, deletedAt: undefined } : c))
    );
  };

  const handlePermDeleteItem = (id: string) => {
    onPermanentDelete(id);
    setPanelContents((prev) => prev.filter((c) => c.id !== id));
  };

  useEffect(() => {
    if (isOpen) {
      fetchPanelContents();
    }

    if (activeTab === 'contents') {
      fetchPanelContents();
    } else if (activeTab === 'apify') {
      if (!apifyDiagnosticReport) handleRunApifyDiagnostic();
    } else if (activeTab === 'diagnostic') {
      if (!diagnosticReport) handleRunDiagnostic();
      if (!apifyDiagnosticReport) handleRunApifyDiagnostic();
      if (!fullDiagReport) handleRunFullSystemCheck();
      fetchLogs();
    } else if (activeTab === 'database') {
      if (!diagnosticReport) handleRunDiagnostic();
      fetchDbStats();
    }
  }, [isOpen, activeTab, logFilterLevel]);



  // PostgreSQL Migration State
  const [isMigratingPostgres, setIsMigratingPostgres] = useState(false);
  const [postgresMigrationMessage, setPostgresMigrationMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleMigrateToPostgres = async () => {
    setIsMigratingPostgres(true);
    setPostgresMigrationMessage(null);
    try {
      const res = await api.migrateToPostgres();
      setPostgresMigrationMessage({
        success: res.success,
        text: res.message || (res.success ? 'اطلاعات با موفقیت به پایگاه داده PostgreSQL منتقل گردید.' : 'خطا در مهاجرت به PostgreSQL')
      });
      handleRunDiagnostic();
    } catch (err: any) {
      setPostgresMigrationMessage({
        success: false,
        text: err.message || 'خطا در برقراری ارتباط با سرور'
      });
    } finally {
      setIsMigratingPostgres(false);
    }
  };

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
        // Record backup in server and postgres backup history
        try {
          const adminHeaders = await getAdminHeaders();
          await fetch('/api/database/backup-drive', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ fileId: res.fileId, fileName: res.fileName })
          });
        } catch {}
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
        headers: await getAdminHeaders(),
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
        headers: await getAdminHeaders(),
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

  // Current authoritative contents for the admin panel (panelContents prioritized)
  const currentContents = panelContents.length > 0 ? panelContents : contents;

  // Counts
  const activeCount = currentContents.filter((c) => !c.isDeleted && !c.isArchived && c.approvalStatus !== 'pending' && c.approvalStatus !== 'rejected').length;
  const pendingCount = currentContents.filter((c) => !c.isDeleted && !c.isArchived && c.approvalStatus === 'pending').length;
  const trashCount = currentContents.filter((c) => c.isDeleted || c.isArchived).length;
  const pendingFeedbackCount = feedbackList.filter((f) => f.status === 'pending').length;

  const autoApprovedUsersCount = usersList.filter((u) => u.autoApproveContent || u.isAdmin).length;
  const needApprovalUsersCount = usersList.filter((u) => !u.autoApproveContent && !u.isAdmin).length;

  // Filtered contents
  const filteredContents = currentContents.filter((c) => {
    if (contentFilter === 'active' && ((c.isDeleted || c.isArchived) || c.approvalStatus === 'pending' || c.approvalStatus === 'rejected')) {
      return false;
    }
    if (contentFilter === 'pending' && ((c.isDeleted || c.isArchived) || c.approvalStatus !== 'pending')) {
      return false;
    }
    if (contentFilter === 'trash' && !c.isDeleted && !c.isArchived) {
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
      className="admin-panel-daily admin-panel-tabler fixed inset-0 z-50 w-screen h-screen bg-[#0e1217] flex flex-col overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full h-full bg-[#0e1217] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fullscreen Top Header */}
        <div className="gc-admin-header px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 border-b border-[#282d35] flex items-center justify-between bg-[#13171f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#ce3df3]/10 text-[#ce3df3] border border-[#ce3df3]/30 flex items-center justify-center shadow-md shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-lg font-black text-slate-100">
                  پنل مدیریت و نظارت کل گیک کلاب
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ce3df3]/15 text-[#ce3df3] border border-[#ce3df3]/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-[#ce3df3]" />
                  مدیر سیستم (فول اسکرین)
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-[#161b22] border border-[#282d35] px-2 py-0.5 rounded-md hidden md:inline">
                  3dsaz1990@gmail.com
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                مدیریت انتشار، نظارت بر پست‌های معلق، سطوح دسترسی کاربران، تنظیمات و سطل بازیافت
              </p>
            </div>
          </div>

          <div className="gc-admin-header-actions flex items-center gap-2">
            {/* Theme Mode Toggle Button (Synchronized with Home Page) */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="btn-theme-toggle btn-admin-theme-toggle px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title={activeTheme === 'dark' ? 'تغییر به حالت روشن (Light Mode)' : 'تغییر به حالت تاریک (Dark Mode)'}
              aria-label="تغییر پوسته داشبورد"
            >
              {activeTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
                  <span className="hidden sm:inline">حالت روشن</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#206bc4] transition-transform duration-300 hover:-rotate-12" />
                  <span className="hidden sm:inline">حالت تاریک</span>
                </>
              )}
            </button>

            {/* Toggle Browser Fullscreen Button */}
            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="btn-daily-secondary btn-admin-fullscreen px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title={isBrowserFullscreen ? 'خروج از حالت تمام‌صفحه مرورگر' : 'ورود به حالت تمام‌صفحه مرورگر'}
            >
              {isBrowserFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-[#ce3df3]" />
                  <span className="hidden md:inline">کوچک‌نمایی</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-[#ce3df3]" />
                  <span className="hidden md:inline">تمام‌صفحه مرورگر</span>
                </>
              )}
            </button>

            {/* Back to Site Button */}
            <button
              type="button"
              onClick={onClose}
              className="btn-daily-primary btn-admin-close-to-home px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95"
              title="بستن پنل و بازگشت به صفحه اصلی سایت"
            >
              <Home className="w-4 h-4" />
              <span>بازگشت به سایت</span>
              <X className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="gc-admin-tabs-bar px-4 sm:px-6 lg:px-8 border-b border-[#282d35] bg-[#13171f] shrink-0">
          <div className="flex items-center gap-2 pt-3 text-xs font-semibold overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`btn-admin-tab btn-admin-tab-dashboard pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              داشبورد و وضعیت
            </button>

            <button
              onClick={() => setActiveTab('contents')}
              className={`btn-admin-tab btn-admin-tab-contents pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'contents'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              مدیریت محتوا
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] animate-pulse">
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
              className={`btn-admin-tab btn-admin-tab-users pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'users'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
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
              className={`btn-admin-tab btn-admin-tab-database pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'database'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
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
              className={`btn-admin-tab btn-admin-tab-diagnostic pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'diagnostic'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
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
              onClick={() => setActiveTab('apify')}
              className={`btn-admin-tab btn-admin-tab-apify pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'apify'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Instagram className="w-4 h-4 text-pink-400" />
              تعریف API و کلید Apify
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                apifyToken || siteSettings.apifyApiToken
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
              }`}>
                {apifyToken || siteSettings.apifyApiToken ? 'توکن ثبت شده' : 'نیازمند تنظیم'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`btn-admin-tab btn-admin-tab-settings pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              تنظیمات عمومی و پلتفرم‌ها
              <span className={`w-2 h-2 rounded-full ${siteSettings.requireContentApproval ? 'bg-amber-400' : 'bg-slate-500'}`} />
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className={`btn-admin-tab btn-admin-tab-feedback pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'feedback'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
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
              className={`btn-admin-tab btn-admin-tab-broadcast pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'broadcast'
                  ? 'border-[#ce3df3] text-[#ce3df3] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-4 h-4" />
              پیام همگانی
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0e1217]">
          <div className="max-w-7xl mx-auto w-full">
            {/* 1. Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {/* Card 1: Published Contents */}
                  <div className="p-4.5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">محتواهای فعال و منتشرشده</span>
                      <div className="p-2 rounded-xl bg-[#ce3df3]/10 text-[#ce3df3] border border-[#ce3df3]/20">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-100">{activeCount}</div>
                    <span className="inline-flex items-center text-[10px] text-[#ce3df3] bg-[#ce3df3]/10 px-2.5 py-0.5 rounded-md border border-[#ce3df3]/20 font-medium">
                      ✓ نمایش عمومی در سایت
                    </span>
                  </div>

                  {/* Card 2: Pending Moderation */}
                  <div 
                    onClick={() => {
                      setActiveTab('contents');
                      setContentFilter('pending');
                    }}
                    className="p-4.5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-sm space-y-2 cursor-pointer hover:border-amber-500/40 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">در انتظار تایید ادمین</span>
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-100">{pendingCount}</div>
                    <span className="inline-flex items-center text-[10px] text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 font-medium group-hover:underline">
                      بررسی و تایید انتشار ←
                    </span>
                  </div>

                  {/* Card 3: Trash */}
                  <div className="p-4.5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">سطل بازیافت (حذف نرم)</span>
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Trash2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-100">{trashCount}</div>
                    <span className="inline-flex items-center text-[10px] text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/20 font-medium">
                      قابل بازگردانی مجدد
                    </span>
                  </div>

                  {/* Card 4: Users */}
                  <div 
                    onClick={() => setActiveTab('users')}
                    className="p-4.5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-sm space-y-2 cursor-pointer hover:border-emerald-500/40 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">کاربران ثبت‌نام شده</span>
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-100">{usersList.length}</div>
                    <span className="inline-flex items-center text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20 font-medium group-hover:underline">
                      {autoApprovedUsersCount} کاربر با انتشار مستقیم
                    </span>
                  </div>
                </div>

                {/* Main Quick Toggle: Content Approval Mode */}
                <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <h4 className="text-sm font-bold text-slate-100">
                        وضعیت تأیید محتوا قبل از انتشار در سایت
                      </h4>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        siteSettings.requireContentApproval 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {siteSettings.requireContentApproval ? 'تایید دستی فعال است' : 'انتشار مستقیم و آزاد'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
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
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shrink-0 ${
                      siteSettings.requireContentApproval
                        ? 'btn-daily-primary text-white shadow-md'
                        : 'btn-daily-secondary text-slate-200'
                    }`}
                  >
                    {siteSettings.requireContentApproval ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-300" />
                        تایید محتوا: فعال
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        تایید محتوا: غیرفعال
                      </>
                    )}
                  </button>
                </div>

                {/* Apify API Quick Access Card on Dashboard */}
                <div 
                  onClick={() => setActiveTab('apify')}
                  className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-pink-500/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 group-hover:scale-105 transition shrink-0">
                      <Instagram className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        تعریف API و کلید اختصاصی Apify (استخراج اینستاگرام)
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono dir-ltr ${
                          apifyToken || siteSettings.apifyApiToken
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                        }`}>
                          {apifyToken || siteSettings.apifyApiToken ? 'توکن ثبت شده' : 'نیازمند تنظیم'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        تنظیم کلید اختصاصی API، تست اتصال به سرور Apify، آزادسازی کانتینرها و عیب‌یابی استخراج ویدیوها
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-pink-400 font-bold group-hover:translate-x-1 transition shrink-0 hidden sm:inline">
                    ورود به بخش Apify ←
                  </span>
                </div>

                {/* Quick Actions & Guidelines */}
                <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#ce3df3]" />
                    راهنمای مدیریت دسترسی‌ها و محتوا
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
                    <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35] space-y-1">
                      <strong className="text-amber-400 block font-bold">⚡ کاربران با انتشار مستقیم:</strong>
                      <span className="text-slate-300">شما می‌توانید در تب <strong className="text-slate-100">«مدیریت کاربران»</strong>، به نویسندگان معتمد، تیم تحریریه یا کاربران ویژه، دسترسی <em className="text-emerald-400">انتشار مستقیم بدون تایید</em> اعطا کنید تا حتی در زمان فعال بودن تایید محتوا، پست‌هایشان فوراً پخش شود.</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35] space-y-1">
                      <strong className="text-emerald-400 block font-bold">♻️ سطل بازیافت محتوا:</strong>
                      <span className="text-slate-300">هر محتوایی که توسط مدیر یا منتشرکننده حذف شود، در حافظه سیستم باقی می‌ماند و در تب <strong className="text-slate-100">«مدیریت محتوا»</strong> قابل بازیابی است.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* 2. Contents & Moderation Tab */}
          {activeTab === 'contents' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#13171f] p-3.5 rounded-2xl border border-[#282d35] shadow-md">
                <div className="gc-admin-content-filters flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setContentFilter('all')}
                    className={`btn-admin-filter-content-all px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      contentFilter === 'all'
                        ? 'bg-[#ce3df3] text-white shadow-sm font-bold'
                        : 'bg-[#161b22] text-slate-300 hover:text-white border border-[#282d35]'
                    }`}
                  >
                    همه ({currentContents.length})
                  </button>
                  <button
                    onClick={() => setContentFilter('active')}
                    className={`btn-admin-filter-content-active px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      contentFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'bg-[#161b22] text-slate-300 hover:text-white border border-[#282d35]'
                    }`}
                  >
                    فعال‌ها ({activeCount})
                  </button>
                  <button
                    onClick={() => setContentFilter('pending')}
                    className={`btn-admin-filter-content-pending px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      contentFilter === 'pending'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-[#161b22] text-amber-300 hover:text-amber-200 border border-[#282d35]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    در انتظار تایید ({pendingCount})
                  </button>
                  <button
                    onClick={() => setContentFilter('trash')}
                    className={`btn-admin-filter-content-trash px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      contentFilter === 'trash'
                        ? 'bg-rose-600 text-white shadow-sm font-bold'
                        : 'bg-[#161b22] text-slate-300 hover:text-white border border-[#282d35]'
                    }`}
                  >
                    سطل بازیافت ({trashCount})
                  </button>

                  <button
                    type="button"
                    onClick={fetchPanelContents}
                    disabled={isRefreshingContents}
                    className="btn-daily-secondary btn-admin-refresh-contents p-1.5 rounded-xl text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                    title="تازه‌سازی فوری لیست محتواها و سطل زباله از سرور"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingContents ? 'animate-spin text-[#ce3df3]' : ''}`} />
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
                    className="input-daily input-admin-content-search w-full pr-8 pl-3 py-2 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#ce3df3]/25 focus:border-[#ce3df3] transition"
                  />
                </div>
              </div>

              {/* Trash Quick Restore Banner */}
              {contentFilter === 'trash' && trashCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
                  <div className="flex items-center gap-2.5 text-rose-200">
                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>تعداد <strong className="text-white font-mono">{trashCount}</strong> محتوا در سطل بازیافت قرار دارد.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      panelContents.forEach((c) => {
                        if (c.isDeleted || c.isArchived) {
                          onToggleSoftDelete(c.id, false);
                        }
                      });
                      setPanelContents((prev) =>
                        prev.map((c) => ({ ...c, isDeleted: false, isArchived: false, deletedAt: undefined }))
                      );
                    }}
                    className="btn-admin-restore-all-trash px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    بازگردانی تمامی محتواها به فید
                  </button>
                </div>
              )}

              {/* Contents Table / List */}
              <div className="space-y-3">
                {filteredContents.length === 0 ? (
                  <div className="text-center py-12 text-slate-300 bg-[#13171f] rounded-2xl border border-[#282d35] shadow-md text-xs font-medium">
                    {contentFilter === 'trash' ? 'سطل بازیافت خالی است (هیچ محتوای حذف‌شده‌ای یافت نشد).' : 'محتوایی در این بخش یافت نشد.'}
                  </div>
                ) : (
                  filteredContents.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border shadow-md transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        item.approvalStatus === 'pending'
                          ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/30'
                          : (item.isDeleted || item.isArchived)
                          ? 'bg-rose-950/30 border-rose-800/50 opacity-80'
                          : 'bg-[#13171f] border-[#282d35]'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <img
                          src={resolveCoverImageUrl(item.thumbnail)}
                          alt={item.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-slate-700"
                          onError={(e) => handleImageError(e, getPlatformFallbackImage(item.platform), item.platform, item.id)}
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
                            {(item.isDeleted || item.isArchived) && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                در سطل بازیافت
                              </span>
                            )}
                            {!(item.isDeleted || item.isArchived) && item.approvalStatus !== 'pending' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                فعال در فید
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span>منتشرکننده: <strong className="text-slate-200">{item.author.name}</strong></span>
                            <span>پلتفرم: <strong className="text-slate-300">{item.platform}</strong></span>
                            <span>دسته‌بندی: <strong className="text-[#ce3df3]">{item.category}</strong></span>
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
                              className="btn-admin-approve-content px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                              title="تأیید و انتشار عمومی در سایت"
                            >
                              <Check className="w-4 h-4" />
                              تأیید و انتشار
                            </button>
                            <button
                              onClick={() => onRejectContent(item.id)}
                              className="btn-admin-reject-content px-3 py-2 rounded-xl bg-[#161b22] hover:bg-rose-600/30 text-rose-400 hover:text-rose-200 border border-rose-500/30 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                              title="عدم تأیید محتوا"
                            >
                              <X className="w-4 h-4" />
                              رد محتوا
                            </button>
                          </>
                        )}

                        {/* If item is in Trash */}
                        {(item.isDeleted || item.isArchived) && (
                          <>
                            <button
                              onClick={() => handleRestoreItem(item.id)}
                              className="btn-admin-restore-item px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                              title="بازگردانی به فید عمومی سایت"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              بازگردانی به فید
                            </button>
                            <button
                              onClick={() => handlePermDeleteItem(item.id)}
                              className="btn-admin-perm-delete-item p-2 rounded-xl bg-[#161b22] hover:bg-rose-600/30 text-rose-400 hover:text-rose-200 transition cursor-pointer active:scale-95 border border-[#282d35]"
                              title="حذف کامل از دیتابیس"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Normal Active Content */}
                        {!(item.isDeleted || item.isArchived) && item.approvalStatus !== 'pending' && (
                          <button
                            onClick={() => onToggleSoftDelete(item.id, true)}
                            className="btn-admin-soft-delete-item px-3 py-1.5 rounded-xl bg-[#161b22] hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
                          className="btn-daily-secondary btn-admin-external-link p-2 rounded-xl text-slate-400 hover:text-white transition"
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#13171f] p-3.5 rounded-2xl border border-[#282d35] shadow-md">
                <div className="gc-admin-user-filters flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setUserFilter('all')}
                    className={`btn-admin-user-filter-all px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      userFilter === 'all'
                        ? 'bg-[#ce3df3] text-white shadow-sm font-bold'
                        : 'bg-[#161b22] text-slate-300 hover:text-white border border-[#282d35]'
                    }`}
                  >
                    همه کاربران ({usersList.length})
                  </button>
                  <button
                    onClick={() => setUserFilter('auto_approved')}
                    className={`btn-admin-user-filter-auto-approved px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      userFilter === 'auto_approved'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'bg-[#161b22] text-emerald-400 hover:text-white border border-[#282d35]'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    انتشار مستقیم ({autoApprovedUsersCount})
                  </button>
                  <button
                    onClick={() => setUserFilter('need_approval')}
                    className={`btn-admin-user-filter-need-approval px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      userFilter === 'need_approval'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-[#161b22] text-amber-300 hover:text-white border border-[#282d35]'
                    }`}
                  >
                    نیازمند تایید ({needApprovalUsersCount})
                  </button>
                  <button
                    onClick={() => setUserFilter('admins')}
                    className={`btn-admin-user-filter-admins px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      userFilter === 'admins'
                        ? 'bg-amber-600 text-white shadow-sm font-bold'
                        : 'bg-[#161b22] text-slate-300 hover:text-white border border-[#282d35]'
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
                    className="input-daily input-admin-user-search w-full pr-8 pl-3 py-2 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#ce3df3]/25 focus:border-[#ce3df3] transition"
                  />
                </div>
              </div>

              {/* Informative banner about direct publishing permission */}
              <div className="p-3.5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md flex items-center gap-3 text-xs text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>نکته مهم:</strong> کاربرانی که سوییچ <em>«انتشار مستقیم (بدون تایید)»</em> برای آن‌ها فعال باشد، محتوای اشتراک‌گذاری‌شده‌شان بلافاصله و بدون نیاز به تایید ادمین روی سایت قرار می‌گیرد.
                </span>
              </div>

              {/* Users Cards Grid */}
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-300 bg-[#13171f] rounded-2xl border border-[#282d35] shadow-md text-xs font-medium">
                    هیچ کاربری با این مشخصات یافت نشد.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isDirectPublishing = Boolean(u.autoApproveContent || u.isAdmin);
                    return (
                      <div
                        key={u.uid}
                        className="p-4 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md hover:border-[#ce3df3]/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
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
                              <span className="text-[11px] font-mono text-[#ce3df3] bg-[#ce3df3]/10 px-2 py-0.5 rounded-md dir-ltr">
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
                        <div className="flex items-center gap-3 mr-auto sm:mr-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#282d35]">
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
                            className={`btn-admin-toggle-user-approval px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
                              u.autoApproveContent
                                ? 'bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40'
                                : 'btn-daily-secondary text-slate-300 hover:text-slate-100'
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
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#282d35] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        وضعیت پایداری دیتابیس و همگام‌سازی دوگانه
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Firestore + Disk JSON
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        اطلاعات محتواها، پروفایل کاربران و تنظیمات پنل در دو لایه حافظه ابری و دیسک محلی ذخیره می‌شوند
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35]">
                    <span className="text-[11px] text-slate-400 block mb-1">حجم فایل دیتابیس</span>
                    <span className="text-lg font-mono font-bold text-cyan-300">
                      {dbStats?.fileSizeFormatted || 'محاسبه...'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">data/database.json</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35]">
                    <span className="text-[11px] text-slate-400 block mb-1">کل پست‌های ثبت‌شده</span>
                    <span className="text-xl font-mono font-bold text-slate-100">{dbStats?.contentsCount ?? contents.length}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{dbStats?.profilesCount ?? usersList.length} پروفایل کاربر</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35]">
                    <span className="text-[11px] text-slate-400 block mb-1">فایل‌های پشتیبان محلی</span>
                    <span className="text-xl font-mono font-bold text-[#ce3df3]">
                      {dbStats?.backupFilesCount ?? 0} نسخه
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">پشتیبان‌گیری ۱۲ ساعته</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35]">
                    <span className="text-[11px] text-slate-400 block mb-1">حفاظت خودکار هنگام بازیابی</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      پیش‌پشتیبان اضطراری
                    </span>
                  </div>
                </div>
              </div>

              {/* PostgreSQL Relational Database Section */}
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#282d35] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#ce3df3]/10 text-[#ce3df3] border border-[#ce3df3]/20">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        پایگاه داده رابطه‌ای PostgreSQL (موتور اختصاصی سرور مجازی)
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          diagnosticReport?.postgres?.connected
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          {diagnosticReport?.postgres?.connected ? 'PostgreSQL متصل و فعال' : 'در حال اجرا با JSON Store'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        معماری دوگانه: پایداری بر روی دیسک با پشتیبانی کامل از PostgreSQL جهت جستجوهای سریع، روابط ساختاری و ارتقای ده‌هزار محتوایی
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">وضعیت اتصال پایگاه داده:</span>
                      {diagnosticReport?.postgres?.connected ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          متصل به PostgreSQL ({diagnosticReport.postgres.tableCounts?.contents || contents.length} محتوا ثبت‌شده)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          آماده فعال‌سازی با تنظیم متغیر DATABASE_URL در سرور مجازی
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {diagnosticReport?.postgres?.connected
                        ? `پایگاه داده فعال: ${diagnosticReport.postgres.engine} (پینگ سرور: ${diagnosticReport.postgres.pingMs} میلی‌ثانیه)`
                        : 'تمامی کوئری‌ها در حال حاضر از حافظه سریع دیسک و همگام‌سازی ابری تامین می‌شوند.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleMigrateToPostgres}
                      disabled={isMigratingPostgres}
                      className="btn-daily-primary btn-admin-migrate-postgres w-full sm:w-auto px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isMigratingPostgres ? 'animate-spin' : ''}`} />
                      {isMigratingPostgres ? 'در حال مهاجرت داده‌ها...' : 'همگام‌سازی و مهاجرت به PostgreSQL'}
                    </button>
                  </div>
                </div>

                {postgresMigrationMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      postgresMigrationMessage.success
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {postgresMigrationMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{postgresMigrationMessage.text}</span>
                  </div>
                )}

                {/* CloudPanel Quick Setup Instructions */}
                <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-[11px] text-slate-300 space-y-1.5">
                  <span className="font-bold text-[#ce3df3] block">راهنمای راه‌اندازی PostgreSQL در CloudPanel سرور مجازی (OVH):</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 pr-1">
                    <li>در پنل مدیریت <span className="text-slate-200 font-mono">CloudPanel</span> وارد منوی <span className="text-slate-200">Databases</span> شوید.</li>
                    <li>یک دیتابیس با نوع <span className="text-[#ce3df3] font-mono">PostgreSQL</span>، نام <span className="text-[#ce3df3] font-mono">geekclub_db</span> و کاربر بسازید.</li>
                    <li>در فایل <span className="text-amber-300 font-mono">.env</span> سرور، متغیر اتصال را وارد کنید: <span className="text-emerald-400 font-mono text-[10px]">DATABASE_URL="postgresql://user:password@127.0.0.1:5432/geekclub_db"</span></li>
                    <li>سرویس نود را در CloudPanel ریستارت کنید؛ تمامی جداول و ایندکس‌ها خودکار ساخته و با اطلاعات فعلی همگام می‌شوند.</li>
                  </ol>
                </div>
              </div>

              {/* Google Drive Automated 12-Hour Sync Section */}
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#282d35] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        پشتیبان‌گیری خودکار ۱۲ ساعته روی Google Drive
                        <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
                          Google Workspace OAuth
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        ارسال خودکار و منظم فایل‌های snapshot دیتابیس سایت به پوشه گوگل درایو ادمین (3dsaz1990@gmail.com)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                        className="btn-daily-primary btn-admin-connect-drive w-full sm:w-auto px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                      >
                        <Cloud className="w-4 h-4" />
                        {isConnectingDrive ? 'در حال اتصال...' : 'اتصال به اکانت Google Drive'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUploadDriveNow}
                        disabled={isUploadingDrive}
                        className="btn-daily-primary btn-admin-upload-drive w-full sm:w-auto px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
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
                        className="btn-admin-drive-link text-[#ce3df3] hover:underline font-mono text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        مشاهده در گوگل درایو
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Full Backup Download & Restore Section */}
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-[#282d35] pb-3">
                  <div className="p-2.5 rounded-xl bg-[#ce3df3]/10 text-[#ce3df3] border border-[#ce3df3]/20">
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
                  <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                        <Download className="w-4 h-4 text-[#ce3df3]" />
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
                      className="btn-daily-primary btn-admin-export-backup-json w-full px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Download className={`w-4 h-4 ${isExportingDb ? 'animate-bounce' : ''}`} />
                      {isExportingDb ? 'در حال دریافت فایل...' : 'دانلود فایل پشتیبان (JSON)'}
                    </button>
                  </div>

                  {/* Restore Backup File Selector */}
                  <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex flex-col justify-between space-y-3">
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
                        className="btn-daily-secondary btn-admin-import-backup-json w-full px-4 py-2.5 rounded-xl text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-[#282d35]"
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
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#282d35] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
                    className="btn-daily-primary btn-admin-merge-seeds px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
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
              {/* Top Card: Full Automated System Checkup & Health Score */}
              <div className="p-6 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282d35] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[#ce3df3]/10 text-[#ce3df3] ring-2 ring-[#ce3df3]/20">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                        موتور هوشمند عیب‌یابی و پایش خودکار سیستم
                        <span className="text-[10px] bg-[#ce3df3]/15 text-[#ce3df3] px-2.5 py-0.5 rounded-full border border-[#ce3df3]/30">
                          System Diagnostic Engine
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        بررسی خودکار سلامت دیتابیس، آپلود و CDN، ناهمخوانی سطل زباله، و گزارش لاگ‌های خطای زنده
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunFullSystemCheck}
                    disabled={isCheckingDiagnostic}
                    className="btn-daily-primary btn-run-full-system-check px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingDiagnostic ? 'animate-spin' : ''}`} />
                    {isCheckingDiagnostic ? 'در حال پایش و چک‌آپ...' : 'اجرای چک‌آپ کامل سیستم'}
                  </button>
                </div>

                {fullDiagReport ? (
                  <div className="space-y-4">
                    {/* Overall Health Score & Status Badge */}
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      fullDiagReport.status === 'ok'
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                        : fullDiagReport.status === 'warn'
                        ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                        : 'bg-rose-500/15 text-rose-200 border-rose-500/40'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-lg ${
                          fullDiagReport.healthScore >= 90
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : fullDiagReport.healthScore >= 70
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {fullDiagReport.healthScore ?? 100}%
                        </div>
                        <div>
                          <h5 className="text-sm font-bold flex items-center gap-2">
                            {fullDiagReport.status === 'ok'
                              ? 'سیستم کاملاً سالم، پایدار و بدون خطاست'
                              : fullDiagReport.status === 'warn'
                              ? 'سیستم فعال است (نیاز به توجه جزئی دارد)'
                              : 'هشدار خطای بحرانی در سیستم'}
                          </h5>
                          <p className="text-xs opacity-90 mt-0.5">
                            تست‌ها در زمان {fullDiagReport.latencyMs ?? 0} میلی‌ثانیه با موفقیت اجرا شدند.
                          </p>
                        </div>
                      </div>

                      {fullDiagReport.system && (
                        <div className="flex items-center gap-2 font-mono text-[11px] dir-ltr text-slate-300 bg-[#0e1217] p-2 rounded-lg border border-[#282d35]">
                          <span>Node: {fullDiagReport.system.nodeVersion}</span>
                          <span>|</span>
                          <span>Uptime: {fullDiagReport.system.uptimeSeconds}s</span>
                          <span>|</span>
                          <span>RAM: {fullDiagReport.system.memoryMb?.heapUsed}MB</span>
                        </div>
                      )}
                    </div>

                    {/* Recommendations Box if any */}
                    {fullDiagReport.recommendations && fullDiagReport.recommendations.length > 0 && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 text-xs">
                        <h6 className="font-bold flex items-center gap-2 text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          پیشنهادات هوشمند جهت رفع باگ‌ها و بهینه‌سازی:
                        </h6>
                        <ul className="list-disc list-inside space-y-1 text-[11px] opacity-95">
                          {fullDiagReport.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>

                        {fullDiagReport.checks?.some((c: any) => c.inconsistentItemsCount > 0) && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleFixTrashTombstones}
                              disabled={isFixingTrash}
                              className="btn-admin-fix-trash-inconsistency px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${isFixingTrash ? 'animate-spin' : ''}`} />
                              {isFixingTrash ? 'در حال اصلاح سطل زباله...' : 'اصلاح خودکار ناهمخوانی سطل زباله'}
                            </button>
                            {fixTrashMsg && <p className="text-[11px] text-emerald-400 mt-1 font-bold">{fixTrashMsg}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Structural Check Breakdown Grid */}
                    {fullDiagReport.checks && Array.isArray(fullDiagReport.checks) && (
                      <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] space-y-3">
                        <h5 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-[#282d35] pb-2">
                          <Database className="w-4 h-4 text-[#ce3df3]" />
                          نتایج چک‌آپ ماژول‌های حیاتی وبسایت
                        </h5>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {fullDiagReport.checks.map((check: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-[#161b22] border border-[#282d35] space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-200">{check.name}</span>
                                <span className={`flex items-center gap-1 text-[11px] ${
                                  check.status === 'pass'
                                    ? 'text-emerald-400'
                                    : check.status === 'warn'
                                    ? 'text-amber-400'
                                    : check.status === 'info'
                                    ? 'text-cyan-400'
                                    : 'text-rose-400'
                                }`}>
                                  {check.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {check.status === 'warn' && <AlertTriangle className="w-3.5 h-3.5" />}
                                  {check.status === 'pass' ? 'موفق' : check.status === 'warn' ? 'هشدار' : check.status === 'info' ? 'اطلاعیه' : 'خطا'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">{check.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="p-4 rounded-xl bg-[#ce3df3]/10 border border-[#ce3df3]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h6 className="text-xs font-bold text-[#ce3df3]">همگام‌سازی فوری و بازنشانی کش مرورگر</h6>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          تخلیه کش localStorage و دریافت آخرین وضعیت فید و سطل زباله از سرور
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const latest = await api.getContents({ includeDeleted: true });
                          if (Array.isArray(latest)) {
                            onUpdateContents?.(latest);
                          }
                          handleRunFullSystemCheck();
                        }}
                        className="btn-daily-primary btn-admin-sync-refresh-feed px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer shrink-0 active:scale-95"
                      >
                        همگام‌سازی و بروزرسانی فید
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#ce3df3]" />
                    <p className="text-xs">در حال پایش خودکار دیتابیس، فایل‌ها و خطاهای سیستم...</p>
                  </div>
                )}
              </div>

              {/* Automated Error Logs Viewer Card */}
              <div className="p-6 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#282d35] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        گزارش لاگ‌های زنده خطا و استثناها (System Error Logs)
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                          {systemLogsList.length} لاگ ثبت‌شده
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        مشاهده خطاهای ثبت شده از فرانت‌اند مرورگر، APIهای سرور و فرایندهای پس‌زمینه
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(systemLogsList, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `system_diagnostic_logs_${Date.now()}.json`;
                        a.click();
                      }}
                      disabled={systemLogsList.length === 0}
                      className="btn-daily-secondary btn-admin-export-logs-json px-3 py-1.5 rounded-xl text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      دانلود گزارش JSON
                    </button>

                    <button
                      type="button"
                      onClick={handleClearLogs}
                      disabled={systemLogsList.length === 0}
                      className="btn-admin-clear-system-logs px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      پاکسازی لاگ‌ها
                    </button>
                  </div>
                </div>

                {/* Filter and Search controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setLogFilterLevel('all')}
                      className={`btn-admin-log-filter-all px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        logFilterLevel === 'all' ? 'bg-[#ce3df3] text-white' : 'bg-[#0e1217] text-slate-400 hover:text-slate-200 border border-[#282d35]'
                      }`}
                    >
                      همه ({systemLogsList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilterLevel('error')}
                      className={`btn-admin-log-filter-error px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        logFilterLevel === 'error' ? 'bg-rose-600 text-white' : 'bg-[#0e1217] text-slate-400 hover:text-slate-200 border border-[#282d35]'
                      }`}
                    >
                      خطاها
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilterLevel('warn')}
                      className={`btn-admin-log-filter-warn px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        logFilterLevel === 'warn' ? 'bg-amber-600 text-white' : 'bg-[#0e1217] text-slate-400 hover:text-slate-200 border border-[#282d35]'
                      }`}
                    >
                      هشدارها
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilterLevel('info')}
                      className={`btn-admin-log-filter-info px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        logFilterLevel === 'info' ? 'bg-cyan-600 text-white' : 'bg-[#0e1217] text-slate-400 hover:text-slate-200 border border-[#282d35]'
                      }`}
                    >
                      اطلاعیه‌ها
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="جستجو در متن لاگ..."
                      value={logSearchTerm}
                      onChange={(e) => setLogSearchTerm(e.target.value)}
                      className="input-daily input-admin-log-search w-full pr-8 pl-3 py-1.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#ce3df3]"
                    />
                  </div>
                </div>

                {/* Logs List Container */}
                <div className="max-h-72 overflow-y-auto space-y-2 p-1 font-mono text-[11px]">
                  {systemLogsList
                    .filter((log) => {
                      if (!logSearchTerm) return true;
                      const term = logSearchTerm.toLowerCase();
                      return (
                        log.message?.toLowerCase().includes(term) ||
                        log.category?.toLowerCase().includes(term) ||
                        JSON.stringify(log.details || {}).toLowerCase().includes(term)
                      );
                    })
                    .length === 0 ? (
                    <div className="text-center py-8 text-slate-500 font-sans text-xs">
                      هیچ خطایی ثبت نشده است یا لاگی تطابق ندارد.
                    </div>
                  ) : (
                    systemLogsList
                      .filter((log) => {
                        if (!logSearchTerm) return true;
                        const term = logSearchTerm.toLowerCase();
                        return (
                          log.message?.toLowerCase().includes(term) ||
                          log.category?.toLowerCase().includes(term) ||
                          JSON.stringify(log.details || {}).toLowerCase().includes(term)
                        );
                      })
                      .map((log) => (
                        <div
                          key={log.id}
                          className={`p-3 rounded-xl border space-y-1 ${
                            log.level === 'error'
                              ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                              : log.level === 'warn'
                              ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                              : 'bg-[#0e1217] border-[#282d35] text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold dir-ltr text-left">
                            <span className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                                log.level === 'error' ? 'bg-rose-500/30 text-rose-300' : log.level === 'warn' ? 'bg-amber-500/30 text-amber-300' : 'bg-[#161b22] text-slate-400'
                              }`}>
                                [{log.category || 'system'}] {log.level.toUpperCase()}
                              </span>
                              <span className="truncate max-w-md font-sans">{log.message}</span>
                            </span>
                            <span className="text-[10px] opacity-60 text-slate-400">
                              {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                            </span>
                          </div>

                          {log.details && (
                            <div className="dir-ltr text-left text-[10px] bg-[#0e1217] p-2 rounded-lg border border-[#282d35] overflow-x-auto text-slate-400">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>


              {/* Apify Instagram Extraction Diagnostic Card */}
              <div className="p-6 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282d35] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-pink-500/20 text-pink-400 ring-2 ring-pink-500/30">
                      <Instagram className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                        عیب‌یابی اتصال و استخراج محتوا از Apify (اینستاگرام)
                        <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2.5 py-0.5 rounded-full border border-pink-500/30">
                          Apify Inspector
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        بررسی وضعیت توکن API، تست اتصال به سرور Apify و شبیه‌سازی استخراج پست نمونه اینستاگرام
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAbortAllApifyRuns}
                      disabled={isAbortingRuns}
                      className="btn-admin-abort-apify-runs px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                      title="در صورت بروز خطای 5 concurrent Actor runs، با این دکمه کانتینرهای معلق متوقف می‌شوند"
                    >
                      <Trash2 className={`w-4 h-4 ${isAbortingRuns ? 'animate-spin' : ''}`} />
                      {isAbortingRuns ? 'در حال آزادسازی...' : 'آزادسازی صف کانتینرهای Apify'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRunApifyDiagnostic}
                      disabled={isCheckingApifyDiag}
                      className="btn-daily-primary btn-admin-test-apify-connection px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCheckingApifyDiag ? 'animate-spin' : ''}`} />
                      {isCheckingApifyDiag ? 'در حال بررسی...' : 'بررسی توکن و اتصال Apify'}
                    </button>
                  </div>
                </div>

                {abortResultMsg && (
                  <div className="p-3 rounded-xl bg-[#ce3df3]/15 border border-[#ce3df3]/30 text-xs text-[#ce3df3] font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{abortResultMsg}</span>
                  </div>
                )}

                {apifyDiagnosticReport && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    apifyDiagnosticReport.apiReachable
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                      : 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                  }`}>
                    <div className="flex items-center gap-3">
                      {apifyDiagnosticReport.apiReachable ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                      )}
                      <div>
                        <h5 className="text-sm font-bold flex items-center gap-2">
                          {apifyDiagnosticReport.apiReachable ? 'اتصال به Apify API موفق و توکن معتبر است' : 'هشدار در اتصال به Apify'}
                          {apifyDiagnosticReport.activeRunsCount !== undefined && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                              apifyDiagnosticReport.activeRunsCount >= 5 
                                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                                : 'bg-[#161b22] text-slate-300'
                            }`}>
                              اجراهای هم‌زمان: {apifyDiagnosticReport.activeRunsCount} از ۵
                            </span>
                          )}
                        </h5>
                        <p className="text-xs opacity-90 mt-0.5">
                          {apifyDiagnosticReport.message} {apifyDiagnosticReport.tokenMasked ? `(توکن: ${apifyDiagnosticReport.tokenMasked}, منبع: ${apifyDiagnosticReport.tokenSource})` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Extraction Test Box */}
                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] space-y-3">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-pink-400" />
                      تست زنده استخراج لینک نمونه اینستاگرام
                    </span>
                    <span className="text-[10px] text-amber-400 font-normal">
                      نکته: فقط لینک مستقیم پست یا ریلز (/p/ یا /reel/) پشتیبانی می‌شود
                    </span>
                  </h5>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      id="testInstagramUrlInput"
                      name="testInstagramUrl"
                      value={testInstagramUrl}
                      onChange={(e) => setTestInstagramUrl(e.target.value)}
                      placeholder="لینک پست یا ریلز اینستاگرام را وارد کنید..."
                      className="input-daily input-admin-test-instagram-url flex-1 px-3 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ce3df3] dir-ltr font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleRunApifyLiveTest}
                      disabled={isRunningApifyTest || !testInstagramUrl.trim()}
                      className="btn-daily-primary btn-admin-run-apify-test px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Sparkles className={`w-4 h-4 ${isRunningApifyTest ? 'animate-spin' : ''}`} />
                      {isRunningApifyTest ? 'در حال استخراج...' : 'اجرای تست استخراج'}
                    </button>
                  </div>

                  {apifyTestRunResult && (
                    <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                      apifyTestRunResult.success
                        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-200 border-rose-500/30'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          {apifyTestRunResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                          {apifyTestRunResult.message}
                        </span>
                        {apifyTestRunResult.durationMs && (
                          <span className="font-mono text-[10px] text-slate-400">زمان اجرا: {apifyTestRunResult.durationMs}ms</span>
                        )}
                      </div>

                      {/* Logs trace */}
                      {apifyTestRunResult.logs && Array.isArray(apifyTestRunResult.logs) && (
                        <div className="p-2.5 rounded-lg bg-[#0e1217] border border-[#282d35] font-mono text-[10px] text-slate-300 space-y-1 max-h-36 overflow-y-auto dir-ltr text-left">
                          {apifyTestRunResult.logs.map((log: string, idx: number) => (
                            <div key={idx} className={log.includes('ERROR') ? 'text-rose-400 font-bold' : log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                              {log}
                            </div>
                          ))}
                        </div>
                      )}

                      {apifyTestRunResult.error && (
                        <div className="p-2 rounded bg-rose-950/40 text-rose-300 font-mono text-[11px]">
                          خطا: {apifyTestRunResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Apify API Configuration & Inspector Tab */}
          {activeTab === 'apify' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Card 1: API Token & Actor Settings */}
              <div className="p-6 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-[#282d35] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-400 ring-2 ring-pink-500/20">
                      <Instagram className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                        تعریف و تنظیمات اختصاصی API در Apify
                        <span className="text-[10px] bg-pink-500/10 text-pink-300 px-2.5 py-0.5 rounded-full border border-pink-500/20 font-mono dir-ltr">
                          APIFY_API_TOKEN
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        تنظیم توکن API و شناسه اکتور جهت استخراج خودکار ویدیوها، عکس‌ها و اسلایدهای اینستاگرام
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://console.apify.com/account/integrations"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 underline font-bold"
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
                      id="apifyTokenTabInput"
                      name="apifyTokenTab"
                      value={apifyToken}
                      onChange={(e) => setApifyToken(e.target.value)}
                      placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="input-daily input-admin-apify-token w-full px-3.5 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-[#ce3df3]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      قابل تنظیم از طریق متغیر محیطی <code className="text-pink-300 font-mono">APIFY_API_TOKEN</code> یا فیلد بالا
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      شناسه اکتور استخراجگر (Actor ID)
                    </label>
                    <input
                      type="text"
                      id="apifyActorTabInput"
                      name="apifyActorTab"
                      value={apifyActor}
                      onChange={(e) => setApifyActor(e.target.value)}
                      placeholder="apify~instagram-scraper"
                      className="input-daily input-admin-apify-actor w-full px-3.5 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-[#ce3df3]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      پیش‌فرض: <code className="text-pink-300 font-mono">apify~instagram-scraper</code>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#282d35]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveApifySettings}
                      className="btn-daily-primary btn-admin-save-apify-settings px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      ذخیره تنظیمات Apify
                    </button>

                    <button
                      type="button"
                      onClick={handleTestApify}
                      disabled={isTestingApify || !apifyToken.trim()}
                      className="btn-daily-secondary btn-admin-test-apify px-4 py-2.5 rounded-xl text-slate-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-[#282d35] disabled:opacity-50 active:scale-95"
                    >
                      <Clock className={`w-4 h-4 ${isTestingApify ? 'animate-spin text-pink-400' : ''}`} />
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
                    className={`p-3.5 rounded-xl text-xs space-y-1 border animate-in fade-in duration-200 ${
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

              {/* Card 2: Apify Diagnostic & Free Containers */}
              <div className="p-6 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282d35] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#ce3df3]/10 text-[#ce3df3]">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                        عیب‌یابی اتصال و مدیریت صف کانتینرها (Apify Inspector)
                      </h4>
                      <p className="text-xs text-slate-300">
                        بررسی وضعیت اجراهای هم‌زمان (محدودیت ۵ اکتیو)، آزادسازی کانتینرهای معلق و وضعیت شبکه
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleAbortAllApifyRuns}
                      disabled={isAbortingRuns}
                      className="btn-admin-abort-apify-runs-tab w-1/2 sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                      title="در صورت بروز خطای 5 concurrent Actor runs، با این دکمه کانتینرهای معلق متوقف می‌شوند"
                    >
                      <Trash2 className={`w-4 h-4 ${isAbortingRuns ? 'animate-spin' : ''}`} />
                      {isAbortingRuns ? 'در حال آزادسازی...' : 'آزادسازی کانتینرها'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRunApifyDiagnostic}
                      disabled={isCheckingApifyDiag}
                      className="btn-daily-primary btn-admin-check-apify-network w-1/2 sm:w-auto px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCheckingApifyDiag ? 'animate-spin' : ''}`} />
                      {isCheckingApifyDiag ? 'در حال بررسی...' : 'ارزیابی وضعیت شبکه'}
                    </button>
                  </div>
                </div>

                {abortResultMsg && (
                  <div className="p-3 rounded-xl bg-[#ce3df3]/15 border border-[#ce3df3]/30 text-xs text-[#ce3df3] font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{abortResultMsg}</span>
                  </div>
                )}

                {apifyDiagnosticReport && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    apifyDiagnosticReport.apiReachable
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                      : 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                  }`}>
                    <div className="flex items-center gap-3">
                      {apifyDiagnosticReport.apiReachable ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                      )}
                      <div>
                        <h5 className="text-sm font-bold flex items-center gap-2">
                          {apifyDiagnosticReport.apiReachable ? 'اتصال به Apify API موفق و توکن معتبر است' : 'هشدار در اتصال به Apify'}
                          {apifyDiagnosticReport.activeRunsCount !== undefined && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                              apifyDiagnosticReport.activeRunsCount >= 5 
                                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                                : 'bg-[#161b22] text-slate-300'
                            }`}>
                              اجراهای هم‌زمان: {apifyDiagnosticReport.activeRunsCount} از ۵
                            </span>
                          )}
                        </h5>
                        <p className="text-xs opacity-90 mt-0.5">
                          {apifyDiagnosticReport.message} {apifyDiagnosticReport.tokenMasked ? `(توکن: ${apifyDiagnosticReport.tokenMasked}, منبع: ${apifyDiagnosticReport.tokenSource})` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Extraction Test Box */}
                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] space-y-3">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-pink-400" />
                      تست زنده استخراج لینک نمونه اینستاگرام
                    </span>
                    <span className="text-[10px] text-amber-400 font-normal">
                      نکته: فقط لینک مستقیم پست یا ریلز (/p/ یا /reel/) پشتیبانی می‌شود
                    </span>
                  </h5>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      id="testInstagramUrlTabInput"
                      name="testInstagramUrlTab"
                      value={testInstagramUrl}
                      onChange={(e) => setTestInstagramUrl(e.target.value)}
                      placeholder="لینک پست یا ریلز اینستاگرام را وارد کنید..."
                      className="input-daily input-admin-test-instagram-url-tab flex-1 px-3 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ce3df3] dir-ltr font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleRunApifyLiveTest}
                      disabled={isRunningApifyTest || !testInstagramUrl.trim()}
                      className="btn-daily-primary btn-admin-run-apify-test-tab px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Sparkles className={`w-4 h-4 ${isRunningApifyTest ? 'animate-spin' : ''}`} />
                      {isRunningApifyTest ? 'در حال استخراج...' : 'اجرای تست استخراج'}
                    </button>
                  </div>

                  {apifyTestRunResult && (
                    <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                      apifyTestRunResult.success
                        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-200 border-rose-500/30'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          {apifyTestRunResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                          {apifyTestRunResult.message}
                        </span>
                        {apifyTestRunResult.durationMs && (
                          <span className="font-mono text-[10px] text-slate-400">زمان اجرا: {apifyTestRunResult.durationMs}ms</span>
                        )}
                      </div>

                      {/* Logs trace */}
                      {apifyTestRunResult.logs && Array.isArray(apifyTestRunResult.logs) && (
                        <div className="p-2.5 rounded-lg bg-[#0e1217] border border-[#282d35] font-mono text-[10px] text-slate-300 space-y-1 max-h-36 overflow-y-auto dir-ltr text-left">
                          {apifyTestRunResult.logs.map((log: string, idx: number) => (
                            <div key={idx} className={log.includes('ERROR') ? 'text-rose-400 font-bold' : log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                              {log}
                            </div>
                          ))}
                        </div>
                      )}

                      {apifyTestRunResult.error && (
                        <div className="p-2 rounded bg-rose-950/40 text-rose-300 font-mono text-[11px]">
                          خطا: {apifyTestRunResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-[#282d35] pb-3">
                  <div className="p-2.5 rounded-xl bg-[#ce3df3]/10 text-[#ce3df3] border border-[#ce3df3]/20">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100">
                      تنظیمات نظارت و انتشار محتوا
                    </h4>
                    <p className="text-xs text-slate-400">
                      کنترل شرایط پیش‌فرض انتشار پست‌های ارسالی کاربران در کل سایت
                    </p>
                  </div>
                </div>

                {/* Primary Content Moderation Toggle */}
                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] shadow-sm flex items-center justify-between gap-4">
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
                    className={`btn-admin-toggle-approval-req p-1 text-2xl transition cursor-pointer ${
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
                <div className="p-3.5 rounded-xl bg-[#0e1217] border border-[#282d35] shadow-sm flex items-center justify-between text-xs">
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
                    className="btn-admin-view-pending-queue text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>مشاهده صف محتواهای در انتظار تایید ({pendingCount})</span>
                    <span>←</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('users')}
                    className="btn-admin-view-direct-publishers text-xs text-[#ce3df3] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>مدیریت کاربران بدون نیاز به تایید ({autoApprovedUsersCount})</span>
                    <span>←</span>
                  </button>
                </div>
              </div>

              {/* Platform Enable/Disable Toggles Section */}
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-[#282d35] pb-3">
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
                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex items-center justify-between gap-4">
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
                    className={`btn-admin-toggle-youtube p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowYouTube ? 'text-red-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowYouTube ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>

                {/* Instagram Toggle */}
                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex items-center justify-between gap-4">
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
                    className={`btn-admin-toggle-instagram p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowInstagram ? 'text-pink-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowInstagram ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>

                {/* Aparat Toggle */}
                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex items-center justify-between gap-4">
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
                    className={`btn-admin-toggle-aparat p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowAparat ? 'text-rose-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowAparat ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>

                {/* Articles Toggle */}
                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex items-center justify-between gap-4">
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
                    className={`btn-admin-toggle-articles p-1 text-2xl transition cursor-pointer ${
                      siteSettings.allowArticles ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.allowArticles ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>
              </div>

              {/* Google reCAPTCHA Security Section */}
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center gap-3 border-b border-[#282d35] pb-3">
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

                <div className="p-4 rounded-xl bg-[#0e1217] border border-[#282d35] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs border border-blue-500/20">
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
                    className={`btn-admin-toggle-recaptcha p-1 text-2xl transition cursor-pointer ${
                      siteSettings.enableCaptcha ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    {siteSettings.enableCaptcha ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>
              </div>

              {/* Dedicated CDN Setup & Management Section (upc.geekclub.ir) */}
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#282d35] pb-3">
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
                      className="input-daily input-admin-cdn-endpoint w-full px-3.5 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-[#ce3df3]"
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
                      placeholder="CDN API token"
                      className="input-daily input-admin-cdn-token w-full px-3.5 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-[#ce3df3]"
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
                    className="btn-daily-primary btn-admin-save-cdn px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
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
                      className="btn-daily-secondary btn-admin-copy-php-script px-3 py-1.5 rounded-xl text-amber-300 hover:text-white border border-[#282d35] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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
                      className="textarea-daily w-full p-3 rounded-xl bg-[#0e1217] border border-[#282d35] text-[11px] font-mono text-emerald-400 dir-ltr text-left leading-relaxed focus:outline-none"
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
                      className="btn-daily-secondary btn-admin-test-cdn-health px-3.5 py-1.5 rounded-xl text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-[#282d35] disabled:opacity-50"
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
                      <div className="text-[10px] font-mono dir-ltr text-slate-400 bg-[#0e1217] p-2 rounded-lg border border-[#282d35]">
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
                      className="btn-daily-primary btn-admin-start-image-migration px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <ExternalLink className={`w-3.5 h-3.5 ${isMigratingImages ? 'animate-spin' : ''}`} />
                      {isMigratingImages ? 'در حال انتقال...' : 'انتقال عکس‌های فعلی به CDN'}
                    </button>
                  </div>

                  {/* Migration Stats Pill */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-xl bg-[#0e1217] border border-[#282d35]">
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
                    <div className="p-3 rounded-xl bg-[#0e1217] border border-amber-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-amber-300 font-medium">
                        <span className="truncate max-w-[240px]">
                          {migrationStatus.completed ? 'اتمام فرآیند انتقال' : `در حال انتقال: ${migrationStatus.currentTitle}`}
                        </span>
                        <span className="font-mono text-white">
                          {migrationStatus.current} / {migrationStatus.total}
                        </span>
                      </div>
                      <div className="w-full bg-[#161b22] rounded-full h-2 overflow-hidden">
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
                    <div className="max-h-32 overflow-y-auto p-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-[10px] font-mono text-slate-300 space-y-1 dir-ltr text-left">
                      {migrationLogs.map((log, idx) => (
                        <div key={idx} className="leading-snug border-b border-[#282d35] pb-0.5">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Apify Instagram Media Scraper & CDN Integration */}
              <div className="p-5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#282d35] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#ce3df3]/10 text-[#ce3df3]">
                      <Instagram className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        اتصال به Apify (استخراج خودکار ویدیو و رسانه‌های اینستاگرام)
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#ce3df3]/20 text-[#ce3df3] border border-[#ce3df3]/30">
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
                    className="hidden sm:flex items-center gap-1.5 text-xs text-[#ce3df3] hover:underline font-medium"
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
                      className="input-daily input-admin-apify-token-settings w-full px-3.5 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-[#ce3df3]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      قابل تنظیم از طریق متغیر محیطی <code className="text-[#ce3df3] font-mono">APIFY_API_TOKEN</code> یا فیلد بالا
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
                      className="input-daily input-admin-apify-actor-settings w-full px-3.5 py-2.5 rounded-xl bg-[#0e1217] border border-[#282d35] text-xs text-slate-100 dir-ltr text-left font-mono focus:outline-none focus:border-[#ce3df3]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      پیش‌فرض: <code className="text-[#ce3df3] font-mono">apify~instagram-scraper</code>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveApifySettings}
                      className="btn-daily-primary btn-admin-save-apify-settings-sec px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      ذخیره تنظیمات Apify
                    </button>

                    <button
                      type="button"
                      onClick={handleTestApify}
                      disabled={isTestingApify || !apifyToken.trim()}
                      className="btn-daily-secondary btn-admin-test-apify-sec px-3.5 py-2 rounded-xl text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-[#282d35] disabled:opacity-50"
                    >
                      <Clock className={`w-3.5 h-3.5 ${isTestingApify ? 'animate-spin text-[#ce3df3]' : ''}`} />
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
                  className="select-daily select-admin-feedback-status px-2.5 py-1.5 rounded-xl bg-[#13171f] border border-[#282d35] text-slate-200 text-xs focus:outline-none focus:border-[#ce3df3]"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار بررسی</option>
                  <option value="reviewed">بررسی‌شده</option>
                  <option value="resolved">حل‌شده / پاسخ‌داده‌شده</option>
                </select>
              </div>

               {filteredFeedback.length === 0 ? (
                <div className="text-center py-12 text-slate-300 bg-[#13171f] rounded-2xl border border-[#282d35] shadow-md text-xs font-medium">
                  هیچ پیشنهادی یا انتقادی در این بخش وجود ندارد.
                </div>
              ) : (
                filteredFeedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4.5 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-100">{fb.title}</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fb.type === 'suggestion'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : fb.type === 'critique'
                              ? 'bg-[#ce3df3]/10 text-[#ce3df3] border border-[#ce3df3]/20'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
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
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : fb.status === 'reviewed'
                          ? 'bg-[#ce3df3]/10 text-[#ce3df3] border border-[#ce3df3]/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}>
                        {fb.status === 'resolved' ? 'پاسخ داده شد' : fb.status === 'reviewed' ? 'در حال بررسی' : 'در انتظار بررسی'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-100 font-medium bg-[#0e1217] p-3.5 rounded-xl border border-[#282d35] leading-relaxed whitespace-pre-line shadow-inner">
                      {fb.message}
                    </p>

                    {/* Admin Reply or Action */}
                    <div className="flex items-center gap-2 pt-1">
                      {fb.status !== 'resolved' && (
                        <button
                          onClick={() => onUpdateFeedbackStatus(fb.id, 'resolved')}
                          className="btn-admin-resolve-feedback px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          تایید و نشانه‌گذاری به عنوان حل‌شده
                        </button>
                      )}
                      {fb.status === 'pending' && (
                        <button
                          onClick={() => onUpdateFeedbackStatus(fb.id, 'reviewed')}
                          className="btn-daily-secondary btn-admin-review-feedback px-3 py-1.5 rounded-xl text-slate-200 text-xs font-semibold border border-[#282d35] transition cursor-pointer"
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
              <div className="p-4 rounded-2xl bg-[#13171f] border border-[#282d35] shadow-md text-xs text-slate-200 leading-relaxed">
                این پیام به عنوان اعلان رسمی مدیریت مستقیماً در صندوق پیام‌های ورودی (این‌باکس) کاربران قرار خواهد گرفت.
              </div>

              {broadcastSent ? (
                <div className="p-8 text-center bg-[#13171f] rounded-2xl border border-[#282d35] shadow-md space-y-2">
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
                      className="input-daily input-admin-broadcast-subject w-full px-3.5 py-2.5 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:border-[#ce3df3]"
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
                      className="textarea-daily textarea-admin-broadcast-content w-full p-3.5 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:border-[#ce3df3] resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-daily-primary btn-admin-send-broadcast w-full py-3 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
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
