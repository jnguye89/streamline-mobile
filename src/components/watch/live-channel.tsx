import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { RenderModeType, RtcSurfaceView } from 'react-native-agora';

import type { LiveStream } from '@/data/live-streams';
import { useLiveChannel } from '@/hooks/use-live-channel';

type LiveChannelProps = {
  stream: LiveStream;
  onError: () => void;
};

/** The host video for one live stream, joined over Agora while mounted. */
export function LiveChannel({ stream, onError }: LiveChannelProps) {
  const hostUids = useLiveChannel(stream.channelName, onError);

  if (hostUids.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" size="large" />
      </View>
    );
  }

  // Co-hosts share the screen side by side, like the tiles on the web watch page. Each tile is
  // filled (RenderModeHidden crops the overflow) to match the edge-to-edge VODs.
  // No `connection` prop: that switches the view to setupRemoteVideoEx, which only binds to
  // channels joined with joinChannelEx — with a plain joinChannel the video never draws.
  return (
    <View style={styles.hosts}>
      {hostUids.map((uid) => (
        <RtcSurfaceView
          key={uid}
          style={styles.host}
          canvas={{ uid, renderMode: RenderModeType.RenderModeHidden }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
