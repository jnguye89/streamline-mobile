import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { UserVideos } from '@/components/profile/user-videos';
import { ThemedView } from '@/components/themed-view';
import { getUsername } from '@/data/users';

/**
 * Another user's profile — their uploaded videos — like streamline-ui's /profile/:id. Opened
 * from the owner icon on the video being watched. `id` is their Auth0 user id.
 */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth0();
  const signedIn = !!user;
  const [username, setUsername] = useState<{ id: string; name: string | null } | null>(null);

  // Usernames are only shared with signed-in callers; everyone else gets a generic title.
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    getUsername(id).then((name) => {
      if (!cancelled) setUsername({ id, name });
    });
    return () => {
      cancelled = true;
    };
  }, [id, signedIn]);

  const title = (signedIn && username?.id === id && username.name) || 'Profile';

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title, headerBackTitle: 'Watch' }} />
      <ThemedView style={styles.screen}>
        <UserVideos userId={id} own={id === user?.sub} />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
