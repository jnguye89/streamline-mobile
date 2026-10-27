import { useEvent } from 'expo';
import { SymbolView } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Vod } from '@/data/videos';
import { formatCount } from '@/lib/format-count';

type VideoTileProps = {
  video: Vod;
  width: number;
  playing: boolean;
  onToggle: () => void;
};

/**
 * One video on the profile grid — streamline-ui's profile `.video-item`: the video itself
 * (first frame until played), a Processed badge, and view/like counts. Tapping plays or
 * pauses it in place.
 */
export function VideoTile({ video, width, playing, onToggle }: VideoTileProps) {
  const player = useVideoPlayer(video.src, (p) => {
    p.loop = true;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${playing ? 'Pause' : 'Play'} video, ${video.viewCount} views, ${video.likeCount} likes`}
      onPress={onToggle}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        // Android: many "cover" views on one screen misplace their video on SurfaceView.
        surfaceType="textureView"
        pointerEvents="none"
      />

      {!playing && status !== 'error' && (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.playBadge}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              tintColor="#ffffff"
              size={20}
            />
          </View>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.center} pointerEvents="none">
          <ThemedText type="small" style={styles.onVideo}>
            Can&apos;t play this video
          </ThemedText>
        </View>
      )}

      {video.isProcessed && (
        <View style={[styles.chip, styles.processed]} pointerEvents="none" accessibilityLabel="Processed">
          <SymbolView
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            tintColor="#ffffff"
            size={14}
          />
        </View>
      )}

      <View style={styles.stats} pointerEvents="none">
        <View style={styles.chip}>
          <SymbolView
            name={{ ios: 'eye.fill', android: 'visibility', web: 'visibility' }}
            tintColor="#ffffff"
            size={14}
          />
          <ThemedText type="small" style={styles.onVideo}>
            {formatCount(video.viewCount)}
          </ThemedText>
        </View>
        <View style={styles.chip}>
          <SymbolView
            name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
            tintColor="#ffffff"
            size={14}
          />
          <ThemedText type="small" style={styles.onVideo}>
            {formatCount(video.likeCount)}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 16 / 9,
    borderRadius: Spacing.three,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  pressed: {
    opacity: 0.85,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  stats: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  processed: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.one + Spacing.half,
  },
  onVideo: {
    color: '#ffffff',
  },
});
