import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { sessions, useSession } from "@/auth";
import { colors, fontFamily } from "@/theme";
import { fontFiles } from "@/theme/fonts";

// Keep the splash screen up until the fonts and the saved session are
// loaded, so nothing flashes in the system font or on the wrong screen.
void SplashScreen.preventAutoHideAsync();
void sessions.restore();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const session = useSession();
  const ready =
    (fontsLoaded || fontError !== null) && session.status !== "loading";

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  const signedIn = session.status === "signedIn";

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.accent },
          headerTintColor: colors.accentForeground,
          headerTitleStyle: { fontFamily: fontFamily.displayBold },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Signed-out and signed-in screens never mix: each group is only
            reachable while its guard holds. */}
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen
            name="(auth)/sign-in"
            options={{ headerShown: false }}
          />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)/index" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
