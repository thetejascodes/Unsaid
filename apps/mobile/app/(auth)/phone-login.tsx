// app/(auth)/phone-login.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { apiFetch } from "../../lib/api";
import { colors, typography, radii, spacing, fontFamily, appConfig } from "../../lib/theme";
import { DuskBackground } from "../../components/DuskBackground";

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isValid = phone.trim().length >= 7;

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
          <Text style={{ fontFamily: fontFamily.logo, fontSize: 26, color: colors.paper, marginTop: spacing.xl * 1.4 }}>
            {appConfig.name}
          </Text>

          <View style={{ marginTop: spacing.xl }}>
            <Text style={typography.headline}>What's your number?</Text>
            <Text style={{ ...typography.caption, marginTop: spacing.sm, maxWidth: 260 }}>
              We'll text a code. Nothing else — not even a hello.
            </Text>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <TextInput
              value={phone}
              onChangeText={(t) => { setPhone(t); if (error) setError(null); }}
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
                borderWidth: 1,
                borderColor: error ? colors.wine : "rgba(245,237,227,0.15)",
              }}
            />
            {error && <Text style={{ ...typography.caption, color: colors.wine, marginTop: spacing.sm }}>{error}</Text>}
          </View>

          <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl }}>
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </DuskBackground>
  );
}