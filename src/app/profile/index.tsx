import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { UserVideos } from '@/components/profile/user-videos';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/** The signed-in user's own profile: their uploaded videos, like streamline-ui's /profile. */
export default function MyProfileScreen() {
  const { user } = useAuth0();

  return (
    <>
      {/* The rest of the app is full-screen video; this page gets a header so there's a way back. */}
      <Stack.Screen options={{ headerShown: true, title: 'Profile', headerBackTitle: 'Watch' }} />
      <ThemedView style={styles.screen}>
        {user ? (
          <UserVideos userId={user.sub} own />
        ) : (
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary">Sign in to see your videos.</ThemedText>
          </View>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
