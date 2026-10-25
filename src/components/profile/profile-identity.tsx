import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { ThemedText } from '@/components/themed-text';
import { colorFor } from '@/components/watch/owner-avatar';
import { Spacing } from '@/constants/theme';
import { forgetUserProfile, isDefaultAuth0Avatar, uploadProfilePicture } from '@/data/users';
import { useTheme } from '@/hooks/use-theme';

const AVATAR = 64;
const BADGE = 26;

type ProfileIdentityProps = {
  userId: string;
  name: string | null;
  /** Their photo, if any (Auth0's generated initials avatar is ignored). */
  picture?: string | null;
  /** Your own profile: a pencil on the avatar lets you upload a new photo. */
  editable?: boolean;
};

/** Avatar and name at the top of a profile page. */
export function ProfileIdentity({ userId, name, picture, editable }: ProfileIdentityProps) {
  const theme = useTheme();
  const { getCredentials } = useAuth0();
  const [uploading, setUploading] = useState(false);
  // Shown straight away after an upload, before the refreshed session carries it.
  const [uploaded, setUploaded] = useState<string | null>(null);

  const photo = uploaded ?? (picture && !isDefaultAuth0Avatar(picture) ? picture : null);

  const changePhoto = async () => {
    // Opening the library needs no permission prompt; iOS crops to a square.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const url = await uploadProfilePicture(result.assets[0].uri);
      setUploaded(url);
      // The owner icon on your own videos looks you up too; make it fetch the new photo.
      forgetUserProfile(userId);
      // A fresh ID token carries the new picture, so the avatar on the watch screen updates
      // too. If that fails, it still shows up after the next login.
      await getCredentials(undefined, undefined, undefined, true).catch((e) =>
        console.warn('Couldn’t refresh the session after a photo upload:', e)
      );
    } catch (e) {
      console.warn('Profile picture upload failed:', e);
      Alert.alert('Couldn’t update your photo', 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const avatar = photo ? (
    <Image source={photo} style={styles.avatar} contentFit="cover" />
  ) : (
    <View style={[styles.avatar, styles.initialCircle, { backgroundColor: colorFor(userId) }]}>
      <ThemedText type="subtitle" style={styles.initial}>
        {(name ?? '?').charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );

  return (
    <View style={styles.identity}>
      {editable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          disabled={uploading}
          onPress={changePhoto}
          style={({ pressed }) => pressed && styles.pressed}>
          {avatar}
          {uploading && (
            <View style={[styles.avatar, styles.uploading]}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: theme.tint, borderColor: theme.background }]}>
            <SymbolView
              name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              tintColor={theme.onTint}
              size={13}
            />
          </View>
        </Pressable>
      ) : (
        avatar
      )}
      {name && (
        <ThemedText type="title" numberOfLines={1} style={styles.name}>
          {name}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  initialCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#ffffff',
  },
  uploading: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
