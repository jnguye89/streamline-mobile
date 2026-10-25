import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/**
 * react-native-agora is native-only, so the web build (including the server bundle native
 * builds export) gets a placeholder. Going live on the web is streamline-ui's stream page.
 */
export function BroadcastStudio() {
  return (
    <View style={styles.centered}>
      <ThemedText style={styles.message}>Going live is available in the iOS and Android apps.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  message: {
    color: '#ffffff',
  },
});
