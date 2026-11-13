import * as Device from "expo-device";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { sessions } from "@/auth";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TextField } from "@/components/text-field";
import { colors, space } from "@/theme";

/**
 * Email and password sign-in (POST /api/v1/auth/password). On success the
 * root layout swaps to the signed-in screens.
 */
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await sessions.signInWithPassword({
      email,
      password,
      deviceName: Device.deviceName ?? Device.modelName ?? undefined,
    });
    // On success this screen unmounts, so only failures update it.
    if (!result.success) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.page}
      >
        <View>
          <Text variant="eyebrow" style={styles.eyebrow}>
            Book club, sorted
          </Text>
          <Text variant="hero" accessibilityRole="header">
            Readers&apos; Choice
          </Text>
          <Text variant="lead" muted style={styles.lead}>
            Sign in to see your book clubs.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {error && <Alert message={error} />}
          <Button
            title="Sign in"
            onPress={submit}
            pending={pending}
            disabled={!email.trim() || !password}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[10], paddingTop: space[12] },
  eyebrow: { color: colors.primary },
  lead: { marginTop: space[4] },
  form: { gap: space[4] },
});
