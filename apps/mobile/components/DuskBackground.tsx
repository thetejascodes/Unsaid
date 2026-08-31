import { LinearGradient } from "expo-linear-gradient";
import { View, StyleSheet } from "react-native";
import { colors, gradient } from "../lib/theme";

export function DuskBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={gradient.dusk} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
      {/* horizon glow — the one signature visual flourish */}
      <View
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: colors.horizon,
          opacity: 0.18,
        }}
      />
      {children}
    </LinearGradient>
  );
}