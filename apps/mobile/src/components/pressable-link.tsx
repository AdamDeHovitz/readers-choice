import { useRouter, type Href } from "expo-router";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * A pressable surface (a card, a row) that opens another screen, dimmed
 * while pressed. Use it instead of `<Link asChild><Pressable>`: on the web
 * build, Link drops a Pressable's style function, so the surface loses its
 * background, border and padding.
 */
export function PressableLink({
  href,
  style,
  ...props
}: Omit<PressableProps, "style" | "onPress" | "accessibilityRole"> & {
  href: Href;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    />
  );
}

const styles = StyleSheet.create({ pressed: { opacity: 0.7 } });
