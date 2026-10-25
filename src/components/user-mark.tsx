import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/**
 * A person shown over video with no backdrop: the first letter of their name, or a generic
 * person icon while there's no name. Shared by the profile button and the video owner icon.
 */
export function UserMark({ name }: { name: string | null | undefined }) {
  if (name) {
    return (
      <ThemedText type="smallBold" style={styles.initial}>
        {name.charAt(0).toUpperCase()}
      </ThemedText>
    );
  }
  return (
    <SymbolView
      name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
      tintColor="#ffffff"
      size={32}
    />
  );
}

/**
 * Soft shadow for anything drawn straight over video without a backdrop (the profile icons,
 * the view/like counts), so it stays readable on bright frames. iOS-only; text also carries
 * its own text shadow, which Android draws too.
 */
export const OnVideoShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.5,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 0 },
} as const;

const styles = StyleSheet.create({
  initial: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
});
