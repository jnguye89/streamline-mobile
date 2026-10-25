import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserMark, OnVideoShadow } from '@/components/user-mark';
import { Spacing } from '@/constants/theme';
import { isDefaultAuth0Avatar } from '@/data/users';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { useUsername } from '@/hooks/use-user-profile';

export const ProfileButtonSize = 40;

/**
 * Account button pinned to the top-right of the watch screen. Signed out it opens Auth0
 * Universal Login, which has its own sign-up link; signed in it shows your photo (or your
 * initial) and opens the profile page.
 */
export function ProfileButton() {
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth0();
  const { signIn } = useAuthActions();
  // Same name the profile page shows: your Streamline username, else Auth0's profile.
  const username = useUsername(user?.sub ?? null);
  const name = username ?? user?.nickname ?? user?.name;
  const photo = user?.picture && !isDefaultAuth0Avatar(user.picture) ? user.picture : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={user ? 'Your profile' : 'Log in or sign up'}
      disabled={isLoading}
      onPress={user ? () => router.push('/profile') : signIn}
      style={({ pressed }) => [
        styles.button,
        { top: insets.top + Spacing.three, right: insets.right + Spacing.three },
        pressed && styles.pressed,
      ]}>
      {photo ? (
        <Image source={photo} style={styles.avatar} contentFit="cover" />
      ) : (
        <UserMark name={user ? name : null} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: ProfileButtonSize,
    height: ProfileButtonSize,
    borderRadius: ProfileButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...OnVideoShadow,
  },
  avatar: {
    width: ProfileButtonSize,
    height: ProfileButtonSize,
    borderRadius: ProfileButtonSize / 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
