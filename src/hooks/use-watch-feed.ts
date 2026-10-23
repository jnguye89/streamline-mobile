import { useCallback, useEffect, useReducer, useRef } from 'react';

import { getLiveStreams, type LiveStream } from '@/data/live-streams';
import { getVideos, type Vod } from '@/data/videos';

const PAGE_SIZE = 20;
// Fetch the next page once the viewer is this close to the end of what's loaded.
const PREFETCH_THRESHOLD = 5;
// Same cadence as streamline-ui; the API drops a stream 15s after its last heartbeat.
const LIVE_POLL_MS = 15_000;

export type FeedItem = { type: 'vod'; video: Vod } | { type: 'live'; stream: LiveStream };

type FeedStatus = 'loading' | 'ready' | 'empty' | 'error';

/** Stable identity across polls and pages; VOD and live ids come from different tables. */
export function feedItemKey(item: FeedItem): string {
  return item.type === 'vod' ? `vod:${item.video.id}` : `live:${item.stream.id}`;
}

type State = {
  items: FeedItem[];
  index: number;
  vodState: 'loading' | 'loaded' | 'error';
  // The feed is held back until the first VOD page and the first live check have both come
  // back, so a stream that's already live can be the first thing on screen.
  pendingVods: Vod[] | null;
  pendingLives: LiveStream[] | null;
  started: boolean;
};

type Action =
  | { type: 'vodsLoaded'; vods: Vod[] }
  | { type: 'vodsFailed' }
  | { type: 'vodsRetry' }
  | { type: 'livesPolled'; lives: LiveStream[] }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'updateCurrentVod'; patch: Partial<Vod> };

const initialState: State = {
  items: [],
  index: 0,
  vodState: 'loading',
  pendingVods: null,
  pendingLives: null,
  started: false,
};

const vodItem = (video: Vod): FeedItem => ({ type: 'vod', video });
const liveItem = (stream: LiveStream): FeedItem => ({ type: 'live', stream });

function maybeStart(state: State): State {
  if (state.started || state.vodState === 'loading' || state.pendingLives === null) return state;
  return {
    ...state,
    started: true,
    items: [...state.pendingLives.map(liveItem), ...(state.pendingVods ?? []).map(vodItem)],
    index: 0,
    pendingVods: null,
    pendingLives: null,
  };
}

/**
 * Drops streams that have ended and slots newly live ones in right after the current item,
 * so the very next swipe lands on them.
 */
function mergeLives(state: State, lives: LiveStream[]): State {
  const liveKeys = new Set(lives.map((s) => feedItemKey(liveItem(s))));
  const isEnded = (item: FeedItem) => item.type === 'live' && !liveKeys.has(feedItemKey(item));

  // Removing items before the current one shifts it back. If the current item is the one
  // that ended, whatever follows it slides into its place.
  const removedBefore = state.items.slice(0, state.index).filter(isEnded).length;
  const kept = state.items.filter((item) => !isEnded(item));
  let index = Math.max(0, state.index - removedBefore);
  if (index >= kept.length) index = 0;

  const present = new Set(kept.map(feedItemKey));
  const fresh = lives.filter((s) => !present.has(feedItemKey(liveItem(s)))).map(liveItem);
  if (fresh.length === 0 && kept.length === state.items.length) return state;

  const insertAt = kept.length ? index + 1 : 0;
  return {
    ...state,
    items: [...kept.slice(0, insertAt), ...fresh, ...kept.slice(insertAt)],
    index,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'vodsLoaded': {
      if (!state.started) {
        return maybeStart({
          ...state,
          vodState: 'loaded',
          pendingVods: [...(state.pendingVods ?? []), ...action.vods],
        });
      }
      return { ...state, vodState: 'loaded', items: [...state.items, ...action.vods.map(vodItem)] };
    }
    case 'vodsFailed':
      return maybeStart({ ...state, vodState: state.vodState === 'loaded' ? 'loaded' : 'error' });
    case 'vodsRetry':
      return { ...state, vodState: state.vodState === 'error' ? 'loading' : state.vodState };
    case 'livesPolled':
      if (!state.started) return maybeStart({ ...state, pendingLives: action.lives });
      return mergeLives(state, action.lives);
    case 'next':
      if (!state.items.length) return state;
      return { ...state, index: (state.index + 1) % state.items.length };
    case 'previous':
      return { ...state, index: Math.max(0, state.index - 1) };
    case 'updateCurrentVod': {
      const current = state.items[state.index];
      if (current?.type !== 'vod') return state;
      const items = state.items.slice();
      items[state.index] = vodItem({ ...current.video, ...action.patch });
      return { ...state, items };
    }
  }
}

/**
 * Endlessly-advancing watch feed of live streams and paged VODs — the mobile counterpart of
 * streamline-ui's WatchComponent playlist (live$ + loadMoreVods / next / previous).
 */
export function useWatchFeed() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { items, index } = state;

  const loading = useRef(false);
  const exhausted = useRef(false);
  const seenVodIds = useRef(new Set<number>());

  const loadMore = useCallback(async () => {
    if (loading.current || exhausted.current) return;
    loading.current = true;
    try {
      const page = await getVideos(PAGE_SIZE);
      const fresh = page.filter((v) => !seenVodIds.current.has(v.id));
      // The feed is server-randomized and recycles once it runs dry, so a page with
      // nothing new means everything has been loaded.
      if (fresh.length === 0) exhausted.current = true;
      fresh.forEach((v) => seenVodIds.current.add(v.id));
      dispatch({ type: 'vodsLoaded', vods: fresh });
    } catch (e) {
      console.warn('Failed to load videos:', e);
      dispatch({ type: 'vodsFailed' });
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    let cancelled = false;
    let checkedOnce = false;
    const poll = async () => {
      try {
        const lives = await getLiveStreams();
        if (!cancelled) dispatch({ type: 'livesPolled', lives });
      } catch (e) {
        console.warn('Failed to check for live streams:', e);
        // Don't hold the first screen hostage to the live check, but don't treat a blip
        // later on as every stream having ended either.
        if (!cancelled && !checkedOnce) dispatch({ type: 'livesPolled', lives: [] });
      }
      checkedOnce = true;
    };
    void poll();
    const timer = setInterval(poll, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const next = useCallback(() => {
    if (index >= items.length - PREFETCH_THRESHOLD) void loadMore();
    dispatch({ type: 'next' });
  }, [index, items.length, loadMore]);

  const previous = useCallback(() => dispatch({ type: 'previous' }), []);

  const retry = useCallback(() => {
    exhausted.current = false;
    dispatch({ type: 'vodsRetry' });
    void loadMore();
  }, [loadMore]);

  const updateCurrentVod = useCallback(
    (patch: Partial<Vod>) => dispatch({ type: 'updateCurrentVod', patch }),
    []
  );

  const status: FeedStatus = items.length
    ? 'ready'
    : !state.started || state.vodState === 'loading'
      ? 'loading'
      : state.vodState === 'error'
        ? 'error'
        : 'empty';

  return {
    status,
    current: items[index] ?? null,
    // The neighbors on either side, mounted ahead of time so a swipe can reveal them.
    previousItem: index > 0 ? items[index - 1] : null,
    nextItem: items.length > 1 ? items[(index + 1) % items.length] : null,
    next,
    previous,
    retry,
    updateCurrentVod,
  };
}
