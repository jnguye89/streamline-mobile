import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Rail, Title } from '@/data/catalog';
import { useTheme } from '@/hooks/use-theme';

const POSTER_WIDTH = 140;
const WIDE_WIDTH = 240;

export function ContentRail({ rail }: { rail: Rail }) {
  const wide = rail.titles.some((title) => title.progress !== undefined);

  return (
    <View style={styles.rail}>
      <ThemedText type="smallBold" style={styles.heading}>
        {rail.heading}
      </ThemedText>
      <FlatList
        horizontal
        data={rail.titles}
        keyExtractor={(title) => title.id}
        renderItem={({ item }) => <PosterCard title={item} wide={wide} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={(wide ? WIDE_WIDTH : POSTER_WIDTH) + Spacing.three}
        decelerationRate="fast"
      />
    </View>
  );
}

function PosterCard({ title, wide }: { title: Title; wide: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title.name}, ${title.genre}`}
      style={({ pressed }) => [{ width: wide ? WIDE_WIDTH : POSTER_WIDTH }, pressed && styles.pressed]}>
      <View
        style={[
          styles.artwork,
          { backgroundColor: title.color, aspectRatio: wide ? 16 / 9 : 2 / 3 },
        ]}>
        <ThemedText type="smallBold" style={styles.artworkText} numberOfLines={2}>
          {title.name}
        </ThemedText>
        {title.progress !== undefined && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${title.progress * 100}%`, backgroundColor: theme.tint },
              ]}
            />
          </View>
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.meta}>
        {title.genre} · {title.runtime}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: Spacing.three,
  },
  list: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  artwork: {
    borderRadius: Spacing.three,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  artworkText: {
    color: '#ffffff',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressFill: {
    height: '100%',
  },
  meta: {
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
