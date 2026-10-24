/**
 * User lookups against the Streamline API — mirrors streamline-ui's UserService.
 */

import { apiFetch } from '@/data/api-client';

type Auth0UserDto = {
  auth0UserId: string;
  username: string;
};

// The same owner turns up on many videos, so each lookup is made once per session.
const usernames = new Map<string, Promise<string | null>>();

/**
 * Username for an Auth0 user id, or null if it can't be found. `GET /user/auth0/:id` needs a
 * signed-in caller, so only call this with a session.
 */
export function getUsername(auth0UserId: string): Promise<string | null> {
  let lookup = usernames.get(auth0UserId);
  if (!lookup) {
    lookup = apiFetch(`/user/auth0/${encodeURIComponent(auth0UserId)}`)
      .then(async (res) => {
        // No such user is an answer, not a failure: remember it rather than retrying.
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GET /user/auth0 failed with ${res.status}`);
        const user: Auth0UserDto = await res.json();
        return user.username || null;
      })
      .catch((e) => {
        console.warn('Couldn’t look up video owner:', e);
        // Let a later view retry, e.g. after a token refresh or a network blip.
        usernames.delete(auth0UserId);
        return null;
      });
    usernames.set(auth0UserId, lookup);
  }
  return lookup;
}
