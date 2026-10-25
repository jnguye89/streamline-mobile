import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileButtonSize } from '@/components/profile-button';
import { OnVideoShadow } from '@/components/user-mark';
import { Spacing } from '@/constants/theme';
import { useAuthActions } from '@/hooks/use-auth-actions';

/**
 * Shortcut to the go-live studio, pinned to the top-left of the watch screen opposite the
 * profile button. Going live needs an account, so signed out it opens login first.
 */
export function GoLiveButton() {
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth0();
  const { signIn } = useAuthActions();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={user ? 'Go live' : 'Log in to go live'}
      disabled={isLoading}
      onPress={user ? () => router.push('/go-live') : signIn}
      style={({ pressed }) => [
        styles.button,
        { top: insets.top + Spacing.three, left: insets.left + Spacing.three },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }}
        tintColor="#ffffff"
        size={26}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: ProfileButtonSize,
    height: ProfileButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    ...OnVideoShadow,
  },
  pressed: {
    opacity: 0.7,
  },
});
