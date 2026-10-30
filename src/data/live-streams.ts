/**
 * Live stream client for the Streamline API — mirrors streamline-ui's StreamService and
 * AgoraWatchService. Streams are broadcast over Agora; viewers join the channel as audience.
 */

import { apiFetch } from '@/data/api-client';

/** Raw record returned by `GET /stream/agora` (the API's AgoraStream entity). */
type AgoraStreamDto = {
  id: number;
  channelName: string;
  user?: { auth0UserId?: string; username?: string | null } | null;
};

export type LiveStream = {
  id: number;
  channelName: string;
  /** The host's Auth0 user id. */
  userId: string | null;
  username: string | null;
};

export type ViewerToken = {
  appId: string;
  rtcToken: string;
};

/** Streams that are live right now (the API only returns ones with a recent heartbeat). */
export async function getLiveStreams(): Promise<LiveStream[]> {
  const res = await apiFetch(`/stream/agora`);
  if (!res.ok) throw new Error(`GET /stream/agora failed with ${res.status}`);

  const streams: AgoraStreamDto[] = await res.json();
  return streams
    .map((s) => ({
      id: s.id,
      channelName: s.channelName,
      userId: s.user?.auth0UserId ?? null,
      username: s.user?.username ?? null,
    }))
    .sort((a, b) => a.id - b.id);
}

/** Anonymous audience token for one channel. */
export async function getViewerToken(channel: string): Promise<ViewerToken> {
  const res = await apiFetch(`/call/agora/viewer-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  });
  if (!res.ok) throw new Error(`POST /call/agora/viewer-token failed with ${res.status}`);
  return res.json();
}
