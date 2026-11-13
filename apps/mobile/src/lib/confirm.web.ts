/**
 * The web build's confirm(): React Native Web's Alert.alert does nothing,
 * so use the browser's dialog.
 */
export async function confirm({
  title,
  message,
}: {
  title: string;
  message: string;
  confirmLabel: string;
}): Promise<boolean> {
  return globalThis.confirm(`${title}\n\n${message}`);
}
