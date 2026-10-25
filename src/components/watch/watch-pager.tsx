import { useLayoutEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { LivePage } from '@/components/watch/live-page';
import { VodPage } from '@/components/watch/vod-page';
import type { Vod } from '@/data/videos';
import { type FeedItem, feedItemKey } from '@/hooks/use-watch-feed';

// Stop auto-skipping broken videos after this many in a row, so a dead network or a
// feed of expired links doesn't spin through the playlist forever.
const MAX_CONSECUTIVE_ERRORS = 3;
// A drag past this fraction of the screen, or a flick faster than this, changes video.
const SWIPE_DISTANCE_RATIO = 0.25;
const SWIPE_VELOCITY = 800;
// Dragging toward a side with no video only moves this fraction of the finger's distance.
const EDGE_RESISTANCE = 0.25;
const SETTLE_MS = 220;
// Keep swipes clear of the progress bar along the bottom edge (see VideoControls).
const SCRUBBER_CLEARANCE = 100;

type WatchPagerProps = {
  current: FeedItem;
  previousItem: FeedItem | null;
  nextItem: FeedItem | null;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateVod: (patch: Partial<Vod>) => void;
  /** False while another screen (e.g. the profile) covers the feed: nothing plays. */
  focused: boolean;
};

/**
 * Horizontally swipeable feed: the current item sits between its neighbors, which follow
 * the finger in from the side. Neighboring videos are already loaded by the time they're on
 * screen; live streams only join their channel once they're current.
 */
export function WatchPager({
  current,
  previousItem,
  nextItem,
  onNext,
  onPrevious,
  onUpdateVod,
  focused,
}: WatchPagerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const consecutiveErrors = useRef(0);

  const currentKey = feedItemKey(current);
  const nextKey = nextItem && feedItemKey(nextItem);
  const hasNext = nextItem !== null && nextKey !== currentKey;
  // With two items, "next" wraps around to the previous one — it can only sit on one side.
  const hasPrevious = previousItem !== null && feedItemKey(previousItem) !== nextKey;

  // Each page is keyed by item, so when a neighbor becomes current it keeps its player
  // (and whatever it has buffered). Recenter in the same commit that moves it into the middle.
  useLayoutEffect(() => {
    offset.set(0);
  }, [currentKey, offset]);

  const goNext = () => {
    if (!hasNext) return;
    offset.set(withTiming(-width, { duration: SETTLE_MS }, (finished) => {
      if (finished) scheduleOnRN(onNext);
    }));
  };

  const pan = usePanGesture({
    activeOffsetX: [-15, 15],
    failOffsetY: [-20, 20],
    hitSlop: { bottom: -(insets.bottom + SCRUBBER_CLEARANCE) },
    onUpdate: (e) => {
      'worklet';
      const resisted = (e.translationX < 0 && !hasNext) || (e.translationX > 0 && !hasPrevious);
      offset.set(resisted ? e.translationX * EDGE_RESISTANCE : e.translationX);
    },
    onDeactivate: (e) => {
      'worklet';
      const threshold = width * SWIPE_DISTANCE_RATIO;
      if (hasNext && (e.translationX < -threshold || e.velocityX < -SWIPE_VELOCITY)) {
        offset.set(withTiming(-width, { duration: SETTLE_MS }, (finished) => {
          if (finished) scheduleOnRN(onNext);
        }));
      } else if (hasPrevious && (e.translationX > threshold || e.velocityX > SWIPE_VELOCITY)) {
        offset.set(withTiming(width, { duration: SETTLE_MS }, (finished) => {
          if (finished) scheduleOnRN(onPrevious);
        }));
      } else {
        offset.set(withSpring(0, { duration: SETTLE_MS }));
      }
    },
  });

  const onError = () => {
    consecutiveErrors.current += 1;
    if (consecutiveErrors.current < MAX_CONSECUTIVE_ERRORS) goNext();
  };

  const onPlaying = () => {
    consecutiveErrors.current = 0;
  };

  const pages: { item: FeedItem; slot: number }[] = [
    ...(hasPrevious ? [{ item: previousItem, slot: -1 }] : []),
    { item: current, slot: 0 },
    ...(hasNext ? [{ item: nextItem, slot: 1 }] : []),
  ];

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          {pages.map(({ item, slot }) => (
            <Slot key={feedItemKey(item)} slot={slot} width={width} offset={offset}>
              {item.type === 'vod' ? (
                <VodPage
                  video={item.video}
                  active={slot === 0 && focused}
                  onEnded={hasNext ? goNext : undefined}
                  onError={onError}
                  onPlaying={onPlaying}
                  onUpdate={onUpdateVod}
                />
              ) : (
                <LivePage stream={item.stream} active={slot === 0 && focused} onError={onError} />
              )}
            </Slot>
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

type SlotProps = {
  slot: number;
  width: number;
  offset: SharedValue<number>;
  children: React.ReactNode;
};

/** Positions a page one screen-width per slot away from center, shifted by the drag. */
function Slot({ slot, width, offset, children }: SlotProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: slot * width + offset.get() }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents={slot === 0 ? 'auto' : 'none'}
      accessibilityElementsHidden={slot !== 0}
      importantForAccessibility={slot === 0 ? 'auto' : 'no-hide-descendants'}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
});
