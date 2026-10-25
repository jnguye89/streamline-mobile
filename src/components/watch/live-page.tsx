import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileButtonSize } from '@/components/profile-button';
import { ThemedText } from '@/components/themed-text';
import { LiveChannel } from '@/components/watch/live-channel';
import { Spacing } from '@/constants/theme';
import type { LiveStream } from '@/data/live-streams';

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
            // Leave the top-left corner to the go-live button.
            paddingLeft: insets.left + Spacing.three + ProfileButtonSize + Spacing.two,
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
