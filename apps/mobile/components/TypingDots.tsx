import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { colors, radii, spacing } from "../lib/theme";

/**
 * Three-dot "partner is typing" indicator with a staggered
 * bounce loop. Replaces the plain "they're writing" caption —
 * keep that text as a fallback for screen readers via accessibilityLabel.
 */
export function TypingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = dots.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(value, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dots]);

  return (
    <View
      accessibilityLabel="they're writing"
      style={{
        flexDirection: "row",
        gap: 4,
        alignSelf: "flex-start",
        backgroundColor: "rgba(245, 237, 227, 0.08)",
        borderRadius: radii.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
      }}
    >
      {dots.map((value, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.fog,
            opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [
              { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}