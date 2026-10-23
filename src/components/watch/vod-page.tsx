import { useEvent, useEventListener } from 'expo';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addLike, addView, type Vod } from '@/data/videos';

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
  const onLike = () => {
    if (video.liked) return;
    onUpdate({ liked: true, likeCount: video.likeCount + 1 });
    addLike(video.id).catch(() => {});
  };

  return (
    <View style={styles.page}>
      <VideoView
        // iOS can stop drawing a view that was slid in from off-screen once its player
        // starts. A fresh view for the same player (and its buffer) draws reliably.
        key={active ? 'active' : 'idle'}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={active}
        fullscreenOptions={{ enable: true }}
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + Spacing.three,
            paddingLeft: insets.left + Spacing.three,
            paddingRight: insets.right + Spacing.three,
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
            label={video.likeCount.toLocaleString()}
            accessibilityLabel={video.liked ? 'Already liked' : 'Like'}
            onPress={video.liked ? undefined : onLike}
          />
        </View>
      </View>
    </View>
  );
}

type StatProps = {
  icon: SymbolViewProps['name'];
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
};

function Stat({ icon, label, accessibilityLabel, onPress }: StatProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.pressed]}>
      <SymbolView name={icon} tintColor="#ffffff" size={18} />
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
    borderRadius: Spacing.five,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  onVideo: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
