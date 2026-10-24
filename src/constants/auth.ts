/**
 * Auth0 settings. Defaults are production — the same tenant and API audience streamline-ui
 * uses — so TestFlight/App Store builds never need any configuration. For local development,
 * `.env.local` points these at the dev tenant instead (see .env.local.example).
 *
 * Each tenant needs its own **Native** Auth0 application (not the web SPA client); client ids
 * aren't secrets. Its Allowed Callback URLs and Allowed Logout URLs need, per tenant domain:
 *   skriin://{domain}/ios/com.siliconvalley.skriin/callback
 *   skriin://{domain}/android/com.siliconvalley.skriin/callback
 */

const ProdDomain = 'auth.skriin.com';
const ProdClientId = '4gGYQAkweZZZ0sZDR0Tw7eKgAhOc2UWT';
const ProdAudience = 'https://api.skriin.com/';

const overrideDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;

export const Auth0Domain = overrideDomain || ProdDomain;
// The production client id only works against the production tenant, so pointing at another
// tenant without its client id leaves sign-in unconfigured rather than quietly broken.
export const Auth0ClientId =
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || (overrideDomain ? '' : ProdClientId);
export const Auth0Audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || ProdAudience;
// Must match `customScheme` for the react-native-auth0 plugin in app.config.ts.
export const Auth0Scheme = 'skriin';
