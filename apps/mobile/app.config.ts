import type { ExpoConfig } from "expo/config";
import { colors } from "@readers-choice/tokens";

/**
 * The Readers' Choice iOS (and later Android) app. It talks to the website's
 * API (/api/v1, see docs/architecture.md); EXPO_PUBLIC_API_URL points it at a
 * local server during development.
 */
const config: ExpoConfig = {
  name: "Readers' Choice",
  slug: "readers-choice",
  version: "1.0.0",
  scheme: "readerschoice",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.dehovitz.readerschoice",
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: "com.dehovitz.readerschoice",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: colors.primary,
    },
  },
  web: { output: "single", favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 120,
        backgroundColor: colors.background,
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
