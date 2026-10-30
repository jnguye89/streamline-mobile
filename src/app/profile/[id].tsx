import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { ProfileIdentity } from '@/components/profile/profile-identity';
import { UserVideos } from '@/components/profile/user-videos';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { blockUser, getBlockedUsers, unblockUser } from '@/data/moderation';
import { useUserProfile } from '@/hooks/use-user-profile';

/**
 * Another user's profile — their name and uploaded videos — like streamline-ui's /profile/:id.
 * Opened from the video being watched. `id` is their Auth0 user id. Signed in, you can block
 * or unblock them here; blocked, their videos stay hidden.
 */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth0();
  const profile = useUserProfile(id);
  const username = profile?.username ?? null;
  const canBlock = !!user && user.sub !== id;

  // Unknown until the block list loads; the header button waits for it.
  const [blocked, setBlocked] = useState<boolean | null>(null);
  useEffect(() => {
    if (!canBlock) return;
    let cancelled = false;
    getBlockedUsers()
      .then((list) => {
        if (!cancelled) setBlocked(list.some((u) => u.auth0UserId === id));
      })
      .catch((e) => console.warn('Couldn’t load blocked users:', e));
    return () => {
      cancelled = true;
    };
  }, [canBlock, id]);

  const name = username ?? 'this user';
  const toggleBlock = () => {
    if (blocked) {
      unblockUser(id)
        .then(() => setBlocked(false))
        .catch((e) => {
          console.warn('Unblock failed:', e);
          Alert.alert('Couldn’t unblock', 'Please check your connection and try again.');
        });
      return;
    }
    Alert.alert(`Block ${name}?`, 'You won’t see their videos or live streams.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          blockUser(id)
            .then(() => {
              setBlocked(true);
              // Their videos are on the screen underneath; the feed drops them on its next page.
              router.back();
            })
            .catch((e) => {
              console.warn('Block failed:', e);
              Alert.alert('Couldn’t block', 'Please check your connection and try again.');
            }),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: username ?? 'Profile',
          headerRight:
            canBlock && blocked !== null
              ? () => (
                  <Pressable accessibilityRole="button" onPress={toggleBlock} hitSlop={Spacing.two}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {blocked ? 'Unblock' : 'Block'}
                    </ThemedText>
                  </Pressable>
                )
              : undefined,
        }}
      />
      <ThemedView style={styles.screen}>
        {blocked ? (
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary">You blocked {name}.</ThemedText>
          </View>
        ) : (
          <UserVideos
            userId={id}
            own={id === user?.sub}
            // Signed-out viewers don't get usernames, so there's nothing to show above the grid.
            header={username ? <ProfileIdentity userId={id} name={username} picture={profile?.picture} /> : undefined}
          />
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
