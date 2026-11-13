import { Pressable, StyleSheet, View } from "react-native";
import { colors, palette, radius, space } from "@/theme";
import { Text } from "./text";

/** A row of mutually exclusive options, like the website's filter tabs. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Names the group for screen readers. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={styles.group}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text
              variant="bodyBold"
              style={[
                styles.label,
                {
                  color: selected ? colors.accentForeground : palette.sage[800],
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    gap: space[1],
    padding: space[1],
    borderRadius: radius.md,
    backgroundColor: palette.sage[100],
  },
  option: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.accent },
  label: { fontSize: 14 },
});
