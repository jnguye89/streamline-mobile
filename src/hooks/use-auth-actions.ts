import { Alert, Platform } from 'react-native';
import { useAuth0, WebAuthError, WebAuthErrorCodes } from 'react-native-auth0';

import { Auth0Audience, Auth0ClientId, Auth0Scheme } from '@/constants/auth';

// offline_access gets a refresh token, so people stay signed in between launches.
const SCOPE = 'openid profile email offline_access';

/** Log in (Auth0 Universal Login, which has its own sign-up link) and log out. */
export function useAuthActions() {
  const { authorize, clearSession, clearCredentials } = useAuth0();

  const signIn = async () => {
    if (!Auth0ClientId) {
      Alert.alert('Sign-in isn’t set up yet', 'EXPO_PUBLIC_AUTH0_CLIENT_ID is missing from this build.');
      return;
    }
    try {
      await authorize(
        { audience: Auth0Audience, scope: SCOPE },
        // A private browser session skips iOS's "Wants to Use … to Sign In" prompt. It doesn't
        // share Safari's cookies, but the refresh token keeps people signed in anyway.
        { customScheme: Auth0Scheme, ephemeralSession: true }
      );
    } catch (e) {
      showAuthError(e);
    }
  };

  const signOut = async () => {
    try {
      // iOS logins use a private session with no browser cookies, so dropping the stored
      // credentials is a full logout — and opening the browser would bring the prompt back.
      // Android has no private session: its Custom Tab keeps the Auth0 cookie, which has to be
      // cleared or the next login silently signs the same account back in.
      if (Platform.OS === 'ios') await clearCredentials();
      else await clearSession({}, { customScheme: Auth0Scheme });
    } catch (e) {
      showAuthError(e);
    }
  };

  return { signIn, signOut };
}

function showAuthError(e: unknown) {
  // Closing the login sheet isn't an error worth telling anyone about.
  if (e instanceof WebAuthError && e.type === WebAuthErrorCodes.USER_CANCELLED) return;
  console.warn('Auth0 error:', e);
  Alert.alert('Couldn’t sign in', e instanceof Error ? e.message : 'Please try again.');
}
