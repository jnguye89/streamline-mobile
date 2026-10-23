/**
 * Live stream client for the Streamline API — mirrors streamline-ui's StreamService and
 * AgoraWatchService. Streams are broadcast over Agora; viewers join the channel as audience.
 */

import { ApiBaseUrl } from '@/constants/api';

/** Raw record returned by `GET /stream/agora` (the API's AgoraStream entity). */
type AgoraStreamDto = {
  id: number;
  channelName: string;
  user?: { username?: string | null } | null;
};

export type LiveStream = {
  id: number;
  channelName: string;
  username: string | null;
};

export type ViewerToken = {
  appId: string;
  rtcToken: string;
};

/** Streams that are live right now (the API only returns ones with a recent heartbeat). */
export async function getLiveStreams(): Promise<LiveStream[]> {
  const res = await fetch(`${ApiBaseUrl}/stream/agora`);
  if (!res.ok) throw new Error(`GET /stream/agora failed with ${res.status}`);

  const streams: AgoraStreamDto[] = await res.json();
  return streams
    .map((s) => ({ id: s.id, channelName: s.channelName, username: s.user?.username ?? null }))
    .sort((a, b) => a.id - b.id);
}

/** Anonymous audience token for one channel. */
export async function getViewerToken(channel: string): Promise<ViewerToken> {
  const res = await fetch(`${ApiBaseUrl}/call/agora/viewer-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  });
  if (!res.ok) throw new Error(`POST /call/agora/viewer-token failed with ${res.status}`);
  return res.json();
}
