import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { ProfileIdentity } from '@/components/profile/profile-identity';
import { UserVideos } from '@/components/profile/user-videos';
import { ThemedView } from '@/components/themed-view';
import { useUserProfile } from '@/hooks/use-user-profile';

/**
 * Another user's profile — their name and uploaded videos — like streamline-ui's /profile/:id.
 * Opened from the video being watched. `id` is their Auth0 user id.
 */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth0();
  const profile = useUserProfile(id);
  const username = profile?.username ?? null;

  return (
    <>
      <Stack.Screen options={{ title: username ?? 'Profile' }} />
      <ThemedView style={styles.screen}>
        <UserVideos
          userId={id}
          own={id === user?.sub}
          // Signed-out viewers don't get usernames, so there's nothing to show above the grid.
          header={username ? <ProfileIdentity userId={id} name={username} picture={profile?.picture} /> : undefined}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
