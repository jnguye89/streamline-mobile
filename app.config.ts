import type { ConfigContext, ExpoConfig } from 'expo/config';

// Same fallback as src/constants/auth.ts (the config loader can't import app source).
const Auth0Domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'auth.skriin.com';

/**
 * app.json holds the static config; this only points the react-native-auth0 plugin at the
 * same tenant as the JS (production by default, the dev tenant when .env.local says so).
 */
export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    plugins: config.plugins?.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'react-native-auth0'
        ? [plugin[0], { ...plugin[1], domain: Auth0Domain }]
        : plugin
    ),
  }) as ExpoConfig;
