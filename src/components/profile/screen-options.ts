/**
 * Stack options for profile pages. Profiles are reached by swiping up on a video, so they
 * slide up from the bottom and swipe back down to close — following the gesture, rather than
 * the default sideways push.
 */
export const ProfileScreenOptions = {
  // The rest of the app is full-screen video; profiles get a header so there's a way back.
  headerShown: true,
  headerBackTitle: 'Watch',
  animation: 'slide_from_bottom',
  // iOS: dismiss by dragging down. Only from the top edge, so scrolling back up through the
  // video grid doesn't close the page.
  gestureDirection: 'vertical',
  fullScreenGestureEnabled: false,
} as const;
