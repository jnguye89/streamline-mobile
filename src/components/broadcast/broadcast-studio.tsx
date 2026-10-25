import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { RenderModeType, RtcSurfaceView, VideoSourceType } from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { OnVideoShadow } from '@/components/user-mark';
import { LikeColor } from '@/components/watch/heart-burst';
import { Spacing } from '@/constants/theme';
import {
  getRestreamPlatforms,
  processRecording,
  type RestreamPlatform,
  RestreamTargets,
} from '@/data/streams';
import { useBroadcast } from '@/hooks/use-broadcast';

/**
 * Going live from the phone camera, like streamline-ui's stream page minus capture cards,
 * game audio and overlays. Native only (see broadcast-studio.web.tsx).
 */
export function BroadcastStudio() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const broadcast = useBroadcast();
  const { phase } = broadcast;
  const isLive = phase === 'live';

  // Restreams: everything with a saved key is on by default, like the web page.
  const [available, setAvailable] = useState<RestreamPlatform[]>([]);
  const [disabled, setDisabled] = useState<RestreamPlatform[]>([]);
  useEffect(() => {
    let cancelled = false;
    getRestreamPlatforms()
      .then((platforms) => {
        if (!cancelled) setAvailable(platforms);
      })
      .catch((e) => console.warn('Couldn’t load restream targets:', e));
    return () => {
      cancelled = true;
    };
  }, []);
  const selected = available.filter((p) => !disabled.includes(p));

  const goLive = () => broadcast.goLive(selected);

  const end = async () => {
    const filename = await broadcast.end();
    if (!filename) return;
    Alert.alert('Nice work.', 'Your stream has been saved to your profile. Process the video?', [
      { text: 'No thanks', style: 'cancel' },
      {
        text: 'Process video',
        onPress: () => {
          processRecording(filename)
            .then(() =>
              Alert.alert(
                'Processing started',
                'This can take a few minutes. The video will show up in your profile when ready.'
              )
            )
            .catch((e) => {
              console.warn('Couldn’t start processing:', e);
              Alert.alert('Couldn’t start processing', 'Please try again later.');
            });
        },
      },
    ]);
  };

  const close = () => {
    if (!isLive) {
      router.back();
      return;
    }
    Alert.alert('End your stream?', 'You’re live right now.', [
      { text: 'Keep streaming', style: 'cancel' },
      {
        text: 'End stream',
        style: 'destructive',
        onPress: async () => {
          await end();
          router.back();
        },
      },
    ]);
  };

  const busy = phase === 'preparing' || phase === 'starting' || phase === 'ending';

  return (
    <View style={styles.screen}>
      {/* No swiping away mid-stream; the close button asks first. */}
      <Stack.Screen options={{ gestureEnabled: !isLive && phase !== 'starting' }} />
      <StatusBar hidden />

      {phase !== 'failed' && (
        <RtcSurfaceView
          style={StyleSheet.absoluteFill}
          canvas={{
            uid: 0,
            sourceType: VideoSourceType.VideoSourceCamera,
            renderMode: RenderModeType.RenderModeHidden,
          }}
        />
      )}

      <View
        pointerEvents="box-none"
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + Spacing.three,
            paddingLeft: insets.left + Spacing.three,
            paddingRight: insets.right + Spacing.three,
          },
        ]}>
        <View style={styles.topRow} pointerEvents="box-none">
          <IconButton
            icon={{ ios: 'xmark', android: 'close', web: 'close' }}
            label={isLive ? 'End stream and close' : 'Close'}
            onPress={close}
          />
          {isLive && broadcast.liveSince && <LiveBadge since={broadcast.liveSince} />}
          <View style={styles.spacer} />
          {RestreamTargets.filter((t) => available.includes(t.platform)).map((target) => {
            const status = broadcast.restreams.find((r) => r.platform === target.platform)?.status;
            const on = isLive ? status === 'active' || status === 'starting' : !disabled.includes(target.platform);
            return (
              <Pressable
                key={target.platform}
                accessibilityRole="switch"
                accessibilityLabel={`Restream to ${target.label}`}
                accessibilityState={{ checked: on, disabled: isLive || busy }}
                disabled={isLive || busy}
                onPress={() =>
                  setDisabled((current) =>
                    current.includes(target.platform)
                      ? current.filter((p) => p !== target.platform)
                      : [...current, target.platform]
                  )
                }
                style={[styles.chip, on ? styles.chipOn : styles.chipOff, status === 'error' && styles.chipError]}>
                <ThemedText type="smallBold" style={styles.onVideo}>
                  {target.label}
                  {status === 'error' ? ' — failed' : ''}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.center} pointerEvents="box-none">
          {phase === 'preparing' && <ActivityIndicator color="#ffffff" size="large" />}
          {broadcast.error && (
            <ThemedText style={[styles.onVideo, styles.error]}>{broadcast.error}</ThemedText>
          )}
          {phase === 'failed' && (
            <Pressable
              accessibilityRole="button"
              onPress={broadcast.retry}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.onVideo}>
                Try again
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.bottomRow} pointerEvents="box-none">
          <View style={styles.spacer} />
          {phase !== 'failed' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLive ? 'End stream' : 'Go live'}
              disabled={busy}
              onPress={isLive ? end : goLive}
              style={({ pressed }) => [
                styles.mainButton,
                isLive ? styles.endButton : styles.liveButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {phase === 'starting' || phase === 'ending' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={styles.onVideo}>
                  {isLive ? 'End' : 'Go live'}
                </ThemedText>
              )}
            </Pressable>
          )}
          <View style={[styles.spacer, styles.sideControls]} pointerEvents="box-none">
            <IconButton
              icon={
                broadcast.muted
                  ? { ios: 'mic.slash.fill', android: 'mic_off', web: 'mic_off' }
                  : { ios: 'mic.fill', android: 'mic', web: 'mic' }
              }
              label={broadcast.muted ? 'Unmute microphone' : 'Mute microphone'}
              onPress={broadcast.toggleMute}
              disabled={phase === 'failed'}
            />
            <IconButton
              icon={{
                ios: 'arrow.triangle.2.circlepath.camera.fill',
                android: 'flip_camera_ios',
                web: 'flip_camera_ios',
              }}
              label="Switch camera"
              onPress={broadcast.switchCamera}
              disabled={phase === 'failed'}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function LiveBadge({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  const elapsed = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;

  return (
    <View style={styles.liveBadge}>
      <ThemedText type="smallBold" style={styles.onVideo}>
        LIVE · {elapsed}
      </ThemedText>
    </View>
  );
}

type IconButtonProps = {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function IconButton({ icon, label, onPress, disabled }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, disabled && styles.disabled, pressed && styles.pressed]}>
      <SymbolView name={icon} tintColor="#ffffff" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  sideControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.six,
  },
  error: {
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  liveBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    backgroundColor: LikeColor,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Spacing.five,
    borderWidth: 1,
    ...OnVideoShadow,
  },
  chipOn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: '#ffffff',
  },
  chipOff: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  chipError: {
    borderColor: LikeColor,
  },
  mainButton: {
    minWidth: 140,
    height: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveButton: {
    backgroundColor: LikeColor,
  },
  endButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  secondaryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  onVideo: {
    color: '#ffffff',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
