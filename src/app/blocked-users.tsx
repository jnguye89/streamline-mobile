import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserMark } from '@/components/user-mark';
import { colorFor } from '@/components/watch/owner-avatar';
import { Spacing } from '@/constants/theme';
import { type BlockedUser, getBlockedUsers, unblockUser } from '@/data/moderation';
import { isDefaultAuth0Avatar } from '@/data/users';
import { useTheme } from '@/hooks/use-theme';

const AVATAR = 40;

/** Everyone you've blocked, each with an Unblock button. Reached from your profile. */
export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBlockedUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((e) => {
        console.warn('Couldn’t load blocked users:', e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unblock = (blocked: BlockedUser) =>
    unblockUser(blocked.auth0UserId)
      .then(() => setUsers((list) => list?.filter((u) => u.auth0UserId !== blocked.auth0UserId) ?? null))
      .catch((e) => {
        console.warn('Unblock failed:', e);
        Alert.alert('Couldn’t unblock', 'Please check your connection and try again.');
      });

  if (!users) {
    return (
      <ThemedView style={styles.centered}>
        {failed ? (
          <ThemedText themeColor="textSecondary">Couldn’t load blocked users.</ThemedText>
        ) : (
          <ActivityIndicator color={theme.textSecondary} />
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={users}
        keyExtractor={(u) => u.auth0UserId}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingLeft: insets.left + Spacing.three,
          paddingRight: insets.right + Spacing.three,
          paddingTop: Spacing.three,
          paddingBottom: insets.bottom + Spacing.four,
          gap: Spacing.three,
        }}
        ListEmptyComponent={<ThemedText themeColor="textSecondary">You haven’t blocked anyone.</ThemedText>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.picture && !isDefaultAuth0Avatar(item.picture) ? (
              <Image source={{ uri: item.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colorFor(item.auth0UserId) }]}>
                <UserMark name={item.username} />
              </View>
            )}
            <ThemedText style={styles.name} numberOfLines={1}>
              {item.username}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unblock ${item.username}`}
              onPress={() => unblock(item)}
              style={({ pressed }) => [
                styles.unblock,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Unblock</ThemedText>
            </Pressable>
          </View>
        )}
      />
    </ThemedView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: {
    flex: 1,
  },
  unblock: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
