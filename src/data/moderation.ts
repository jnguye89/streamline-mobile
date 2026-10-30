/**
 * Reporting, blocking and the terms of use — what the App Store requires of apps with user
 * videos and live streams. All of it needs a signed-in user.
 */

import { apiFetch } from '@/data/api-client';

export const ReportReasons = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'sexual', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence or dangerous acts' },
  { value: 'harassment', label: 'Harassment or hate' },
  { value: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof ReportReasons)[number]['value'];

/** A video or a live stream (by its Agora channel). */
export type ReportTarget = { videoId: number } | { channelName: string };

export type BlockedUser = { auth0UserId: string; username: string; picture: string | null };

async function ensureOk(res: Response, what: string) {
  if (!res.ok) throw new Error(`${what} failed (${res.status}): ${await res.text()}`);
}

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function report(target: ReportTarget, reason: ReportReason): Promise<void> {
  await ensureOk(
    await apiFetch('/report', { method: 'POST', ...json({ ...target, reason }) }),
    'Report'
  );
}

export async function blockUser(userId: string): Promise<void> {
  await ensureOk(
    await apiFetch(`/blocks/${encodeURIComponent(userId)}`, { method: 'POST' }),
    'Block'
  );
}

export async function unblockUser(userId: string): Promise<void> {
  await ensureOk(
    await apiFetch(`/blocks/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
    'Unblock'
  );
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const res = await apiFetch('/blocks');
  await ensureOk(res, 'GET /blocks');
  return res.json();
}

/** Whether the signed-in user has agreed to the terms of use yet. */
export async function hasAcceptedTerms(): Promise<boolean> {
  const res = await apiFetch('/user/me');
  await ensureOk(res, 'GET /user/me');
  const me: { termsAcceptedAt?: string | null } = await res.json();
  return !!me.termsAcceptedAt;
}

export async function acceptTerms(): Promise<void> {
  await ensureOk(await apiFetch('/user/me/terms', { method: 'POST' }), 'Accepting the terms');
}
