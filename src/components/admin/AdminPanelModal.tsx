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
  Zap,
  Copy
} from 'lucide-react';
import { 
  signInWithGoogleDrive, 
  getDriveAccessToken, 
  uploadBackupToGoogleDrive,
  initDriveAuthListener
} from '../../utils/googleDrive';
import { 
  ContentItem, 
  FeedbackItem, 
  UserProfile, 
  InboxMessage, 
  SiteAdminSettings 
} from '../../types/content';
import { 
  resolveCoverImageUrl, 
  handleImageError, 
  getPlatformFallbackImage 
} from '../../utils/imageHelper';
import { api, getAdminHeaders } from '../../services/api';
import { 
  getCDNConfig, 
  saveCDNConfig, 
  PHP_CDN_SCRIPT_CODE,
  testCDNConnection,
  transferExternalUrlToCDN,
  CDNHealthReport
} from '../../services/cdnService';

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
    'dashboard' | 'contents' | 'users' | 'database' | 'diagnostic' | 'feedback' | 'broadcast' | 'settings' | 'composio'
  >('dashboard');

  // Composio Instagram Connection & Sync State
  const [composioApiKey, setComposioApiKey] = useState(() => siteSettings.composioApiKey || '');
  const [composioUsername, setComposioUsername] = useState(() => siteSettings.composioInstagramUsername || 'esmaeelgray');
  const [composioBotAccount, setComposioBotAccount] = useState(() => siteSettings.composioBotAccount || 'geekclub.ir__');
  const [composioSenderAccount, setComposioSenderAccount] = useState(() => siteSettings.composioSenderAccount || 'esmaeelgray');
  const [composioAutoSync, setComposioAutoSync] = useState(() => siteSettings.enableComposioAutoSync ?? true);
  const [isSavingComposio, setIsSavingComposio] = useState(false);
  const [composioSaveMsg, setComposioSaveMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isRunningComposioSync, setIsRunningComposioSync] = useState(false);
  const [isRunningDMSync, setIsRunningDMSync] = useState(false);
  const [composioSyncResult, setComposioSyncResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [composioStatus, setComposioStatus] = useState<any>(null);

  const fetchComposioStatus = async () => {
    try {
      const status = await api.getComposioStatus();
      setComposioStatus(status);
    } catch {}
  };

  const handleSaveComposioSettings = async () => {
    setIsSavingComposio(true);
    setComposioSaveMsg(null);
    try {
      const res = await api.saveComposioConfig({
        apiKey: composioApiKey,
        username: composioUsername,
        botAccount: composioBotAccount,
        senderAccount: composioSenderAccount,
        autoSync: composioAutoSync
      });
      onUpdateSiteSettings({
        ...siteSettings,
        composioApiKey,
        composioInstagramUsername: composioUsername,
        composioBotAccount,
        composioSenderAccount,
        enableComposioAutoSync: composioAutoSync
      });
      setComposioSaveMsg({
        success: res.success !== false,
        text: res.message || 'تنظیمات اکانت‌های Composio با موفقیت ذخیره گردید.'
      });
      fetchComposioStatus();
    } catch (err: any) {
      setComposioSaveMsg({ success: false, text: err.message || 'خطا در ذخیره تنظیمات' });
    } finally {
      setIsSavingComposio(false);
    }
  };

  const handleRunComposioSyncNow = async () => {
    setIsRunningComposioSync(true);
    setComposioSyncResult(null);
    try {
      const res = await api.triggerComposioSync(composioUsername || 'esmaeelgray');
      setComposioSyncResult({
        success: res.success,
        message: res.message || (res.success ? 'همگام‌سازی با موفقیت انجام گردید.' : 'خطا در همگام‌سازی'),
        count: res.count
      });
      if (res.success) {
        fetchPanelContents();
        fetchComposioStatus();
      }
    } catch (err: any) {
      setComposioSyncResult({
        success: false,
        message: err.message || 'خطا در برقراری ارتباط با سرور'
      });
    } finally {
      setIsRunningComposioSync(false);
    }
  };

  const handleRunComposioDMSyncNow = async () => {
    setIsRunningDMSync(true);
    setComposioSyncResult(null);
    try {
      const res = await api.triggerComposioDMSync(composioBotAccount || 'geekclub.ir__', composioSenderAccount || 'esmaeelgray');
      setComposioSyncResult({
        success: res.success,
        message: res.message || (res.success ? 'استخراج پیام‌های دایرکت انجام شد.' : 'خطا در دریافت دایرکت'),
        count: res.count
      });
      if (res.success) {
        fetchPanelContents();
        fetchComposioStatus();
      }
    } catch (err: any) {
      setComposioSyncResult({
        success: false,
        message: err.message || 'خطا در برقراری ارتباط با سرور'
      });
    } finally {
      setIsRunningDMSync(false);
    }
  };

  const [composioDirectUrl, setComposioDirectUrl] = useState('');
  const [isPublishingDirect, setIsPublishingDirect] = useState(false);

  const handlePublishDirectUrl = async () => {
    if (!composioDirectUrl.trim()) return;
    setIsPublishingDirect(true);
    setComposioSyncResult(null);
    try {
      const res = await fetch('/api/composio/sync-dms', {
        method: 'POST',
        headers: await getAdminHeaders(),
        body: JSON.stringify({
          botAccount: composioBotAccount || 'geekclub.ir__',
          senderAccount: composioSenderAccount || 'esmaeelgray',
          directUrl: composioDirectUrl.trim()
        })
      });
      const data = await res.json();
      setComposioSyncResult({
        success: data.success,
        message: data.message || (data.success ? 'محتوا با موفقیت در سایت منتشر شد.' : 'خطا در انتشار لینک'),
        count: data.count
      });
      if (data.success) {
        setComposioDirectUrl('');
        fetchPanelContents();
        fetchComposioStatus();
      }
    } catch (err: any) {
      setComposioSyncResult({ success: false, message: err.message || 'خطا در ارتباط با سرور' });
    } finally {
      setIsPublishingDirect(false);
    }
  };

  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [webhookRegisterMsg, setWebhookRegisterMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const handleRegisterComposioWebhook = async () => {
    setIsRegisteringWebhook(true);
    setWebhookRegisterMsg(null);
    try {
      const res = await api.registerComposioWebhook(composioApiKey, 'https://geekclub.ir/api/composio/webhook');
      setWebhookRegisterMsg({
        success: res.success,
        text: res.message || 'ثبت وب‌هوک با موفقیت انجام شد.'
      });
      fetchComposioStatus();
    } catch (err: any) {
      setWebhookRegisterMsg({ success: false, text: err.message || 'خطا در ثبت برنامه وب‌هوک Composio' });
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

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
    } else if (activeTab === 'diagnostic') {
      if (!diagnosticReport) handleRunDiagnostic();
      if (!apifyDiagnosticReport) handleRunApifyDiagnostic();
      if (!fullDiagReport) handleRunFullSystemCheck();
      fetchLogs();
    } else if (activeTab === 'database') {
      if (!diagnosticReport) handleRunDiagnostic();
      fetchDbStats();
    } else if (activeTab === 'composio') {
      fetchComposioStatus();
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

  // Fullscreen state & effect
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

  // Current authoritative contents for the admin panel
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
      className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-200"
      dir="rtl"
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
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3 text-slate-950" />
                  مدیر سیستم (فول اسکرین)
                </span>
                <span className="text-[10px] font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md hidden md:inline border border-slate-700">
                  3dsaz1990@gmail.com
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden sm:block mt-0.5">
                مدیریت انتشار، نظارت بر پست‌های معلق، سطوح دسترسی کاربران، تنظیمات و سطل بازیافت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Browser Fullscreen Button */}
            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-100 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title={isBrowserFullscreen ? 'خروج از حالت تمام‌صفحه مرورگر' : 'ورود به حالت تمام‌صفحه مرورگر'}
            >
              {isBrowserFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-white" />
                  <span className="hidden md:inline">کوچک‌نمایی</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-white" />
                  <span className="hidden md:inline">تمام‌صفحه مرورگر</span>
                </>
              )}
            </button>

            {/* Back to Site Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#0077d9] hover:bg-[#0062b3] text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95"
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
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-white" />
              داشبورد و وضعیت
            </button>

            <button
              onClick={() => setActiveTab('contents')}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'contents'
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-white" />
              مدیریت محتوا
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                  {pendingCount} در انتظار تایید
                </span>
              )}
              {trashCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                  {trashCount} سطل
                </span>
              )}
            </button>

            <button
              id="composio-tab-btn"
              onClick={() => setActiveTab('composio')}
              className={`composio-tab-btn pb-3 px-3.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ring-1 ring-amber-500/30 ${
                activeTab === 'composio'
                  ? 'border-amber-500 bg-amber-500 text-slate-950 font-black rounded-t-xl shadow-lg'
                  : 'border-transparent text-amber-400 hover:text-white bg-slate-800/80 rounded-t-lg'
              }`}
            >
              <Instagram className="w-4 h-4 text-rose-400" />
              <span>اتصال اینستاگرام (Composio)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold">
                @esmaeelgray
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'users'
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-white" />
              مدیریت کاربران و انتشار مستقیم
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold">
                {usersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'database'
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 text-white" />
              پایداری داده‌ها و پشتیبان‌گیری
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-600 text-white font-mono font-bold">
                JSON + Firestore
              </span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostic')}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'diagnostic'
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
              تست جامع دیتابیس و همگام‌سازی
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold">
                Live Ping
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-white" />
              تنظیمات تایید محتوا
              <span className={`w-2.5 h-2.5 rounded-full ${siteSettings.requireContentApproval ? 'bg-amber-500' : 'bg-slate-500'}`} />
            </button>

            <button
              id="composio-tab-btn"
              onClick={() => setActiveTab('composio')}
              className={`composio-tab-btn pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'composio'
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Instagram className="w-4 h-4 text-amber-400" />
              اتصال اینستاگرام (Composio)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold">
                @esmaeelgray
              </span>
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'feedback'
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <MessageSquarePlus className="w-4 h-4 text-white" />
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
                  ? 'border-[#0077d9] bg-[#0077d9] text-white font-bold rounded-t-xl'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4 text-white" />
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
                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-[#0077d9] text-white font-bold inline-block">محتواهای فعال و منتشرشده</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">{activeCount}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold inline-block">نمایش عمومی در سایت</span>
                  </div>

                  <div 
                    onClick={() => {
                      setActiveTab('contents');
                      setContentFilter('pending');
                    }}
                    className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2 cursor-pointer hover:bg-slate-750 transition"
                  >
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-600 text-slate-950 font-bold inline-block">در انتظار تایید ادمین</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">{pendingCount}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold inline-block">بررسی و تایید انتشار ←</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold inline-block">سطل بازیافت (حذف نرم)</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">{trashCount}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold inline-block">قابل بازگردانی مجدد</span>
                  </div>

                  <div 
                    onClick={() => setActiveTab('users')}
                    className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2 cursor-pointer hover:bg-slate-750 transition"
                  >
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold inline-block">کاربران ثبت‌نام شده</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">{usersList.length}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold inline-block">
                      {autoApprovedUsersCount} کاربر با انتشار مستقیم
                    </span>
                  </div>
                </div>

                {/* Main Quick Toggle: Content Approval Mode */}
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-white" />
                      <h4 className="text-sm font-bold text-slate-100">
                        وضعیت تأیید محتوا قبل از انتشار در سایت
                      </h4>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        siteSettings.requireContentApproval 
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-600 text-white'
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
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {siteSettings.requireContentApproval ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-slate-950" />
                        تایید محتوا: فعال
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-300" />
                        تایید محتوا: غیرفعال
                      </>
                    )}
                  </button>
                </div>

                {/* Composio Instagram Quick Access Banner Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-lg shadow-rose-500/20 shrink-0">
                      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                        <Instagram className="w-6 h-6 text-rose-400" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-slate-100">
                          همگام‌سازی و اتصال اینستاگرام Composio.dev
                        </h4>
                        <span className="text-[10px] font-mono text-amber-400 font-bold px-2.5 py-0.5 rounded-md bg-slate-950 border border-amber-500/40">
                          @esmaeelgray
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        استخراج خودکار پست‌ها و ریلزهای اکانت esmaeelgray و انتشار فوری با اکانت ادمین
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleRunComposioSyncNow}
                      disabled={isRunningComposioSync}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 text-slate-950 ${isRunningComposioSync ? 'animate-spin' : ''}`} />
                      <span>{isRunningComposioSync ? 'در حال دریافت...' : 'انتشار فوری پست‌های جدید'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('composio')}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-300" />
                      <span>تنظیمات Composio</span>
                    </button>
                  </div>
                </div>

                {/* Quick Actions & Guidelines */}
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-white" />
                    راهنمای مدیریت دسترسی‌ها و محتوا
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 space-y-1">
                      <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-bold text-xs inline-block mb-1">⚡ کاربران با انتشار مستقیم</span>
                      <p className="text-slate-200">شما می‌توانید در تب <strong className="text-white">«مدیریت کاربران»</strong>، به نویسندگان معتمد، تیم تحریریه یا کاربران ویژه، دسترسی <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold text-[10px]">انتشار مستقیم بدون تایید</span> اعطا کنید تا حتی در زمان فعال بودن تایید محتوا، پست‌هایشان فوراً پخش شود.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 space-y-1">
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold text-xs inline-block mb-1">♻️ سطل بازیافت محتوا</span>
                      <p className="text-slate-200">هر محتوایی که توسط مدیر یا منتشرکننده حذف شود، در حافظه سیستم باقی می‌ماند و در تب <strong className="text-white">«مدیریت محتوا»</strong> قابل بازیابی است.</p>
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
                          ? 'bg-[#0077d9] text-white shadow-sm font-bold'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      همه ({currentContents.length})
                    </button>
                    <button
                      onClick={() => setContentFilter('active')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        contentFilter === 'active'
                          ? 'bg-emerald-600 text-white shadow-sm font-bold'
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
                          : 'bg-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-white" />
                      در انتظار تایید ({pendingCount})
                    </button>
                    <button
                      onClick={() => setContentFilter('trash')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        contentFilter === 'trash'
                          ? 'bg-rose-600 text-white shadow-sm font-bold'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      سطل بازیافت ({trashCount})
                    </button>

                    <button
                      type="button"
                      onClick={fetchPanelContents}
                      disabled={isRefreshingContents}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer shrink-0"
                      title="تازه‌سازی فوری لیست محتواها و سطل زباله از سرور"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingContents ? 'animate-spin text-white' : 'text-white'}`} />
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

                {/* Trash Quick Restore Banner */}
                {contentFilter === 'trash' && trashCount > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
                    <div className="flex items-center gap-2.5 text-white">
                      <Trash2 className="w-4 h-4 text-white shrink-0" />
                      <span>تعداد <strong className="text-white font-mono bg-rose-600 px-2 py-0.5 rounded">{trashCount}</strong> محتوا در سطل بازیافت قرار دارد.</span>
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
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-white" />
                      بازگردانی تمامی محتواها به فید
                    </button>
                  </div>
                )}

                {/* Contents Table / List */}
                <div className="space-y-3">
                  {filteredContents.length === 0 ? (
                    <div className="text-center py-12 text-slate-300 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md text-xs font-medium">
                      {contentFilter === 'trash' ? 'سطل بازیافت خالی است (هیچ محتوای حذف‌شده‌ای یافت نشد).' : 'محتوایی در این بخش یافت نشد.'}
                    </div>
                  ) : (
                    filteredContents.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border shadow-md transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          item.approvalStatus === 'pending'
                            ? 'bg-slate-900 border-amber-500/80 ring-1 ring-amber-500/50'
                            : (item.isDeleted || item.isArchived)
                            ? 'bg-slate-900 border-rose-800/80 opacity-90'
                            : 'bg-slate-800/80 border-slate-700/80'
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
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-950" />
                                  نیازمند بررسی و تأیید مدیر
                                </span>
                              )}
                              {(item.isDeleted || item.isArchived) && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                  در سطل بازیافت
                                </span>
                              )}
                              {!(item.isDeleted || item.isArchived) && item.approvalStatus !== 'pending' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                  فعال در فید
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-300 flex-wrap">
                              <span>منتشرکننده: <strong className="text-white">{item.author.name}</strong></span>
                              <span>پلتفرم: <strong className="text-white">{item.platform}</strong></span>
                              <span>دسته‌بندی: <strong className="bg-[#0077d9] text-white px-1.5 py-0.2 rounded">{item.category}</strong></span>
                              <span>{item.publishedAt}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mr-auto md:mr-0 shrink-0 w-full sm:w-auto justify-end">
                          {item.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => onApproveContent(item.id)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                title="تأیید و انتشار عمومی در سایت"
                              >
                                <Check className="w-4 h-4 text-white" />
                                تأیید و انتشار
                              </button>
                              <button
                                onClick={() => onRejectContent(item.id)}
                                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                                title="عدم تأیید محتوا"
                              >
                                <X className="w-4 h-4 text-white" />
                                رد محتوا
                              </button>
                            </>
                          )}

                          {(item.isDeleted || item.isArchived) && (
                            <>
                              <button
                                onClick={() => handleRestoreItem(item.id)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                                title="بازگردانی به فید عمومی سایت"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-white" />
                                بازگردانی به فید
                              </button>
                              <button
                                onClick={() => handlePermDeleteItem(item.id)}
                                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer active:scale-95"
                                title="حذف کامل از دیتابیس"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </>
                          )}

                          {!(item.isDeleted || item.isArchived) && item.approvalStatus !== 'pending' && (
                            <button
                              onClick={() => onToggleSoftDelete(item.id, true)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                              title="پنهان‌سازی از فید و انتقال به سطل بازیافت"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                              انتقال به سطل بازیافت
                            </button>
                          )}

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="مشاهده لینک اصلی"
                          >
                            <ExternalLink className="w-4 h-4 text-white" />
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
                          ? 'bg-[#0077d9] text-white shadow-sm font-bold'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      همه کاربران ({usersList.length})
                    </button>
                    <button
                      onClick={() => setUserFilter('auto_approved')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        userFilter === 'auto_approved'
                          ? 'bg-emerald-600 text-white shadow-sm font-bold'
                          : 'bg-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-white" />
                      انتشار مستقیم ({autoApprovedUsersCount})
                    </button>
                    <button
                      onClick={() => setUserFilter('need_approval')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        userFilter === 'need_approval'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      نیازمند تایید ({needApprovalUsersCount})
                    </button>
                    <button
                      onClick={() => setUserFilter('admins')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        userFilter === 'admins'
                          ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
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

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md flex items-center gap-3 text-xs text-slate-200">
                  <Sparkles className="w-4 h-4 text-white shrink-0" />
                  <span>
                    <strong>نکته مهم:</strong> کاربرانی که سوییچ <em>«انتشار مستقیم (بدون تایید)»</em> برای آن‌ها فعال باشد، محتوای اشتراک‌گذاری‌شده‌شان بلافاصله و بدون نیاز به تایید ادمین روی سایت قرار می‌گیرد.
                  </span>
                </div>

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
                                <span className="text-[11px] font-mono text-white bg-[#0077d9] px-2 py-0.5 rounded-md dir-ltr font-bold">
                                  @{u.username}
                                </span>
                                {u.isAdmin && (
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
                                    <Crown className="w-3 h-3 text-slate-950" />
                                    مدیر ارشد
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                                <span className="font-mono dir-ltr">{u.email}</span>
                                <span>• عضویت: {u.joinedAt || 'عضو جدید'}</span>
                                {u.role && <span className="text-white">({u.role})</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mr-auto sm:mr-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                            <div className="text-right">
                              <span className="text-[11px] block font-bold text-slate-200">
                                وضعیت تایید محتوا:
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${
                                isDirectPublishing ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
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
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                              }`}
                              title={
                                u.autoApproveContent
                                  ? 'کلیک کنید تا تایید محتوا برای این کاربر الزامی شود'
                                  : 'کلیک کنید تا این کاربر بدون تایید محتوا را منتشر کند'
                              }
                            >
                              {u.autoApproveContent ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                  <span>بدون نیاز به تایید</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-white" />
                                  <span>نیازمند تایید</span>
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

            {/* 4. Database & Backups Tab */}
            {activeTab === 'database' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                    <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-md">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        وضعیت پایداری دیتابیس و همگام‌سازی دوگانه
                        <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">JSON + Firestore</span>
                      </h4>
                      <p className="text-xs text-slate-300">ذخیره‌سازی هم‌زمان داده‌ها روی دیسک سرور و لایه ابری</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750">
                      <span className="text-[11px] text-slate-400 block mb-1">حجم دیتابیس</span>
                      <span className="text-lg font-mono font-bold text-slate-100">{dbStats?.fileSizeFormatted || '...'}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750">
                      <span className="text-[11px] text-slate-400 block mb-1">کل پست‌ها</span>
                      <span className="text-xl font-mono font-bold text-slate-100">{dbStats?.contentsCount ?? contents.length}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750">
                      <span className="text-[11px] text-slate-400 block mb-1">بک‌آپ‌های محلی</span>
                      <span className="text-xl font-mono font-bold text-[#0077d9]">{dbStats?.backupFilesCount ?? 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750">
                      <span className="text-[11px] text-slate-400 block mb-1">حفاظت بازیابی</span>
                      <span className="text-xs font-bold text-emerald-400 block mt-1">✓ فعال</span>
                    </div>
                  </div>
                </div>

                {/* PostgreSQL Migration Card */}
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-md">
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                          پایگاه داده PostgreSQL
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            diagnosticReport?.postgres?.connected ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                          }`}>
                            {diagnosticReport?.postgres?.connected ? 'PostgreSQL فعال' : 'حالت JSON Store'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-300">همگام‌سازی و انتقال به ساختار رابطه‌ای سرور</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-200 block">
                        {diagnosticReport?.postgres?.connected ? '✓ متصل به PostgreSQL' : 'آماده اتصال به DATABASE_URL'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {diagnosticReport?.postgres?.connected
                          ? `پینگ: ${diagnosticReport.postgres.pingMs}ms`
                          : 'داده‌ها در حال حاضر از JSON Store و Cloud تامین می‌شوند.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleMigrateToPostgres}
                      disabled={isMigratingPostgres}
                      className="px-4 py-2 rounded-xl bg-[#0077d9] hover:bg-[#0062b3] text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 shrink-0"
                    >
                      <RefreshCw className={`w-4 h-4 ${isMigratingPostgres ? 'animate-spin' : ''}`} />
                      {isMigratingPostgres ? 'در حال همگام‌سازی...' : 'مهاجرت به PostgreSQL'}
                    </button>
                  </div>
                </div>

                {/* Google Drive Backup Card */}
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
                        <Cloud className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-100">
                          پشتیبان‌گیری خودکار Google Drive
                        </h4>
                        <p className="text-xs text-slate-300">ارسال فایل‌های اسنپ‌شات دیتابیس به درایو ادمین</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-200 block">
                        {driveUser ? `متصل به ${driveUser.email}` : 'عدم اتصال به گوگل درایو'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {lastDriveUploadTime ? `آخرین آپلود: ${lastDriveUploadTime}` : 'آماده اتصال'}
                      </p>
                    </div>

                    {!driveUser ? (
                      <button
                        type="button"
                        onClick={handleConnectDrive}
                        disabled={isConnectingDrive}
                        className="px-4 py-2 rounded-xl bg-[#0077d9] hover:bg-[#0062b3] text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 shrink-0"
                      >
                        <Cloud className="w-4 h-4" />
                        اتصال به Google Drive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUploadDriveNow}
                        disabled={isUploadingDrive}
                        className="px-4 py-2 rounded-xl bg-[#0077d9] hover:bg-[#0062b3] text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 shrink-0"
                      >
                        <CloudUpload className="w-4 h-4" />
                        ارسال آنی به درایو
                      </button>
                    )}
                  </div>
                </div>

                {/* Import & Export Backups */}
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 space-y-3 flex flex-col justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                          <Download className="w-4 h-4 text-[#0077d9]" />
                          دانلود نسخه کامل دیتابیس
                        </h5>
                        <p className="text-[11px] text-slate-400">فایل جامع JSON کلیه محتواها و کاربران</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        disabled={isExportingDb}
                        className="px-4 py-2 rounded-xl bg-[#0077d9] hover:bg-[#0062b3] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95 w-full"
                      >
                        <Download className="w-4 h-4" />
                        دانلود JSON
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 space-y-3 flex flex-col justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                          <Upload className="w-4 h-4 text-cyan-400" />
                          بازیابی از فایل پشتیبان
                        </h5>
                        <p className="text-[11px] text-slate-400">آپلود فایل JSON قبلی جهت بازسازی سریع</p>
                      </div>
                      <div>
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
                          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95 w-full btn-restore-json-backup"
                        >
                          <Upload className="w-4 h-4" />
                          انتخاب و آپلود JSON
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Diagnostic Tab */}
            {activeTab === 'diagnostic' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          پایش خودکار سلامت سرور و سیستم
                        </h4>
                        <p className="text-xs text-slate-300">بررسی سلامت دیتابیس، کش، CDN و سطل زباله</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunFullSystemCheck}
                      disabled={isCheckingDiagnostic}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 shrink-0"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCheckingDiagnostic ? 'animate-spin' : ''}`} />
                      اجرای چک‌آپ کامل
                    </button>
                  </div>

                  {fullDiagReport && (
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-100">امتیاز سلامت سیستم:</span>
                        <span className="text-xl font-bold font-mono text-emerald-400">
                          {fullDiagReport.healthScore ?? 100}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <h5 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-rose-400" />
                      لاگ‌های زنده سیستم ({systemLogsList.length})
                    </h5>
                    <button
                      type="button"
                      onClick={handleClearLogs}
                      disabled={systemLogsList.length === 0}
                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      پاکسازی
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 font-mono text-[11px]">
                    {systemLogsList.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 font-sans text-xs">هیچ خطایی ثبت نشده است.</div>
                    ) : (
                      systemLogsList.map((log) => (
                        <div key={log.id} className="p-2 rounded-lg bg-slate-900 border border-slate-750 text-slate-300">
                          [{log.level?.toUpperCase()}] {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                    <div className="p-2.5 rounded-xl bg-[#0077d9] text-white shadow-md">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100">
                        تنظیمات نظارت و انتشار محتوا
                      </h4>
                      <p className="text-xs text-slate-300">کنترل پیش‌فرض نحوه تایید و انتشار پست‌های کاربران</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-750 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-100 block">
                        فعال‌سازی تأیید محتوا پیش از انتشار عمومی
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        در صورت فعال بودن، پست‌های کاربران عادی پس از بررسی ادمین در سایت قرار می‌گیرند.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpdateSiteSettings({
                        ...siteSettings,
                        requireContentApproval: !siteSettings.requireContentApproval
                      })}
                      className={`p-1 text-2xl transition cursor-pointer ${
                        siteSettings.requireContentApproval ? 'text-amber-500' : 'text-slate-500'
                      }`}
                    >
                      {siteSettings.requireContentApproval ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                    </button>
                  </div>
                </div>

                {/* Composio Settings Card inside Settings Tab */}
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-slate-950 shadow-md">
                        <Instagram className="w-6 h-6 text-slate-950" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                          اتصال و تنظیمات Composio.dev اینستاگرام
                        </h4>
                        <p className="text-xs text-slate-300">مدیریت کلید API و همگام‌سازی پست‌های اکانت @esmaeelgray</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('composio')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
                    >
                      <span>مدیریت کامل Composio ←</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-200 block">کلید API پلتفرم Composio:</label>
                      <input
                        type="password"
                        value={composioApiKey}
                        onChange={(e) => setComposioApiKey(e.target.value)}
                        placeholder="Composio API Key"
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2 text-xs font-mono outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-slate-300">اکانت هدف: <span className="text-amber-400 font-mono">@esmaeelgray</span></span>
                      <button
                        type="button"
                        onClick={handleSaveComposioSettings}
                        disabled={isSavingComposio}
                        className="px-4 py-2 bg-[#0077d9] hover:bg-[#0062b3] text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        {isSavingComposio ? 'در حال ذخیره...' : 'ذخیره کلید API'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Composio Instagram Tab */}
            {activeTab === 'composio' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-750 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-lg shadow-rose-500/20 shrink-0">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                          <Instagram className="w-6 h-6 text-rose-400" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-black text-slate-100">
                            اتصال اینستاگرام به وب‌سایت با Composio.dev
                          </h4>
                          <span id="composio-status-badge" className="composio-status-badge text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            اتصال فعال
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          استخراج خودکار پُست‌ها، ویدیوها و ریلزهای اکانت <strong className="text-amber-400 dir-ltr font-mono">@esmaeelgray</strong> و انتشار مستقیم تحت پروفایل ادمین سایت
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href="https://app.composio.dev/apps/instagram"
                        target="_blank"
                        rel="noopener noreferrer"
                        id="composio-oauth-link-btn"
                        className="composio-oauth-link-btn px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95 shrink-0"
                        title="باز کردن صفحه اتصال اکانت اینستاگرام در پنل کاربری Composio"
                      >
                        <ExternalLink className="w-4 h-4 text-white" />
                        <span>ورود به پنل Composio جهت اتصال حساب ←</span>
                      </a>

                      <button
                        type="button"
                        id="composio-sync-now-btn"
                        onClick={handleRunComposioSyncNow}
                        disabled={isRunningComposioSync}
                        className="composio-sync-now-btn px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-4 h-4 text-slate-950 ${isRunningComposioSync ? 'animate-spin' : ''}`} />
                        <span>{isRunningComposioSync ? 'در حال همگام‌سازی...' : 'همگام‌سازی و انتشار فوری'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400">حساب هدف اینستاگرام</span>
                      <div className="text-sm font-bold text-amber-400 font-mono">@esmaeelgray</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400">تعداد مطالب همگام‌شده</span>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {composioStatus?.syncedCount || siteSettings.composioSyncedCount || 0} پست
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400">آخرین همگام‌سازی</span>
                      <div className="text-xs font-bold text-slate-200">
                        {composioStatus?.lastSyncAt || siteSettings.composioLastSyncAt ? new Date(composioStatus?.lastSyncAt || siteSettings.composioLastSyncAt).toLocaleTimeString('fa-IR') : 'به زودی'}
                      </div>
                    </div>
                  </div>

                  {composioSyncResult && (
                    <div className={`composio-result-box p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
                      composioSyncResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}>
                      <span>{composioSyncResult.message}</span>
                      {composioSyncResult.count !== undefined && composioSyncResult.count > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black">
                          +{composioSyncResult.count} پست جدید منتشر شد
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-slate-700/80 pb-3">
                    <Settings className="w-5 h-5 text-[#0077d9]" />
                    <h5 className="text-sm font-bold text-slate-100">تنظیمات کلید API و اتصال Composio.dev</h5>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200 block">
                        کلید API اختصاصی Composio (Composio API Key):
                      </label>
                      <input
                        type="password"
                        id="composio-api-key-input"
                        value={composioApiKey}
                        onChange={(e) => setComposioApiKey(e.target.value)}
                        placeholder="اختیاری - کلید API پلتفرم composio.dev را وارد کنید"
                        className="composio-api-key-input w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-[#0077d9] outline-none"
                      />
                      <p className="text-[11px] text-slate-400">
                        در صورت پر بودن، اکشن‌های پلتفرم Composio مستقیم فراخوانی می‌شوند. سرور از موتور چندلایه‌ای پشتیبان نیز جهت تضمین استخراج محتوای اینستاگرام استفاده می‌کند.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/80">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200 block">
                          اکانت دریافت‌کننده دایرکت متصل به پروژه (گیرنده):
                        </label>
                        <div className="flex items-center dir-ltr">
                          <span className="px-3 py-2.5 bg-slate-900 border border-r-0 border-slate-700 text-amber-400 rounded-l-xl text-xs font-mono font-bold">
                            @
                          </span>
                          <input
                            type="text"
                            id="composio-bot-account-input"
                            value={composioBotAccount}
                            onChange={(e) => setComposioBotAccount(e.target.value)}
                            placeholder="geekclub.ir__"
                            className="composio-bot-account-input w-full bg-slate-900 border border-slate-700 text-amber-400 font-bold rounded-r-xl px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-[#0077d9] outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200 block">
                          اکانت ارسال‌کننده مجاز محتوا (فرستنده دایرکت):
                        </label>
                        <div className="flex items-center dir-ltr">
                          <span className="px-3 py-2.5 bg-slate-900 border border-r-0 border-slate-700 text-rose-400 rounded-l-xl text-xs font-mono font-bold">
                            @
                          </span>
                          <input
                            type="text"
                            id="composio-sender-account-input"
                            value={composioSenderAccount}
                            onChange={(e) => setComposioSenderAccount(e.target.value)}
                            placeholder="esmaeelgray"
                            className="composio-sender-account-input w-full bg-slate-900 border border-slate-700 text-rose-400 font-bold rounded-r-xl px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-[#0077d9] outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-rose-400" />
                          پردازش و انتشار مستقیم پیام‌های دایرکت
                        </span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          هر زمان با اکانت <strong className="text-amber-400 font-mono">@{composioSenderAccount}</strong> محتوایی را به دایرکت اکانت <strong className="text-amber-400 font-mono">@{composioBotAccount}</strong> ارسال کردید، با کلیک بر روی این دکمه یا از طریق وب‌هوک لحظه‌ای، در سایت منتشر می‌شود.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="composio-sync-dms-btn"
                        onClick={handleRunComposioDMSyncNow}
                        disabled={isRunningDMSync}
                        className="composio-sync-dms-btn px-4 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRunningDMSync ? 'animate-spin' : ''}`} />
                        <span>{isRunningDMSync ? 'در حال بررسی دایرکت...' : 'استخراج دایرکت‌های جدید'}</span>
                      </button>
                    </div>

                    {/* Direct URL Input for instant DM link publishing */}
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-750 space-y-2">
                      <label className="text-xs font-bold text-slate-200 block">
                        ثبت و انتشار فوری لینک پست/ریلز ارسال‌شده در دایرکت:
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          id="composio-direct-url-input"
                          value={composioDirectUrl}
                          onChange={(e) => setComposioDirectUrl(e.target.value)}
                          placeholder="https://www.instagram.com/reel/... یا https://www.instagram.com/p/..."
                          className="composio-direct-url-input flex-1 w-full bg-slate-950 border border-slate-700 text-amber-300 rounded-xl px-3.5 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-[#0077d9]"
                        />
                        <button
                          type="button"
                          id="composio-publish-direct-btn"
                          onClick={handlePublishDirectUrl}
                          disabled={isPublishingDirect || !composioDirectUrl.trim()}
                          className="composio-publish-direct-btn px-4 py-2 bg-[#0077d9] hover:bg-[#0062b3] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5 text-white" />
                          <span>{isPublishingDirect ? 'در حال انتشار...' : 'انتشار مستقیم در سایت'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-750 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">
                          فعال‌سازی همگام‌سازی خودکار و پس‌زمینه
                        </span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          بررسی دوره‌ای سرور برای استخراج و انتشار پست‌های جدید اکانت @{composioSenderAccount} به محض ارسال دایرکت
                        </p>
                      </div>

                      <button
                        type="button"
                        id="composio-sync-toggle"
                        onClick={() => setComposioAutoSync(!composioAutoSync)}
                        className={`composio-sync-toggle p-1 text-2xl transition cursor-pointer ${
                          composioAutoSync ? 'text-amber-500' : 'text-slate-500'
                        }`}
                      >
                        {composioAutoSync ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                      </button>
                    </div>

                    {/* Webhook Configuration & Auto-Registration Card */}
                    <div id="composio-webhook-card" className="composio-webhook-card p-5 rounded-xl bg-slate-950/90 border border-slate-750 space-y-3.5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h6 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                              <Zap className="w-4 h-4 text-amber-400" />
                              آدرس وب‌هوک اختصاصی دریافت پیام‌های دایرکت (Webhook Callback URL)
                            </h6>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            ارسال لحظه‌ای رویدادهای دایرکت از Composio به سرور سایت جهت انتشار فوری
                          </p>
                        </div>

                        <button
                          type="button"
                          id="composio-register-webhook-btn"
                          onClick={handleRegisterComposioWebhook}
                          disabled={isRegisteringWebhook}
                          className="composio-register-webhook-btn px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow transition active:scale-95 cursor-pointer shrink-0"
                          title="ثبت خودکار وب‌هوک در API پلتفرم Composio"
                        >
                          <Zap className={`w-3.5 h-3.5 text-white ${isRegisteringWebhook ? 'animate-bounce' : ''}`} />
                          <span>{isRegisteringWebhook ? 'در حال ثبت در API...' : 'ثبت و فعال‌سازی خودکار وب‌هوک'}</span>
                        </button>
                      </div>

                      <div id="composio-callback-url-box" className="composio-callback-url-box flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <code className="text-xs font-mono text-emerald-400 font-bold dir-ltr break-all px-2">
                          https://geekclub.ir/api/composio/webhook
                        </code>

                        <button
                          type="button"
                          id="composio-copy-webhook-url-btn"
                          onClick={() => {
                            navigator.clipboard.writeText('https://geekclub.ir/api/composio/webhook');
                            setCopiedWebhookUrl(true);
                            setTimeout(() => setCopiedWebhookUrl(false), 2000);
                          }}
                          className="composio-copy-webhook-url-btn px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
                        >
                          {copiedWebhookUrl ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-300" />
                              <span>کپی آدرس وب‌هوک</span>
                            </>
                          )}
                        </button>
                      </div>

                      {webhookRegisterMsg && (
                        <div className={`p-3 rounded-xl border text-xs font-bold ${
                          webhookRegisterMsg.success
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        }`}>
                          {webhookRegisterMsg.text}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                        <p>💡 <strong>راهنمای ثبت دستی در داشبورد Composio:</strong></p>
                        <ol className="list-decimal list-inside space-y-0.5 text-slate-300 pr-1">
                          <li>وارد داشبورد Composio شده و به بخش <strong>Triggers</strong> بروید.</li>
                          <li>اپلیکیشن <strong>Instagram</strong> و اکانت متصل <strong className="text-amber-400 font-mono">@{composioBotAccount}</strong> را انتخاب کنید.</li>
                          <li>تریگر <strong>New Direct Message</strong> را انتخاب کرده و آدرس <strong>Webhook URL</strong> فوق را جای‌گذاری کنید.</li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        id="composio-connect-btn"
                        onClick={handleSaveComposioSettings}
                        disabled={isSavingComposio}
                        className="composio-connect-btn px-5 py-2.5 bg-[#0077d9] hover:bg-[#0062b3] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-white" />
                        <span>{isSavingComposio ? 'در حال ذخیره...' : 'ذخیره تنظیمات Composio'}</span>
                      </button>

                      {composioSaveMsg && (
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                          composioSaveMsg.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {composioSaveMsg.text}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>پیام‌های دریافتی ({feedbackList.length})</span>
                  <select
                    value={feedbackStatusFilter}
                    onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="pending">در انتظار بررسی</option>
                    <option value="reviewed">بررسی‌شده</option>
                    <option value="resolved">حل‌شده</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {filteredFeedback.length === 0 ? (
                    <div className="text-center py-12 text-slate-300 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md text-xs font-medium">
                      هیچ پیامی ثبت نشده است.
                    </div>
                  ) : (
                    filteredFeedback.map((fb) => (
                      <div key={fb.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-slate-100">{fb.title}</h5>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0077d9] text-white">
                                {fb.type === 'suggestion' ? 'پیشنهاد' : fb.type === 'critique' ? 'انتقاد' : 'گزارش'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1">
                              ارسال از: {fb.senderName} • {fb.createdAt}
                            </div>
                          </div>
                        </div>
                        <p className="p-3 rounded-xl bg-slate-900/80 border border-slate-750 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                          {fb.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 8. Broadcast Tab */}
            {activeTab === 'broadcast' && (
              <div className="max-w-xl mx-auto space-y-4">
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md text-xs text-slate-300 leading-relaxed">
                  این پیام به عنوان اعلان رسمی مدیریت مستقیماً در این‌باکس کاربران قرار خواهد گرفت.
                </div>

                {broadcastSent ? (
                  <div className="p-8 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h4 className="font-bold text-slate-100 text-sm">پیام با موفقیت ارسال شد!</h4>
                  </div>
                ) : (
                  <form onSubmit={handleSendBroadcast} className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5">موضوع پیام *</label>
                      <input
                        type="text"
                        required
                        value={msgSubject}
                        onChange={(e) => setMsgSubject(e.target.value)}
                        placeholder="عنوان پیام..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5">متن پیام *</label>
                      <textarea
                        rows={5}
                        required
                        value={msgContent}
                        onChange={(e) => setMsgContent(e.target.value)}
                        placeholder="متن پیام رسمی..."
                        className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#0077d9] hover:bg-[#0062b3] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      ارسال اعلان به کاربران
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

export default AdminPanelModal;