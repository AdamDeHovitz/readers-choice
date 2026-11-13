import { StyleSheet, View } from "react-native";
import { sessions, useSession } from "@/auth";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { space } from "@/theme";

/** Signed-in home. The next PR replaces this with the member's clubs. */
export default function Home() {
  const session = useSession();
  if (session.status !== "signedIn") return null;

  return (
    <Screen>
      <View style={styles.page}>
        <Text variant="title" accessibilityRole="header">
          Welcome, {session.user.name}
        </Text>
        <Text muted>Signed in as {session.user.email}.</Text>
        <Button
          title="Sign out"
          variant="secondary"
          onPress={() => sessions.signOut()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[4], paddingTop: space[8] },
});
