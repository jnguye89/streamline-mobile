/**
 * fetch() for the Streamline API that attaches the signed-in user's access token when there
 * is one — the mobile counterpart of streamline-ui's OptionalAuthInterceptor. Endpoints that
 * work anonymously (the feed, likes, views) personalize their response or record per-user
 * state when a token comes along.
 */

import { ApiBaseUrl } from '@/constants/api';

type AccessTokenProvider = () => Promise<string | null>;

let getAccessToken: AccessTokenProvider = async () => null;

/** Registered by ApiAuthBridge, which has access to the Auth0 session. */
export function setAccessTokenProvider(provider: AccessTokenProvider) {
  getAccessToken = provider;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${ApiBaseUrl}${path}`, { ...init, headers });
}
