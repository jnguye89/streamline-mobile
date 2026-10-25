import { useEvent } from 'expo';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { VideoPlayer } from 'expo-video';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileButtonSize } from '@/components/profile-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const SKIP_SECONDS = 10;

type VideoControlsProps = {
  player: VideoPlayer;
  /** Called on any interaction, so the controls stay up while they're being used. */
  onInteract: () => void;
};

/**
 * Play/pause, ±10s and a seekable progress bar, in place of the native player controls —
 * those swallow the first tap of a double-tap like. Shown and hidden by the page.
 */
export function VideoControls({ player, onInteract }: VideoControlsProps) {
  const insets = useSafeAreaInsets();
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const duration = player.duration || 0;

  const [trackWidth, setTrackWidth] = useState(0);
  // While dragging, show where the finger is and seek once on release.
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);

  const fractionAt = (x: number) => (trackWidth > 0 ? Math.min(Math.max(x / trackWidth, 0), 1) : 0);
  const seekTo = (fraction: number) => player.seekBy(fraction * duration - player.currentTime);

  const scrub = usePanGesture({
    // Zero distance, so a plain tap on the bar seeks too.
    minDistance: 0,
    runOnJS: true,
    onBegin: ({ x }) => {
      onInteract();
      setScrubFraction(fractionAt(x));
    },
    onUpdate: ({ x }) => {
      onInteract();
      setScrubFraction(fractionAt(x));
    },
    onFinalize: ({ x }) => {
      seekTo(fractionAt(x));
      setScrubFraction(null);
    },
  });

  const played = scrubFraction ?? (duration > 0 ? Math.min(currentTime / duration, 1) : 0);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.center} pointerEvents="box-none">
        <ControlButton
          icon={{ ios: 'gobackward.10', android: 'replay_10', web: 'replay_10' }}
          accessibilityLabel={`Back ${SKIP_SECONDS} seconds`}
          onPress={() => {
            onInteract();
            player.seekBy(-SKIP_SECONDS);
          }}
        />
        <ControlButton
          large
          icon={
            isPlaying
              ? { ios: 'pause.fill', android: 'pause', web: 'pause' }
              : { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }
          }
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={() => {
            onInteract();
            if (isPlaying) player.pause();
            else player.play();
          }}
        />
        <ControlButton
          icon={{ ios: 'goforward.10', android: 'forward_10', web: 'forward_10' }}
          accessibilityLabel={`Forward ${SKIP_SECONDS} seconds`}
          onPress={() => {
            onInteract();
            player.seekBy(SKIP_SECONDS);
          }}
        />
      </View>

      <View
        style={[
          styles.bottomBar,
          {
            // Starts after the owner icon in the bottom-left corner.
            left: insets.left + Spacing.three + ProfileButtonSize + Spacing.three,
            right: insets.right + Spacing.three,
            bottom: insets.bottom + Spacing.three,
          },
        ]}>
        <ThemedText type="small" style={styles.time}>
          {formatTime(played * duration)}
        </ThemedText>
        <GestureDetector gesture={scrub}>
          <View
            style={styles.trackHitArea}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            accessibilityRole="adjustable"
            accessibilityLabel="Seek"
            accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(played * duration) }}>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${played * 100}%` }]} />
            </View>
            <View style={[styles.thumb, { left: played * trackWidth - THUMB / 2 }]} />
          </View>
        </GestureDetector>
        <ThemedText type="small" style={styles.time}>
          {formatTime(duration)}
        </ThemedText>
      </View>
    </View>
  );
}

type ControlButtonProps = {
  icon: SymbolViewProps['name'];
  accessibilityLabel: string;
  onPress: () => void;
  large?: boolean;
};

function ControlButton({ icon, accessibilityLabel, onPress, large }: ControlButtonProps) {
  const size = large ? 64 : 48;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}>
      <SymbolView name={icon} tintColor="#ffffff" size={large ? 30 : 24} />
    </Pressable>
  );
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

const THUMB = 14;

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pressed: {
    opacity: 0.7,
  },
  bottomBar: {
    position: 'absolute',
    height: ProfileButtonSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  time: {
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  trackHitArea: {
    flex: 1,
    height: ProfileButtonSize,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#ffffff',
  },
});
