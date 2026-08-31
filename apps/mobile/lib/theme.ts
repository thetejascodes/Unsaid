export const appConfig = {
  name: "Unsaid",
  tagline: "The wound that ages, aches deeper.",
  description:
    "A pseudonymous mood-matching social platform that connects people through authentic conversations.",
  version: "0.1.0",
  scheme: "unsaid",
};

export const colors = {
  ink: "#12181B",
  surface: "#1B2226",
  brineGold: "#C08B3E",
  bruisePlum: "#6B4E5A",
  parchment: "#EDE6DA",
  quietGrey: "#7D8481",
};

export const typography = {
  heading: { fontSize: 22, fontWeight: "600" as const, color: colors.parchment },
  body: { fontSize: 16, color: colors.parchment },
  caption: { fontSize: 13, color: colors.quietGrey },
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};