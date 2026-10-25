import { useEffect, useState } from 'react';
import { useAuth0 } from 'react-native-auth0';

import { getUserProfile, type UserProfile } from '@/data/users';

/**
 * A user's Streamline username and photo, or null while loading or if unavailable. The API
 * only shares these with signed-in callers, so this is always null for anonymous viewers.
 */
export function useUserProfile(userId: string | null): UserProfile | null {
  const { user } = useAuth0();
  const signedIn = !!user;
  const [lookup, setLookup] = useState<{ userId: string; profile: UserProfile | null } | null>(null);

  useEffect(() => {
    if (!userId || !signedIn) return;
    let cancelled = false;
    getUserProfile(userId).then((profile) => {
      if (!cancelled) setLookup({ userId, profile });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, signedIn]);

  // Ignore a result for a different user or from before signing out.
  return signedIn && userId && lookup?.userId === userId ? lookup.profile : null;
}

/** Just the username from useUserProfile. */
export function useUsername(userId: string | null): string | null {
  return useUserProfile(userId)?.username ?? null;
}
