import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { ProfileIdentity } from '@/components/profile/profile-identity';
import { UserVideos } from '@/components/profile/user-videos';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LikeColor } from '@/components/watch/heart-burst';
import { Spacing } from '@/constants/theme';
import { useUsername } from '@/hooks/use-user-profile';

/**
 * The signed-in user's own profile: their photo (editable), name and uploaded videos, like
 * streamline-ui's /profile.
 */
export default function MyProfileScreen() {
  const { user } = useAuth0();
  // Your Streamline username — what everyone else sees — falling back to Auth0's profile.
  const username = useUsername(user?.sub ?? null);
  const name = username ?? user?.nickname ?? user?.name ?? null;

  return (
    <>
      <Stack.Screen
        options={{
          title: name ?? 'Profile',
          headerRight: user
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/go-live')}
                  style={({ pressed }) => [styles.goLive, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={styles.goLiveText}>
                    Go live
                  </ThemedText>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ThemedView style={styles.screen}>
        {user ? (
          <UserVideos
            userId={user.sub}
            own
            header={<ProfileIdentity userId={user.sub} name={name} picture={user.picture} editable />}
          />
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
  goLive: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    backgroundColor: LikeColor,
  },
  goLiveText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
