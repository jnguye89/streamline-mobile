import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VideoTile } from '@/components/profile/video-tile';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getUserVideos, type Vod } from '@/data/videos';
import { useTheme } from '@/hooks/use-theme';

type UserVideosProps = {
  userId: string;
  /** Shown above the grid: whose profile this is. */
  header?: ReactNode;
  /** Whose videos these are, for the empty and error messages. */
  own: boolean;
};

/**
 * A user's uploaded videos as a grid, like the video list on streamline-ui's /profile pages.
 * Only one tile plays at a time, so a screenful of videos isn't all streaming at once.
 */
export function UserVideos({ userId, header, own }: UserVideosProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [videos, setVideos] = useState<Vod[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getUserVideos(userId)
      .then((list) => {
        if (!cancelled) setVideos(list);
      })
      .catch((e) => {
        console.warn('Failed to load videos:', e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  if (failed) {
    return (
      <View style={styles.centered}>
        <ThemedText themeColor="textSecondary">
          {own ? 'Couldn’t load your videos.' : 'Couldn’t load these videos.'}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.retry, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <ThemedText type="smallBold">Try again</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!videos) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.textSecondary} size="large" />
      </View>
    );
  }

  // Landscape-only app: three across on phones, two on anything narrow.
  const paddingLeft = insets.left + Spacing.three;
  const paddingRight = insets.right + Spacing.three;
  const columns = width >= 700 ? 3 : 2;
  const tileWidth = (width - paddingLeft - paddingRight - Spacing.three * (columns - 1)) / columns;

  return (
    <FlatList
      data={videos}
      key={columns}
      numColumns={columns}
      // iOS 26+ draws a translucent header over the page; inset the content below it rather
      // than letting the name and first row scroll under the back button.
      contentInsetAdjustmentBehavior="automatic"
      keyExtractor={(video) => String(video.id)}
      contentContainerStyle={{
        paddingLeft,
        paddingRight,
        paddingTop: Spacing.three,
        paddingBottom: insets.bottom + Spacing.four,
        gap: Spacing.three,
      }}
      columnWrapperStyle={{ gap: Spacing.three }}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <ThemedText type="subtitle">Videos</ThemedText>
        </View>
      }
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary">
          {own ? 'You haven’t uploaded any videos yet.' : 'No videos yet.'}
        </ThemedText>
      }
      renderItem={({ item }) => (
        <VideoTile
          video={item}
          width={tileWidth}
          playing={playingId === item.id}
          onToggle={() => setPlayingId((id) => (id === item.id ? null : item.id))}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  retry: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
