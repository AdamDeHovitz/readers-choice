// Import each weight from its own entry point: the packages' main entry
// requires every weight and italic, and Metro would bundle all of them.
import { InriaSerif_400Regular } from "@expo-google-fonts/inria-serif/400Regular";
import { InriaSerif_700Bold } from "@expo-google-fonts/inria-serif/700Bold";
import { PlayfairDisplay_400Regular } from "@expo-google-fonts/playfair-display/400Regular";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";

/**
 * The shared typefaces (`fonts` in @readers-choice/tokens), bundled with the
 * app. React Native picks a font file by family name, not by fontWeight, so
 * each weight is its own family; use `fontFamily` below, never a bare weight.
 */
export const fontFiles = {
  InriaSerif_400Regular,
  InriaSerif_700Bold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
};

export const fontFamily = {
  body: "InriaSerif_400Regular",
  bodyBold: "InriaSerif_700Bold",
  display: "PlayfairDisplay_400Regular",
  displayBold: "PlayfairDisplay_700Bold",
} as const satisfies Record<string, keyof typeof fontFiles>;
