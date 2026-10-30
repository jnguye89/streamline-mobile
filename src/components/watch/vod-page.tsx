import { useEvent, useEventListener } from 'expo';
import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, type VideoPlayer, type VideoThumbnail, VideoView } from 'expo-video';
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
import { ContentMenuButton } from '@/components/watch/content-menu-button';
import { HeartBurst, LikeColor } from '@/components/watch/heart-burst';
import { OwnerAvatar } from '@/components/watch/owner-avatar';
import { VideoControls } from '@/components/watch/video-controls';
import { Spacing } from '@/constants/theme';
import { addLike, addView, type Vod } from '@/data/videos';
import { useOpenProfile } from '@/hooks/use-open-profile';
import { formatCount } from '@/lib/format-count';

// How long the controls stay up after the last tap while the video plays.
const CONTROLS_HIDE_MS = 3000;
// Size cap for the still frame shown over a video until it's visibly playing.
const POSTER_MAX_SIZE = 1280;

// Orientation already measured from a frame, by video id, so a page that mounts again — when
// you swipe back to it, say — fits right away.
const measuredVertical = new Map<number, boolean>();

type VodPageProps = {
  video: Vod;
  /** The page on screen. Off-screen neighbors stay loaded but paused, ready to swipe in. */
  active: boolean;
  /** A swipe is pulling this page in: play it, muted, so it's already moving as it arrives. */
  previewing?: boolean;
  /** Called when playback finishes. Without it, the video just replays. */
  onEnded?: () => void;
  onError: () => void;
  onPlaying: () => void;
  onUpdate: (patch: Partial<Vod>) => void;
  /** Reported: take this video out of the feed. */
  onReported: () => void;
  /** Blocked its owner: take everything of theirs out of the feed. */
  onBlocked: (userId: string) => void;
};

