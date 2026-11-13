/**
 * Where the app finds the website's API. Production by default; point a dev
 * build at a local server with EXPO_PUBLIC_API_URL (e.g. http://localhost:3000),
 * which Expo inlines at build time.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://readers-choice.dehovitz.com"
).replace(/\/+$/, "");
