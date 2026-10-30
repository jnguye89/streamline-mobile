import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { LikeColor } from '@/components/watch/heart-burst';
import { TermsUrl } from '@/constants/legal';
import { Spacing } from '@/constants/theme';
import { acceptTerms } from '@/data/moderation';

/**
 * Shown the first time someone goes to post: they agree to the terms of use, which rule out
 * objectionable content and abusive behavior — App Store guideline 1.2.
 */
export function TermsAgreement({ onAccepted }: { onAccepted: () => void }) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const agree = async () => {
    setSaving(true);
    try {
      await acceptTerms();
    } catch (e) {
      console.warn('Accepting the terms failed:', e);
      setSaving(false);
      Alert.alert('Couldn’t save that', 'Please check your connection and try again.');
      return;
    }
    onAccepted();
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + Spacing.four,
          paddingLeft: insets.left + Spacing.five,
          paddingRight: insets.right + Spacing.five,
        },
      ]}>
      <ThemedText type="subtitle" style={styles.text}>
        Before you go live
      </ThemedText>
      <ThemedText style={[styles.text, styles.body]}>
        skriin is for everyone. By posting you agree to our Terms of Use: no nudity or sexual
        content, violence, harassment, hate or spam. Content that breaks them is removed, and
        accounts that break them are banned.
      </ThemedText>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TermsUrl)} hitSlop={8}>
        <ThemedText type="smallBold" style={styles.link}>
          Read the Terms of Use
        </ThemedText>
      </Pressable>
      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.text}>
            Not now
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={agree}
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText type="smallBold" style={styles.text}>
              I agree
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    backgroundColor: '#000000',
  },
  text: {
    color: '#ffffff',
    textAlign: 'center',
  },
  body: {
    maxWidth: 560,
  },
  link: {
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  button: {
    minWidth: 140,
    height: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: LikeColor,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pressed: {
    opacity: 0.7,
  },
});
