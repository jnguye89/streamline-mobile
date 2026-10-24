import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { ProfileButtonSize } from '@/components/profile-button';
import { ThemedText } from '@/components/themed-text';
import { getUsername } from '@/data/users';

// Picked by hashing the owner id, so each owner keeps the same color across videos.
const COLORS = ['#E5484D', '#F76B15', '#FFC53D', '#46A758', '#12A594', '#0090FF', '#8E4EC6', '#D6409F'];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * The video owner's initial in a colored circle, sized to match the profile button; tapping
 * it opens their profile (or your own, for your own videos). The API only shares usernames
 * with signed-in callers, so anonymous viewers get a generic icon — the profile still opens.
 */
export function OwnerAvatar({ ownerId }: { ownerId: string | null }) {
  const { user } = useAuth0();
  const signedIn = !!user;
  const isMe = !!ownerId && ownerId === user?.sub;
  const [lookup, setLookup] = useState<{ ownerId: string; username: string | null } | null>(null);

  useEffect(() => {
    if (!ownerId || !signedIn) return;
    let cancelled = false;
    getUsername(ownerId).then((username) => {
      if (!cancelled) setLookup({ ownerId, username });
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId, signedIn]);

  // Ignore a result for a previous owner or from before signing out.
  const username = signedIn && ownerId && lookup?.ownerId === ownerId ? lookup.username : null;

  const openProfile = () => {
    if (!ownerId) return;
    if (isMe) router.push('/profile');
    else router.push({ pathname: '/profile/[id]', params: { id: ownerId } });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={username ? `${username}'s profile` : 'Video owner’s profile'}
      disabled={!ownerId}
      onPress={openProfile}
      style={({ pressed }) => [
        styles.circle,
        username && ownerId ? { backgroundColor: colorFor(ownerId) } : null,
        pressed && styles.pressed,
      ]}>
      {username ? (
        <ThemedText type="smallBold" style={styles.initial}>
          {username.charAt(0).toUpperCase()}
        </ThemedText>
      ) : (
        <SymbolView
          name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
          tintColor="#ffffff"
          size={26}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: ProfileButtonSize,
    height: ProfileButtonSize,
    borderRadius: ProfileButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pressed: {
    opacity: 0.7,
  },
  initial: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 22,
  },
});
