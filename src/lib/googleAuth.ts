/**
 * Direct Google OAuth 2.0 & Google Identity Services Authentication (Firebase-Free)
 * Connects directly to Google Cloud Console (accounts.google.com) bypassing Firebase APIs.
 */

import firebaseConfig from '../../firebase-applet-config.json';

// Official public Google OAuth Client ID for this project
const DEFAULT_GOOGLE_CLIENT_ID = firebaseConfig.oAuthClientId || '843845722817-q1jfaeo8tiuv7gaqec5ligdmrkdi7678.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: any;
    googleOneTapCallback?: (response: any) => void;
  }
}

/**
 * Load Google Identity Services script (accounts.google.com/gsi/client) dynamically
 */
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    document.head.appendChild(script);
  });
}

/**
 * Direct Google Login via OAuth 2.0 Popup Window (accounts.google.com)
 * Uses standard Google OAuth 2.0 Endpoint without Firebase SDK.
 */
export async function loginWithDirectGoogleOAuth(clientId?: string): Promise<{
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}> {
  await loadGoogleGsiScript();

  return new Promise((resolve, reject) => {
    try {
      const googleClientId = clientId || DEFAULT_GOOGLE_CLIENT_ID;

      // 1. Try Token Client with popup
      if (window.google?.accounts?.oauth2) {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                // Verify access token directly against Google UserInfo API
                const verifyRes = await fetch('/api/auth/google-verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken: tokenResponse.access_token })
                });

                if (verifyRes.ok) {
                  const verifiedData = await verifyRes.json();
                  if (verifiedData.success && verifiedData.user) {
                    resolve(verifiedData.user);
                    return;
                  }
                }

                // Direct client-side fetch from googleapis if backend proxy is offline
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                
                if (userInfoRes.ok) {
                  const userInfo = await userInfoRes.json();
                  resolve({
                    uid: userInfo.sub || `google-${Date.now()}`,
                    displayName: userInfo.name || userInfo.given_name || 'کاربر گوگل',
                    email: userInfo.email || '',
                    photoURL: userInfo.picture || ''
                  });
                  return;
                }
              } catch (err) {
                console.error('Error fetching Google userinfo:', err);
              }
            }
            reject(new Error('دریافت توکن از گوگل ناموفق بود.'));
          },
          error_callback: (err: any) => {
            console.error('Google OAuth Popup Error:', err);
            reject(err);
          }
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } else {
        reject(new Error('Google Identity Services client is not initialized.'));
      }
    } catch (err) {
      reject(err);
    }
  });
}
