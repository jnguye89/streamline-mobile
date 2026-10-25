import { useEvent, useEventListener } from 'expo';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  Directions,
  GestureDetector,
  useExclusiveGestures,
  useFlingGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileButtonSize } from '@/components/profile-button';
import { ThemedText } from '@/components/themed-text';
import { OnVideoShadow } from '@/components/user-mark';
import { HeartBurst, LikeColor } from '@/components/watch/heart-burst';
import { OwnerAvatar } from '@/components/watch/owner-avatar';
import { VideoControls } from '@/components/watch/video-controls';
import { Spacing } from '@/constants/theme';
import { addLike, addView, type Vod } from '@/data/videos';
import { useOpenProfile } from '@/hooks/use-open-profile';

// How long the controls stay up after the last tap while the video plays.
const CONTROLS_HIDE_MS = 3000;

type VodPageProps = {
  video: Vod;
  /** The page on screen. Off-screen neighbors stay loaded but paused, ready to swipe in. */
  active: boolean;
  /** Called when playback finishes. Without it, the video just replays. */
  onEnded?: () => void;
  onError: () => void;
  onPlaying: () => void;
  onUpdate: (patch: Partial<Vod>) => void;
};

/** One video in the feed: its own player plus the stats that belong to it. */
export function VodPage({ video, active, onEnded, onError, onPlaying, onUpdate }: VodPageProps) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(video.src, (p) => {
    // Browsers only allow autoplay with sound off; native platforms autoplay unmuted.
    p.muted = Platform.OS === 'web';
    // Drives the progress bar in VideoControls.
    p.timeUpdateEventInterval = 0.25;
  });
  const viewed = useRef(false);

  useEffect(() => {
    if (!active) {
      player.pause();
      return;
    }
    // A neighbor can fail while it's preloading off-screen, before anyone is watching it.
    if (player.status === 'error') onError();
    else player.play();
    // Only react to this page becoming (in)active, not to callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, active]);

  useEventListener(player, 'playToEnd', () => {
    if (!active) return;
    if (onEnded) onEnded();
    else player.replay();
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status !== 'error') return;
    console.warn('Failed to play video:', error?.message);
    if (active) onError();
  });

  // Count a view the first time a video actually starts playing, not on every resume.
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (!isPlaying || !active) return;
    onPlaying();
    if (viewed.current) return;
    viewed.current = true;
    onUpdate({ viewCount: video.viewCount + 1 });
    addView(video.id).catch(() => {});
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  // Horizontal videos fill the screen; vertical ones fit inside it rather than being cropped
  // to a sliver. The track size the player reports ignores the rotation flag phones record
  // vertical video with, so measure a tiny first-frame thumbnail instead — it has rotation
  // applied. Until that's known, fit rather than risk zooming a vertical video.
  const [isVertical, setIsVertical] = useState<boolean | null>(null);
  useEffect(() => {
    if (status !== 'readyToPlay' || isVertical !== null) return;
    let cancelled = false;
    player
      .generateThumbnailsAsync(0, { maxWidth: 64, maxHeight: 64 })
      .then(([frame]) => {
        if (!cancelled && frame) setIsVertical(frame.height > frame.width);
      })
      .catch((e) => console.warn('Couldn’t measure video:', e));
    return () => {
      cancelled = true;
    };
  }, [player, status, isVertical]);
  const onLike = () => {
    if (video.liked) return;
    onUpdate({ liked: true, likeCount: video.likeCount + 1 });
    addLike(video.id).catch(() => {});
  };

  // Double tap anywhere on the video likes it. Already liked, it just shows the heart again —
  // it never unlikes, and never counts twice.
  const [bursts, setBursts] = useState<{ key: number; x: number; y: number }[]>([]);
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    enabled: active,
    runOnJS: true,
    onActivate: ({ x, y }) => {
      onLike();
      setBursts((current) => [...current, { key: Date.now(), x, y }]);
    },
  });

  // A single tap shows/hides the controls. It only fires once a double tap has been ruled
  // out, so the first tap of a like doesn't flash them.
  const [controlsVisible, setControlsVisible] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(0);
  const singleTap = useTapGesture({
    enabled: active,
    runOnJS: true,
    onActivate: () => {
      setControlsVisible((visible) => !visible);
      setLastInteraction(Date.now());
    },
  });
  // Swipe up for the owner's profile, same as tapping their icon. Horizontal swipes still
  // belong to the pager, which gives up as soon as a drag turns vertical.
  const openProfile = useOpenProfile();
  const swipeUp = useFlingGesture({
    direction: Directions.UP,
    enabled: active && !!video.user,
    runOnJS: true,
    onActivate: () => openProfile(video.user),
  });
  const taps = useExclusiveGestures(doubleTap, singleTap);
  const pageGestures = useSimultaneousGestures(taps, swipeUp);

  // Tuck the controls away a few seconds after the last interaction while playing; paused,
  // they stay up.
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  useEffect(() => {
    if (!controlsVisible || !isPlaying) return;
    const timer = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    return () => clearTimeout(timer);
  }, [controlsVisible, isPlaying, lastInteraction]);

  return (
    <View style={styles.page}>
      <VideoView
        // iOS can stop drawing a view that was slid in from off-screen once its player
        // starts. A fresh view for the same player (and its buffer) draws reliably.
        key={active ? 'active' : 'idle'}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={isVertical === false ? 'cover' : 'contain'}
        // Android: neighboring "cover" views misplace their video on the default SurfaceView,
        // and a TextureView also follows the pager's swipe transform. Ignored on iOS.
        surfaceType="textureView"
        nativeControls={false}
      />

      <GestureDetector gesture={pageGestures}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>

      {active && controlsVisible && (
        <VideoControls player={player} onInteract={() => setLastInteraction(Date.now())} />
      )}

      <View
        pointerEvents="box-none"
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + Spacing.three,
            paddingLeft: insets.left + Spacing.three,
            // Leave the top-right corner to the profile button.
            paddingRight: insets.right + Spacing.three + ProfileButtonSize + Spacing.two,
          },
        ]}>
        {status === 'error' && (
          <ThemedText type="smallBold" style={styles.onVideo}>
            This video couldn&apos;t be played.
          </ThemedText>
        )}
        <View style={styles.stats}>
          <Stat
            icon={{ ios: 'eye.fill', android: 'visibility', web: 'visibility' }}
            label={video.viewCount.toLocaleString()}
            accessibilityLabel={`${video.viewCount} views`}
          />
          <Stat
            icon={
              video.liked
                ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
                : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
            }
            iconColor={video.liked ? LikeColor : undefined}
            label={video.likeCount.toLocaleString()}
            accessibilityLabel={video.liked ? 'Already liked' : 'Like'}
            onPress={video.liked ? undefined : onLike}
          />
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.owner,
          { left: insets.left + Spacing.three, bottom: insets.bottom + Spacing.three },
        ]}>
        <OwnerAvatar ownerId={video.user} />
      </View>

      {bursts.map((burst) => (
        <HeartBurst
          key={burst.key}
          x={burst.x}
          y={burst.y}
          onDone={() => setBursts((current) => current.filter((b) => b.key !== burst.key))}
        />
      ))}
    </View>
  );
}

type StatProps = {
  icon: SymbolViewProps['name'];
  iconColor?: string;
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
};

function Stat({ icon, iconColor = '#ffffff', label, accessibilityLabel, onPress }: StatProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.pressed]}>
      <SymbolView name={icon} tintColor={iconColor} size={18} />
      <ThemedText type="smallBold" style={styles.onVideo}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
  },
  owner: {
    position: 'absolute',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    // No backdrop, like the profile icons; the shadow keeps the icon readable on bright video.
    ...OnVideoShadow,
  },
  onVideo: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
