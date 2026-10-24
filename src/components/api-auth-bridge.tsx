import { useEffect } from 'react';
import { useAuth0 } from 'react-native-auth0';

import { setAccessTokenProvider } from '@/data/api-client';

/**
 * Hands the API client a way to get the current access token. Renders nothing; it only has
 * to live inside Auth0Provider.
 */
export function ApiAuthBridge() {
  const { user, getCredentials } = useAuth0();

  useEffect(() => {
    setAccessTokenProvider(async () => {
      if (!user) return null;
      try {
        // Refreshes the access token first if it has expired.
        const credentials = await getCredentials();
        return credentials.accessToken;
      } catch (e) {
        console.warn('Couldn’t get an access token; sending the request anonymously:', e);
        return null;
      }
    });
  }, [user, getCredentials]);

  return null;
}
