import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// In-memory token storage for Google Drive OAuth Access Token (strictly in memory)
let inMemoryDriveAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Get Google Auth Provider configured with Google Drive scope
 */
export function getGoogleDriveProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}

/**
 * Sign in user with Google Auth Popup requesting Google Drive permissions
 */
export async function signInWithGoogleDrive(): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const provider = getGoogleDriveProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('عدم دریافت توکن دسترسی از گوگل. لطفاً مجدداً وارد شوید.');
    }

    inMemoryDriveAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: credential.accessToken
    };
  } catch (error: any) {
    console.error('Google Drive Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Get cached in-memory access token or null
 */
export function getDriveAccessToken(): string | null {
  return inMemoryDriveAccessToken;
}

/**
 * Clear cached in-memory access token
 */
export function clearDriveAccessToken(): void {
  inMemoryDriveAccessToken = null;
}

/**
 * Listen to Firebase auth changes and clear token on logout
 */
export function initDriveAuthListener(
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (user && inMemoryDriveAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, inMemoryDriveAccessToken);
    } else {
      if (!isSigningIn) {
        inMemoryDriveAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
}

/**
 * Upload a JSON snapshot of the database directly to the user's Google Drive
 */
export async function uploadBackupToGoogleDrive(
  accessToken: string,
  backupData: object,
  customFilename?: string
): Promise<{ success: boolean; fileId?: string; fileName?: string; webViewLink?: string; error?: string }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = customFilename || `geekclub_db_backup_12h_${timestamp}.json`;

    const metadata = {
      name: filename,
      mimeType: 'application/json',
      description: 'نسخه پشتیبان ۱۲ ساعته دیتابیس گیک‌کلاب (GeekClub Database Backup)'
    };

    const fileData = JSON.stringify(backupData, null, 2);

    const boundary = '-------GeekClubBackupBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      fileData +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `خطا در سرور گوگل درایو: HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      fileId: result.id,
      fileName: result.name,
      webViewLink: result.webViewLink
    };
  } catch (err: any) {
    console.error('Google Drive Upload Failed:', err);
    return {
      success: false,
      error: err.message || 'خطا در ارسال فایل پشتیبان به گوگل درایو'
    };
  }
}
