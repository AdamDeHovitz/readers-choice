import { Alert } from "react-native";

/** Ask before a destructive action. Resolves true if the user confirms. */
export function confirm({
  title,
  message,
  confirmLabel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: "destructive",
        onPress: () => resolve(true),
      },
    ]);
  });
}
