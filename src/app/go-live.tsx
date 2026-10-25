import { StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { BroadcastStudio } from '@/components/broadcast/broadcast-studio';
import { ThemedText } from '@/components/themed-text';

/** Going live from the phone camera. Reached from your own profile. */
export default function GoLiveScreen() {
  const { user } = useAuth0();

  if (!user) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.message}>Sign in to go live.</ThemedText>
      </View>
    );
  }
  return <BroadcastStudio />;
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
