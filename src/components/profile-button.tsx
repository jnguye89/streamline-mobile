import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthActions } from '@/hooks/use-auth-actions';

export const ProfileButtonSize = 40;

/**
 * Account button pinned to the top-right of the watch screen. Signed out it opens Auth0
 * Universal Login, which has its own sign-up link; signed in it shows the avatar and opens
 * the profile page.
 */
export function ProfileButton() {
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth0();
  const { signIn } = useAuthActions();

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
      {user?.picture ? (
        <Image source={user.picture} style={styles.avatar} contentFit="cover" />
      ) : (
        <SymbolView
          name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
          tintColor="#ffffff"
          size={26}
        />
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
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  avatar: {
    width: ProfileButtonSize,
    height: ProfileButtonSize,
  },
  pressed: {
    opacity: 0.7,
  },
});
