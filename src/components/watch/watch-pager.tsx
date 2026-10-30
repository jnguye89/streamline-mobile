import { useLayoutEffect, useRef, useState } from 'react';
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
  /** Takes a reported item out of the feed, by feedItemKey. */
  onHideItem: (key: string) => void;
  /** Takes a blocked user's items out of the feed. */
  onHideUser: (userId: string) => void;
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
  onHideItem,
  onHideUser,
  focused,
}: WatchPagerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const consecutiveErrors = useRef(0);
  // Pages sit on a strip: each has a fixed index, and `position` is how far the strip has
  // scrolled. A swipe that lands moves `base` along with the pages' slots, so a page keeps its
  // index (and its place on screen) through the re-render — nothing has to snap back, which
  // used to leave the UI thread a frame or two showing the wrong page.
  const [base, setBase] = useState(0);
  const position = useSharedValue(0);
  // The neighbor a swipe is pulling in. Its video starts as soon as it shows at the edge,
  // rather than once the swipe lands. `revealingSide` mirrors it on the UI thread so a drag
  // only crosses over to JS when the side actually changes.
  const [revealingKey, setRevealingKey] = useState<string | null>(null);
  const revealingSide = useSharedValue(0);

  const currentKey = feedItemKey(current);
  const nextKey = nextItem && feedItemKey(nextItem);
  const hasNext = nextItem !== null && nextKey !== currentKey;
  // With two items, "next" wraps around to the previous one — it can only sit on one side.
  const previousKey = previousItem && feedItemKey(previousItem);
  const hasPrevious = previousItem !== null && previousKey !== nextKey;

  // Each page is keyed by item, so when a neighbor becomes current it keeps its player
  // (and whatever it has buffered). After a swipe this is already where the strip ended up;
  // it only moves anything when the feed changes some other way, or the screen resizes.
  useLayoutEffect(() => {
    position.set(base * width);
  }, [currentKey, base, width, position]);

  const advance = () => {
    setBase((b) => b + 1);
    setRevealingKey(null);
    revealingSide.set(0);
    onNext();
  };
  const retreat = () => {
    setBase((b) => b - 1);
    setRevealingKey(null);
    revealingSide.set(0);
    onPrevious();
  };

  const goNext = () => {
    if (!hasNext) return;
    setRevealingKey(nextKey);
    revealingSide.set(1);
    position.set(withTiming((base + 1) * width, { duration: SETTLE_MS }, (finished) => {
      if (finished) scheduleOnRN(advance);
    }));
  };

  const pan = usePanGesture({
    activeOffsetX: [-15, 15],
    failOffsetY: [-20, 20],
    hitSlop: { bottom: -(insets.bottom + SCRUBBER_CLEARANCE) },
    onUpdate: (e) => {
      'worklet';
      const resisted = (e.translationX < 0 && !hasNext) || (e.translationX > 0 && !hasPrevious);
      position.set(base * width - (resisted ? e.translationX * EDGE_RESISTANCE : e.translationX));
      const side = e.translationX < 0 ? (hasNext ? 1 : 0) : hasPrevious ? -1 : 0;
      if (side !== revealingSide.get()) {
        revealingSide.set(side);
        scheduleOnRN(setRevealingKey, side === 1 ? nextKey : side === -1 ? previousKey : null);
      }
    },
    onDeactivate: (e) => {
      'worklet';
      const threshold = width * SWIPE_DISTANCE_RATIO;
      if (hasNext && (e.translationX < -threshold || e.velocityX < -SWIPE_VELOCITY)) {
        position.set(withTiming((base + 1) * width, { duration: SETTLE_MS }, (finished) => {
          if (finished) scheduleOnRN(advance);
        }));
      } else if (hasPrevious && (e.translationX > threshold || e.velocityX > SWIPE_VELOCITY)) {
        position.set(withTiming((base - 1) * width, { duration: SETTLE_MS }, (finished) => {
          if (finished) scheduleOnRN(retreat);
        }));
      } else {
        position.set(withSpring(base * width, { duration: SETTLE_MS }));
        revealingSide.set(0);
        scheduleOnRN(setRevealingKey, null);
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
            <Slot
              key={feedItemKey(item)}
              slot={slot}
              index={base + slot}
              width={width}
              position={position}>
              {item.type === 'vod' ? (
                <VodPage
                  video={item.video}
                  active={slot === 0 && focused}
                  previewing={slot !== 0 && focused && feedItemKey(item) === revealingKey}
                  onEnded={hasNext ? goNext : undefined}
                  onError={onError}
                  onPlaying={onPlaying}
                  onUpdate={onUpdateVod}
                  onReported={() => onHideItem(feedItemKey(item))}
                  onBlocked={onHideUser}
                />
              ) : (
                <LivePage
                  stream={item.stream}
                  active={slot === 0 && focused}
                  onError={onError}
                  onReported={() => onHideItem(feedItemKey(item))}
                  onBlocked={onHideUser}
                />
              )}
            </Slot>
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

type SlotProps = {
  /** -1, 0 or 1: previous, current or next. */
  slot: number;
  /** Where the page sits on the strip; stays the same while the page is mounted. */
  index: number;
  width: number;
  position: SharedValue<number>;
  children: React.ReactNode;
};

/** Places a page at its spot on the strip, relative to how far the strip has scrolled. */
function Slot({ slot, index, width, position, children }: SlotProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: index * width - position.get() }],
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
