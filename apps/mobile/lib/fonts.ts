// app/fonts.ts
import {
  Fraunces_500Medium_Italic,
} from "@expo-google-fonts/fraunces";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";

export function useAppFonts() {
  return useFonts({
    Fraunces_500Medium_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
}