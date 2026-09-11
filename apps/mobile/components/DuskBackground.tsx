import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { colors, gradient } from "../lib/theme";

export function DuskBackground({ children }: { children: React.ReactNode }) {
  // Slow breathing loop on the glow — scale + opacity drift, ~7s per cycle.
  // useNativeDriver: true is safe here since we only animate opacity/transform.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.27] });

  return (
    <LinearGradient colors={gradient.dusk} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
      {/* horizon glow — the one signature visual flourish, now breathing */}
      <Animated.View
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: colors.horizon,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      />
      {children}
    </LinearGradient>
  );
}