import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { GoLiveButton } from '@/components/go-live-button';
import { ProfileButton } from '@/components/profile-button';
import { ThemedText } from '@/components/themed-text';
import { WatchPager } from '@/components/watch/watch-pager';
import { Spacing } from '@/constants/theme';
import { useWatchFeed } from '@/hooks/use-watch-feed';

export default function WatchScreen() {
  // Wait for Auth0 to restore a saved session first, so the very first feed request already
  // carries the viewer's token and comes back with their likes.
  const { isLoading: authLoading } = useAuth0();

  return (
    <View style={styles.screen}>
      <StatusBar hidden />

      {authLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      ) : (
        <WatchFeed />
      )}

      <GoLiveButton />
      <ProfileButton />
    </View>
  );
}

function WatchFeed() {
  const feed = useWatchFeed();
  // The feed stays mounted under pushed screens; stop playback (and leave live channels) there.
  const focused = useIsFocused();

  return (
    <>
      {feed.current ? (
        <WatchPager
          current={feed.current}
          previousItem={feed.previousItem}
          nextItem={feed.nextItem}
          onNext={feed.next}
          onPrevious={feed.previous}
          onUpdateVod={feed.updateCurrentVod}
          onHideItem={feed.hideItem}
          onHideUser={feed.hideUser}
          focused={focused}
        />
      ) : (
        <View style={styles.centered}>
          {feed.status === 'loading' && <ActivityIndicator color="#ffffff" size="large" />}
          {feed.status === 'empty' && (
            <ThemedText style={styles.message}>Nothing to watch yet.</ThemedText>
          )}
          {feed.status === 'error' && (
            <>
              <ThemedText style={styles.message}>Couldn&apos;t load videos.</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={feed.retry}
                style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.message}>
                  Try again
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  message: {
    color: '#ffffff',
  },
  retry: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pressed: {
    opacity: 0.7,
  },
});
