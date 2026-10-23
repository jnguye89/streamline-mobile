import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { LiveStream } from '@/data/live-streams';

type LiveChannelProps = {
  stream: LiveStream;
  onError: () => void;
};

/**
 * react-native-agora is native-only, so the web build (including the server bundle that
 * `web.output: "server"` makes every native build export) gets a placeholder instead.
 */
export function LiveChannel(_props: LiveChannelProps) {
  return (
    <View style={styles.centered}>
      <ThemedText style={styles.message}>Live streams play in the iOS and Android apps.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#ffffff',
  },
});
