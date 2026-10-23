/**
 * Video-on-demand client for the Streamline API — mirrors streamline-ui's VideoService.
 */

import { ApiBaseUrl } from '@/constants/api';

/** Raw record returned by `GET /video` (the API's VideoDto). */
type VideoDto = {
  id?: number;
  user: string | null;
  videoPath: string;
  processedPath?: string | null;
  title?: string | null;
  thumbnailUrl?: string | null;
  viewCount?: number;
  likeCount?: number;
  liked?: boolean;
  source?: string;
  externalId?: string;
};

export type Vod = {
  id: number;
  title: string;
  user: string | null;
  src: string;
  thumbnail?: string;
  isProcessed: boolean;
  viewCount: number;
  likeCount: number;
  liked: boolean;
};

// YouTube entries only carry an iframe embed URL, which the native player can't play.
const YOUTUBE_SOURCE = 'YOUTUBE';

function toVod(v: VideoDto): Vod | null {
  if (v.id === undefined || v.source === YOUTUBE_SOURCE) return null;
  const src = v.processedPath ?? v.videoPath;
  if (!src) return null;

  return {
    id: v.id,
    title: v.title ?? 'Video',
    user: v.user,
    src,
    thumbnail: v.thumbnailUrl ?? undefined,
    isProcessed: !!v.processedPath,
    viewCount: v.viewCount ?? 0,
    likeCount: v.likeCount ?? 0,
    liked: v.liked ?? false,
  };
}

/** One page of the server-randomized, no-repeat VOD feed. */
export async function getVideos(limit?: number): Promise<Vod[]> {
  const query = limit ? `?limit=${limit}` : '';
  const res = await fetch(`${ApiBaseUrl}/video${query}`);
  if (!res.ok) throw new Error(`GET /video failed with ${res.status}`);

  const videos: VideoDto[] = await res.json();
  return videos.map(toVod).filter((v): v is Vod => v !== null);
}

export async function addView(id: number): Promise<void> {
  await fetch(`${ApiBaseUrl}/video/${id}/view`, { method: 'POST' });
}

export async function addLike(id: number): Promise<void> {
  await fetch(`${ApiBaseUrl}/video/${id}/like`, { method: 'POST' });
}
