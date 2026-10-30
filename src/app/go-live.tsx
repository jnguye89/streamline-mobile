import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { BroadcastStudio } from '@/components/broadcast/broadcast-studio';
import { TermsAgreement } from '@/components/broadcast/terms-agreement';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { hasAcceptedTerms } from '@/data/moderation';

type TermsState = 'checking' | 'needed' | 'accepted' | 'failed';

/**
 * Going live from the phone camera. The first time, it asks for agreement to the terms of
 * use before the camera opens.
 */
export default function GoLiveScreen() {
  const { user } = useAuth0();
  const [terms, setTerms] = useState<TermsState>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    hasAcceptedTerms()
      .then((accepted) => {
        if (!cancelled) setTerms(accepted ? 'accepted' : 'needed');
      })
      .catch((e) => {
        console.warn('Couldn’t check the terms:', e);
        if (!cancelled) setTerms('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.message}>Sign in to go live.</ThemedText>
      </View>
    );
  }
  if (terms === 'accepted') return <BroadcastStudio />;
  if (terms === 'needed') return <TermsAgreement onAccepted={() => setTerms('accepted')} />;

  return (
    <View style={styles.centered}>
      {terms === 'checking' ? (
        <ActivityIndicator color="#ffffff" size="large" />
      ) : (
        <>
          <ThemedText style={styles.message}>Couldn’t get ready to go live.</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setTerms('checking');
              setAttempt((n) => n + 1);
            }}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.message}>
              Try again
            </ThemedText>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    backgroundColor: '#000000',
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
