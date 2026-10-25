import { router } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';

/**
 * Opens a user's profile page, or the signed-in user's own page when it's them. Used by the
 * owner icon on a video and by swiping up on it.
 */
export function useOpenProfile() {
  const { user } = useAuth0();

  return (userId: string | null) => {
    if (!userId) return;
    if (userId === user?.sub) router.push('/profile');
    else router.push({ pathname: '/profile/[id]', params: { id: userId } });
  };
}
