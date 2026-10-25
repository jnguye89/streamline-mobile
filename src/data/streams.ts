/**
 * Going live through the Streamline API — mirrors streamline-ui's StreamService. The phone
 * broadcasts over Agora; recording and restreams to other platforms run server-side.
 */

import { apiFetch } from '@/data/api-client';

export type RestreamPlatform = 'twitch' | 'youtube' | 'kick';

/** Restream targets offered when going live, as on streamline-ui's stream page. */
export const RestreamTargets: { platform: RestreamPlatform; label: string; needsUrl: boolean }[] = [
  { platform: 'twitch', label: 'Twitch', needsUrl: false },
  { platform: 'youtube', label: 'YouTube', needsUrl: false },
  { platform: 'kick', label: 'Kick', needsUrl: true },
];

export type RestreamStatus = 'starting' | 'active' | 'stopped' | 'error';

export type BroadcastToken = {
  appId: string;
  rtcToken: string;
  agoraUid: number;
};

async function call<T>(path: string, method: 'GET' | 'POST' | 'PUT', body?: object): Promise<T> {
  const res = await apiFetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status}): ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Registers the channel as this user's stream and returns a publisher token for it. */
export async function prepareStream(channelName: string): Promise<BroadcastToken> {
  const token = await call<Partial<BroadcastToken>>('/stream/ensure', 'POST', { channelName });
  if (!token.appId || !token.rtcToken || !token.agoraUid) {
    throw new Error('The stream token response was incomplete');
  }
  return token as BroadcastToken;
}

/** Marks the stream live (starting recording and any restreams). */
export async function publishStream(channelName: string, multistream: RestreamPlatform[]) {
  return call<{ multistream?: { platform: RestreamPlatform; status: RestreamStatus; error?: string }[] }>(
    '/stream/publish',
    'PUT',
    { channelName, multistream }
  );
}

/** Keeps the stream listed as live; the API drops it ~15s after the last heartbeat. */
export async function sendHeartbeat(channelName: string) {
  await call('/stream/heartbeat', 'POST', { channelName });
}

/** Ends the stream. Returns the recording's file name when cloud recording is on. */
export async function unpublishStream(channelName: string) {
  return call<{ filename?: string }>('/stream/unpublish', 'PUT', { channelName });
}

/** Starts processing a finished stream's recording into a video on the profile. */
export async function processRecording(fileName: string) {
  await call('/stream/process', 'POST', { fileName });
}

/** Platforms the user has saved a stream key for (Kick also needs a URL). */
export async function getRestreamPlatforms(): Promise<RestreamPlatform[]> {
  const keys = await call<{ platform: string; streamKey?: string; streamUrl?: string }[]>(
    '/user/stream-keys',
    'GET'
  );
  return RestreamTargets.filter((target) =>
    keys.some(
      (key) =>
        key.platform === target.platform &&
        !!key.streamKey?.trim() &&
        (!target.needsUrl || !!key.streamUrl?.trim())
    )
  ).map((target) => target.platform);
}
