import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Auth0Provider } from 'react-native-auth0';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ApiAuthBridge } from '@/components/api-auth-bridge';
import { Auth0ClientId, Auth0Domain } from '@/constants/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <Auth0Provider domain={Auth0Domain} clientId={Auth0ClientId}>
      <ApiAuthBridge />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </GestureHandlerRootView>
    </Auth0Provider>
  );
}
