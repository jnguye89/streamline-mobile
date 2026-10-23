import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Featured } from '@/data/catalog';
import { useTheme } from '@/hooks/use-theme';

export function FeaturedHero() {
  const theme = useTheme();

  return (
    <View style={[styles.hero, { backgroundColor: Featured.color }]}>
      <View style={styles.scrim} />
      <View style={styles.content}>
        <ThemedText type="smallBold" style={styles.eyebrow}>
          FEATURED
        </ThemedText>
        <ThemedText type="subtitle" style={styles.onImage}>
          {Featured.name}
        </ThemedText>
        <ThemedText type="small" style={styles.meta}>
          {Featured.genre} · {Featured.year} · {Featured.runtime}
        </ThemedText>
        <ThemedText type="small" style={styles.synopsis} numberOfLines={3}>
          {Featured.synopsis}
        </ThemedText>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.tint },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              tintColor={theme.onTint}
              size={16}
            />
            <ThemedText type="smallBold" style={{ color: theme.onTint }}>
              Watch now
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.button}>
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                tintColor={theme.text}
                size={16}
              />
              <ThemedText type="smallBold">My list</ThemedText>
            </ThemedView>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    aspectRatio: 21 / 9,
    minHeight: 280,
    maxHeight: 420,
    borderRadius: Spacing.four,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.85), transparent 70%)',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: 480,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  onImage: {
    color: '#ffffff',
  },
  meta: {
    color: 'rgba(255,255,255,0.8)',
  },
  synopsis: {
    color: 'rgba(255,255,255,0.9)',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
