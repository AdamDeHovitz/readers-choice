import { StyleSheet, View } from "react-native";
import type { OperationError } from "@/api/operation-error";
import { space } from "@/theme";
import { Alert } from "./alert";
import { Button } from "./button";

/** A failed load, with a way to try again. */
export function QueryError({
  error,
  retry,
}: {
  error: OperationError;
  retry: () => void;
}) {
  return (
    <View style={styles.box}>
      <Alert message={error.message} />
      <Button title="Try again" variant="secondary" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({ box: { gap: space[3] } });
