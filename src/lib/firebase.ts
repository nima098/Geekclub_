import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(firebaseApp);
export const db = null as any;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Perform real Google Authentication via Google Sign-In Popup.
 * Returns the authenticated user data verified by Google.
 */
export async function loginWithGooglePopup(): Promise<{
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const rawPhoto = user.photoURL || '';
    const safePhoto = rawPhoto && (rawPhoto.includes('googleusercontent.com') || rawPhoto.includes('ggpht.com'))
      ? `/api/proxy-image?url=${encodeURIComponent(rawPhoto)}`
      : rawPhoto || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%233b82f6"/><text x="50" y="63" font-family="Tahoma,sans-serif" font-size="42" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">گ</text></svg>`;

    return {
      uid: user.uid,
      displayName: user.displayName || 'کاربر گوگل',
      email: user.email || '',
      photoURL: safePhoto
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out the current user from Firebase Auth
 */
export async function logoutGoogle(): Promise<void> {
  await signOut(auth);
}

/**
 * Listen to real Firebase auth state changes
 */
export function onGoogleAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
