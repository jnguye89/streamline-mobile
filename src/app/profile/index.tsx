import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { ProfileIdentity } from '@/components/profile/profile-identity';
import { UserVideos } from '@/components/profile/user-videos';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LikeColor } from '@/components/watch/heart-burst';
import { SupportEmail, TermsUrl } from '@/constants/legal';
import { Spacing } from '@/constants/theme';
import { deleteAccount, forgetUserProfile } from '@/data/users';
import { useAuthActions } from '@/hooks/use-auth-actions';
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
  const { signOut } = useAuthActions();

  const confirmLogOut = () =>
    Alert.alert('Log out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          // Nothing left to show here once signed out; back to the feed.
          router.back();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: name ?? 'Profile',
          headerRight: user
            ? () => (
                <View style={styles.headerActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={confirmLogOut}
                    hitSlop={Spacing.two}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Log out
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/go-live')}
                    style={({ pressed }) => [styles.goLive, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.goLiveText}>
                      Go live
                    </ThemedText>
                  </Pressable>
                </View>
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
            footer={
              <View style={styles.footer}>
                <View style={styles.links}>
                  <FooterLink label="Blocked users" onPress={() => router.push('/blocked-users')} />
                  <FooterLink label="Terms of Use" onPress={() => Linking.openURL(TermsUrl)} />
                  <FooterLink label="Contact us" onPress={() => Linking.openURL(`mailto:${SupportEmail}`)} />
                </View>
                <DeleteAccountButton userId={user.sub} />
              </View>
            }
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

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={Spacing.two}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * Deletes the account from inside the app, as the App Store requires of apps you can sign up
 * in. Kept at the bottom of the page, away from Log out, and confirmed first.
 */
function DeleteAccountButton({ userId }: { userId: string }) {
  const { signOut } = useAuthActions();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (e) {
      console.warn('Account deletion failed:', e);
      setDeleting(false);
      Alert.alert('Couldn’t delete your account', 'Please check your connection and try again.');
      return;
    }
    forgetUserProfile(userId);
    await signOut();
    router.back();
    Alert.alert('Your account has been deleted.');
  };

  const confirm = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, videos and likes. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ]
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: deleting, disabled: deleting }}
      disabled={deleting}
      onPress={confirm}
      hitSlop={Spacing.two}
      style={({ pressed }) => [styles.deleteAccount, pressed && styles.pressed]}>
      {deleting ? (
        <ActivityIndicator color={LikeColor} />
      ) : (
        <ThemedText type="smallBold" style={styles.deleteAccountText}>
          Delete account
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  deleteAccount: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  deleteAccountText: {
    color: LikeColor,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
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
