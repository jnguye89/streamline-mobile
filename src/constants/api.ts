/**
 * Base URL of the Streamline API. Override per environment with `EXPO_PUBLIC_API_URL`
 * (e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npx expo start` to hit a local API
 * from a device — `localhost` on a phone or emulator is the device itself, not your machine).
 */
export const ApiBaseUrl = (process.env.EXPO_PUBLIC_API_URL || 'https://api.skriin.com').replace(/\/$/, '');