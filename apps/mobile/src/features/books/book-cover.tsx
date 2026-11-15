import { Image, StyleSheet, View } from "react-native";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { colors, palette, radius, space } from "@/theme";

// The web's BookCover sizes (apps/web/components/books/book-cover.tsx).
const SIZES = {
  xs: { width: 32, height: 48, title: null },
  md: { width: 80, height: 120, title: { fontSize: 12, lines: 5 } },
} as const;

/**
 * A book's cover. Without one, the web's rust "cloth" cover: the title where
 * it fits, a book glyph at `xs`. Decorative: the title is always nearby.
 */
export function BookCover({
  coverUrl,
  title,
  size,
}: {
  coverUrl: string | null;
  title: string;
  size: keyof typeof SIZES;
}) {
  const config = SIZES[size];
  const frame = { width: config.width, height: config.height };

  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={[styles.frame, frame]}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    );
  }

  return (
    <View
      style={[styles.frame, styles.placeholder, frame]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {config.title ? (
        <Text
          numberOfLines={config.title.lines}
          style={[
            styles.title,
            {
              fontSize: config.title.fontSize,
              lineHeight: config.title.fontSize * 1.3,
            },
          ]}
        >
          {title}
        </Text>
      ) : (
        <Icon name="book-outline" size={16} color={palette.cream[50]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.sm / 2, backgroundColor: colors.muted },
  placeholder: {
    backgroundColor: palette.rust[600],
    alignItems: "center",
    justifyContent: "center",
    padding: space[2],
  },
  title: { color: palette.cream[50], textAlign: "center" },
});
