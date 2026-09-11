import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View, TextInput, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from "react-native";
import { apiFetch } from "../../lib/api";
import { colors, typography, radii, spacing, fontFamily, appConfig } from "../../lib/theme";
import { DuskBackground } from "../../components/DuskBackground";
import { FadeInUp } from "../../components/FadeInUp";

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const isValid = phone.trim().length >= 7;

  // Animated focus ring: 0 = resting border, 1 = focused glow.
  const focusAnim = useRef(new Animated.Value(0)).current;
  const animateFocus = (toValue: number) => {
    Animated.timing(focusAnim, { toValue, duration: 220, useNativeDriver: false }).start();
  };

  const borderColor = error
    ? colors.wine
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(245,237,227,0.15)", colors.horizon],
      });
  const shadowOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      router.push({ pathname: "/otp-verify", params: { phone } });
    } catch {
      setError("That number didn't go through — try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DuskBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <FadeInUp delay={0}>
            <Text style={{ fontFamily: fontFamily.logo, fontSize: 26, color: colors.paper, marginTop: spacing.xl * 1.4 }}>
              {appConfig.name}
            </Text>
          </FadeInUp>

          <FadeInUp delay={80} style={{ marginTop: spacing.xl }}>
            <Text style={typography.headline}>What's your number?</Text>
            <Text style={{ ...typography.caption, marginTop: spacing.sm, maxWidth: 260 }}>
              We'll text a code. Nothing else — not even a hello.
            </Text>
          </FadeInUp>

          <FadeInUp delay={160} style={{ marginTop: spacing.xl }}>
            <Animated.View
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor,
                shadowColor: colors.horizon,
                shadowOpacity,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <TextInput
                value={phone}
                onChangeText={(t) => { setPhone(t); if (error) setError(null); }}
                onFocus={() => { setIsFocused(true); animateFocus(1); }}
                onBlur={() => { setIsFocused(false); animateFocus(0); }}
                placeholder="+91 724 567 8900"
                placeholderTextColor={colors.fog}
                keyboardType="phone-pad"
                autoFocus
                style={{
                  fontFamily: fontFamily.medium,
                  color: colors.paper,
                  fontSize: 18,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: "rgba(245,237,227,0.08)",
                }}
              />
            </Animated.View>
            {error && <Text style={{ ...typography.caption, color: colors.wine, marginTop: spacing.sm }}>{error}</Text>}
          </FadeInUp>

          <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl }}>
            <FadeInUp delay={240}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isValid || isSubmitting}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.horizon,
                  opacity: !isValid ? 0.4 : 1,
                  paddingVertical: spacing.md,
                  borderRadius: radii.lg,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: spacing.xs,
                  shadowColor: colors.horizon,
                  shadowOpacity: isValid ? 0.45 : 0,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: isValid ? 6 : 0,
                }}
              >
                {isSubmitting && <ActivityIndicator size="small" color={colors.duskDeep} />}
                <Text style={typography.label}>{isSubmitting ? "Sending" : "Send the code"}</Text>
              </TouchableOpacity>
            </FadeInUp>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DuskBackground>
  );
}