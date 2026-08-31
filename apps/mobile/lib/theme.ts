// lib/theme.ts
export const appConfig = {
  name: "Unsaid",
  tagline: "The wound that ages, aches deeper.",
  scheme: "unsaid",
};

export const colors = {
  duskDeep: "#1B1032",
  duskMid: "#3A1F3D",
  duskWarm: "#5C2A2E",
  horizon: "#F0954E",
  paper: "#F5EDE3",
  tide: "#6E9C93",
  fog: "#B8A9AE",
  wine: "#B5556B", // errors
};

export const gradient = {
  dusk: [colors.duskDeep, colors.duskMid, colors.duskWarm] as const,
};

export const fontFamily = {
  logo: "Fraunces_500Medium_Italic",
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
};

export const typography = {
  headline: { fontFamily: fontFamily.bold, fontSize: 30, lineHeight: 37, color: colors.paper },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22, color: colors.paper },
  caption: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: colors.fog },
  label: { fontFamily: fontFamily.semibold, fontSize: 16, color: colors.duskDeep },
};

export const radii = { sm: 8, md: 14, lg: 28 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 28, xl: 44 };