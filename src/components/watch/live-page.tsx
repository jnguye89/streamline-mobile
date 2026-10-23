import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { RenderModeType, RtcSurfaceView } from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { LiveStream } from '@/data/live-streams';
import { useLiveChannel } from '@/hooks/use-live-channel';

type LivePageProps = {
  stream: LiveStream;
  /** Only the page on screen joins the channel; off-screen it's just a title card. */
  active: boolean;
  onError: () => void;
};

/** One live stream in the feed. */
export function LivePage({ stream, active, onError }: LivePageProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      {active ? (
        <LiveChannel stream={stream} onError={onError} />
      ) : (
        <View style={styles.centered}>
          <ThemedText type="subtitle" style={styles.onVideo}>
            {stream.username ? `${stream.username} is live` : 'Live now'}
          </ThemedText>
        </View>
      )}

      <View
        pointerEvents="none"
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + Spacing.three,
            paddingLeft: insets.left + Spacing.three,
            paddingRight: insets.right + Spacing.three,
          },
        ]}>
        <View style={styles.liveBadge}>
          <ThemedText type="smallBold" style={styles.onVideo}>
            LIVE
          </ThemedText>
        </View>
        {stream.username && (
          <ThemedText type="smallBold" style={styles.onVideo}>
            {stream.username}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function LiveChannel({ stream, onError }: { stream: LiveStream; onError: () => void }) {
  const hostUids = useLiveChannel(stream.channelName, onError);

  if (hostUids.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" size="large" />
      </View>
    );
  }

  // Co-hosts share the screen side by side, like the tiles on the web watch page.
  // No `connection` prop: that switches the view to setupRemoteVideoEx, which only binds to
  // channels joined with joinChannelEx — with a plain joinChannel the video never draws.
  return (
    <View style={styles.hosts}>
      {hostUids.map((uid) => (
        <RtcSurfaceView
          key={uid}
          style={styles.host}
          canvas={{ uid, renderMode: RenderModeType.RenderModeFit }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hosts: {
    flex: 1,
    flexDirection: 'row',
  },
  host: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  liveBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    backgroundColor: '#E5484D',
  },
  onVideo: {
    color: '#ffffff',
  },
});
