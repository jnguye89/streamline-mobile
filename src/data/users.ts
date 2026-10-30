/**
 * User lookups against the Streamline API — mirrors streamline-ui's UserService.
 */

import { File } from 'expo-file-system';

import { apiFetch } from '@/data/api-client';

type Auth0UserDto = {
  auth0UserId: string;
  username: string;
  picture?: string | null;
};

export type UserProfile = {
  username: string | null;
  /** A real photo, or null — Auth0's generated initials avatar is left out (see below). */
  picture: string | null;
};

// The same owner turns up on many videos, so each lookup is made once per session.
const profiles = new Map<string, Promise<UserProfile | null>>();

/**
 * Username and photo for an Auth0 user id, or null if they can't be found.
 * `GET /user/auth0/:id` needs a signed-in caller, so only call this with a session.
 */
export function getUserProfile(auth0UserId: string): Promise<UserProfile | null> {
  let lookup = profiles.get(auth0UserId);
  if (!lookup) {
    lookup = apiFetch(`/user/auth0/${encodeURIComponent(auth0UserId)}`)
      .then(async (res) => {
        // No such user is an answer, not a failure: remember it rather than retrying.
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GET /user/auth0 failed with ${res.status}`);
        const user: Auth0UserDto = await res.json();
        return {
          username: user.username || null,
          picture: user.picture && !isDefaultAuth0Avatar(user.picture) ? user.picture : null,
        };
      })
      .catch((e) => {
        console.warn('Couldn’t look up user:', e);
        // Let a later view retry, e.g. after a token refresh or a network blip.
        profiles.delete(auth0UserId);
        return null;
      });
    profiles.set(auth0UserId, lookup);
  }
  return lookup;
}

/** Drops a cached profile, e.g. after uploading a new photo, so it's looked up again. */
export function forgetUserProfile(auth0UserId: string) {
  profiles.delete(auth0UserId);
}

/**
 * Permanently deletes the signed-in user's account (`DELETE /user/me`): their login, videos,
 * likes and everything else of theirs. The caller still has to sign out locally.
 */
export async function deleteAccount(): Promise<void> {
  const res = await apiFetch('/user/me', { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Account deletion failed (${res.status}): ${await res.text()}`);
  }
}

/**
 * Uploads a picked image as the signed-in user's profile picture (`POST /user/picture`), which
 * also makes it their Auth0 `picture`. Returns the new picture's URL.
 */
export async function uploadProfilePicture(uri: string): Promise<string> {
  const form = new FormData();
  // The app's fetch is Expo's, which needs a real Blob here — React Native's { uri, name, type }
  // file stand-in isn't supported. expo-file-system's File is one, and it reports its MIME type
  // (from the extension) and file name for the upload.
  form.append('file', new File(uri));

  const res = await apiFetch('/user/picture', { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  }
  const { picture }: { picture: string } = await res.json();
  return picture;
}

/**
 * Auth0 gives accounts without a photo a generated picture — initials on a colored circle —
 * served as a Gravatar link falling back to cdn.auth0.com/avatars/, or that image directly.
 * The app draws the initial itself instead.
 */
export function isDefaultAuth0Avatar(url: string) {
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {}
  return decoded.includes('cdn.auth0.com/avatars/');
}