/** One video in the feed: its own player plus the stats that belong to it. */
export function VodPage({
  video,
  active,
  previewing = false,
  onEnded,
  onError,
  onPlaying,
  onUpdate,
  onReported,
  onBlocked,
}: VodPageProps) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(video.src, (p) => {
    // Browsers only allow autoplay with sound off; native platforms autoplay unmuted.
    p.muted = Platform.OS === 'web';
    // Drives the progress bar in VideoControls.
    p.timeUpdateEventInterval = 0.25;
  });
  const viewed = useRef(false);

  // On screen and playing: the current page, or the one a swipe is pulling in.
  const playing = active || previewing;
  const mode = active ? 'active' : previewing ? 'preview' : 'idle';
  const lastMode = useRef(mode);

  // A still of the video, shown over it until it's visibly playing. The VideoView is
  // remounted when the page starts playing (see its key below) and is black until it draws,
  // and an off-screen neighbor may not draw at all — without this, every swipe flashes black.
  const [poster, setPoster] = useState<VideoThumbnail | null>(null);
  // Whether the current view has shown playback move on. iOS reports a view's first frame as
  // soon as it mounts, before anything is on screen, so progress is the only reliable signal.
  const [revealed, setRevealed] = useState(false);
  const startTime = useRef(0);

  useEffect(() => {
    const from = lastMode.current;
    lastMode.current = mode;
    if (mode === 'preview') {
      // Sound stays with the current video until the swipe lands.
      setMuted(player, true);
      startTime.current = player.currentTime;
      if (player.status !== 'error') player.play();
      return;
    }
    if (mode === 'idle') {
      player.pause();
      // A swipe that springs back leaves its video where it was, matching its still.
      if (from === 'preview') {
        seekTo(player, startTime.current);
        return;
      }
      // Swiping back to a video picks up where it left off, so the still should too.
      if (from === 'active' && player.currentTime > 0) {
        player
          .generateThumbnailsAsync(player.currentTime, {
            maxWidth: POSTER_MAX_SIZE,
            maxHeight: POSTER_MAX_SIZE,
          })
          .then(([frame]) => frame && setPoster(frame))
          .catch((e) => console.warn('Couldn’t capture video frame:', e));
      }
      return;
    }
    // Browsers only allow autoplay with sound off; native platforms play unmuted.
    setMuted(player, Platform.OS === 'web');
    // Arriving from a preview, it's already playing and on screen.
    if (from !== 'preview') startTime.current = player.currentTime;
    // A neighbor can fail while it's preloading off-screen, before anyone is watching it.
    if (player.status === 'error') onError();
    else player.play();
    // Only react to this page's mode changing, not to callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, mode]);

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

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (playing && !revealed && currentTime > startTime.current) setRevealed(true);
  });

  // Count a view the first time a video actually starts playing, not on every resume.
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    // Paused because the page went off-screen: cover it again until it plays once more.
    if (!isPlaying && !playing) setRevealed(false);
    if (!isPlaying || !active) return;
    onPlaying();
    if (viewed.current) return;
    viewed.current = true;
    onUpdate({ viewCount: video.viewCount + 1 });
    addView(video.id).catch(() => {});
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  // Horizontal videos fill the screen; vertical ones fit inside it rather than being cropped
  // to a sliver. The track size arrives with the source, with no extra download, so it sets
  // the shape first. It ignores the rotation flag phones record vertical video with, though,
  // so the first-frame poster (which has rotation applied, but costs its own request for the
  // frame) has the final say. Until either is known, fit rather than risk zooming.
  const [trackVertical, setTrackVertical] = useState<boolean | null>(null);
  const onTrackSize = ({ width, height }: { width: number; height: number }) => {
    if (width > 0 && height > 0) setTrackVertical(height > width);
  };
  useEventListener(player, 'sourceLoad', ({ availableVideoTracks }) => {
    if (availableVideoTracks[0]) onTrackSize(availableVideoTracks[0].size);
  });
  useEventListener(player, 'videoTrackChange', ({ videoTrack }) => {
    if (videoTrack) onTrackSize(videoTrack.size);
  });

  useEffect(() => {
    if (status !== 'readyToPlay' || poster !== null) return;
    let cancelled = false;
    player
      .generateThumbnailsAsync(0, { maxWidth: POSTER_MAX_SIZE, maxHeight: POSTER_MAX_SIZE })
      .then(([frame]) => {
        if (!frame) return;
        measuredVertical.set(video.id, frame.height > frame.width);
        if (!cancelled) setPoster(frame);
      })
      .catch((e) => console.warn('Couldn’t capture video frame:', e));
    return () => {
      cancelled = true;
    };
  }, [player, status, poster, video.id]);
  const isVertical = poster
    ? poster.height > poster.width
    : (measuredVertical.get(video.id) ?? trackVertical);
  const contentFit = isVertical === false ? 'cover' : 'contain';

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
        key={playing ? 'playing' : 'idle'}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        // Android: neighboring "cover" views misplace their video on the default SurfaceView,
        // and a TextureView also follows the pager's swipe transform. Ignored on iOS.
        surfaceType="textureView"
        nativeControls={false}
      />
      {poster && !(playing && revealed) && (
        <Image
          source={poster}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          pointerEvents="none"
        />
      )}

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
        {active && (
          <ContentMenuButton
            target={{ videoId: video.id }}
            ownerId={video.user}
            noun="video"
            onReported={onReported}
            onBlocked={onBlocked}
          />
        )}
      </View>

      {/* The bottom row belongs to the controls' progress bar while it's up, so the owner and
          counts step aside until the controls hide again. */}
      {!(active && controlsVisible) && (
        <>
          <View
            pointerEvents="box-none"
            style={[
              styles.bottomRow,
              { left: insets.left + Spacing.three, bottom: insets.bottom + Spacing.three },
            ]}>
            <Stat
              icon={{ ios: 'eye.fill', android: 'visibility', web: 'visibility' }}
              label={formatCount(video.viewCount)}
              accessibilityLabel={`${video.viewCount} views`}
            />
          </View>

          <View
            pointerEvents="box-none"
            style={[
              styles.bottomRow,
              styles.bottomCenter,
              { bottom: insets.bottom + Spacing.three },
            ]}>
            <OwnerAvatar ownerId={video.user} />
          </View>

          <View
            pointerEvents="box-none"
            style={[
              styles.bottomRow,
              { right: insets.right + Spacing.three, bottom: insets.bottom + Spacing.three },
            ]}>
            <Stat
            icon={
              video.liked
                ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
                : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
            }
            iconColor={video.liked ? LikeColor : undefined}
            label={formatCount(video.likeCount)}
            accessibilityLabel={video.liked ? 'Already liked' : 'Like'}
            onPress={video.liked ? undefined : onLike}
            />
          </View>
        </>
      )}

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

// Player settings change in response to props, outside the player's setup callback, where
// the React Compiler won't let a component assign to them directly.
function setMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

function seekTo(player: VideoPlayer, time: number) {
  player.currentTime = time;
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
  bottomRow: {
    position: 'absolute',
    height: ProfileButtonSize,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomCenter: {
    left: 0,
    right: 0,
    justifyContent: 'center',
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
