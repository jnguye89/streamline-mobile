import { SymbolView } from 'expo-symbols';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { OnVideoShadow } from '@/components/user-mark';
import { blockUser, report, ReportReasons, type ReportTarget } from '@/data/moderation';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { useUsername } from '@/hooks/use-user-profile';

type ContentMenuButtonProps = {
  target: ReportTarget;
  /** Whose video or stream it is. */
  ownerId: string | null;
  /** "video" or "live stream", for the wording. */
  noun: string;
  /** Reported: this one item should leave the feed. */
  onReported: () => void;
  /** Blocked: everything of theirs should leave the feed. */
  onBlocked: (userId: string) => void;
};

/**
 * The ⋯ on a video or live stream: report it, or block whoever posted it — what the App Store
 * requires of apps with user content. Not shown on your own content. Both need an account,
 * so signed out it asks you to log in first.
 */
export function ContentMenuButton({ target, ownerId, noun, onReported, onBlocked }: ContentMenuButtonProps) {
  const { user } = useAuth0();
  const { signIn } = useAuthActions();
  const ownerName = useUsername(ownerId) ?? 'this user';

  if (ownerId && ownerId === user?.sub) return null;

  const fail = (what: string, e: unknown) => {
    console.warn(`${what} failed:`, e);
    Alert.alert(`Couldn’t ${what.toLowerCase()}`, 'Please check your connection and try again.');
  };

  const chooseReason = () =>
    Alert.alert(`Why are you reporting this ${noun}?`, undefined, [
      ...ReportReasons.map((reason) => ({
        text: reason.label,
        onPress: async () => {
          try {
            await report(target, reason.value);
          } catch (e) {
            fail('Report', e);
            return;
          }
          onReported();
          Alert.alert(
            'Thanks for letting us know',
            `We’ll review this ${noun} within 24 hours. You won’t see it again.`
          );
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);

  const confirmBlock = (blockedId: string) =>
    Alert.alert(
      `Block ${ownerName}?`,
      'You won’t see their videos or live streams. You can unblock them from your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(blockedId);
            } catch (e) {
              fail('Block', e);
              return;
            }
            onBlocked(blockedId);
          },
        },
      ]
    );

  const open = () => {
    if (!user) {
      Alert.alert('Log in to report or block', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log in', onPress: signIn },
      ]);
      return;
    }
    showMenu([
      { label: `Report ${noun}`, onPress: chooseReason },
      ...(ownerId ? [{ label: `Block ${ownerName}`, destructive: true, onPress: () => confirmBlock(ownerId) }] : []),
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`More options for this ${noun}`}
      hitSlop={8}
      onPress={open}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
        tintColor="#ffffff"
        size={24}
      />
    </Pressable>
  );
}

type MenuOption = { label: string; destructive?: boolean; onPress: () => void };

/** An action sheet on iOS; Android has none built in, so a dialog with the same choices. */
function showMenu(options: MenuOption[]) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...options.map((o) => o.label), 'Cancel'],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: options.flatMap((o, i) => (o.destructive ? [i] : [])),
      },
      (index) => options[index]?.onPress()
    );
    return;
  }
  Alert.alert('Options', undefined, [
    ...options.map((o) => ({ text: o.label, style: o.destructive ? ('destructive' as const) : undefined, onPress: o.onPress })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...OnVideoShadow,
  },
  pressed: {
    opacity: 0.7,
  },
});
