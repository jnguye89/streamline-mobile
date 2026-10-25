import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { ProfileButtonSize } from '@/components/profile-button';
import { UserMark, OnVideoShadow } from '@/components/user-mark';
import { useOpenProfile } from '@/hooks/use-open-profile';
import { useUserProfile } from '@/hooks/use-user-profile';

// Picked by hashing the owner id, so each owner keeps the same color everywhere they appear.
// Used by the profile page header.
const COLORS = ['#E5484D', '#F76B15', '#FFC53D', '#46A758', '#12A594', '#0090FF', '#8E4EC6', '#D6409F'];

export function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * The video owner's photo — or their initial, or a person icon — sized to match the profile
 * button; tapping
 * it opens their profile (or your own, for your own videos). The API only shares usernames
 * with signed-in callers, so anonymous viewers get a generic icon — the profile still opens.
 */
export function OwnerAvatar({ ownerId }: { ownerId: string | null }) {
  const profile = useUserProfile(ownerId);
  const username = profile?.username ?? null;
  const openProfile = useOpenProfile();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={username ? `${username}'s profile` : 'Video owner’s profile'}
      disabled={!ownerId}
      onPress={() => openProfile(ownerId)}
      style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
      {profile?.picture ? (
        <Image source={profile.picture} style={styles.photo} contentFit="cover" />
      ) : (
        <UserMark name={username} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: ProfileButtonSize,
    height: ProfileButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    ...OnVideoShadow,
  },
  photo: {
    width: ProfileButtonSize,
    height: ProfileButtonSize,
    borderRadius: ProfileButtonSize / 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
