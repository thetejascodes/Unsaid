import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useRef } from "react";
import { View, TextInput, Text, TouchableOpacity, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { colors, typography, radii, spacing, fontFamily } from "../../lib/theme";
import { DuskBackground } from "../../components/DuskBackground";

const CODE_LENGTH = 6;

export default function OtpVerify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { login } = useAuth();
  const router = useRouter();
  const isValid = code.length === CODE_LENGTH;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await apiFetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!response.ok) throw new Error("Invalid code");
      const { data } = await response.json();
      await login(data.accessToken, data.refreshToken, data.user);
    } catch {
      setError("That code didn't match — check and try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResent(false);
    try {
      await apiFetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      setResent(true);
    } catch {
      setError("Couldn't send it again — try in a moment");
    }
  };

  return (
    <DuskBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.xl * 1.4 }}>
            <Text style={{ ...typography.caption, color: colors.tide }}>Change number</Text>
          </TouchableOpacity>

          <View style={{ marginTop: spacing.xl }}>
            <Text style={typography.headline}>Enter the code</Text>
            <Text style={{ ...typography.caption, marginTop: spacing.sm }}>Sent to {phone}</Text>
          </View>

          <Pressable onPress={() => inputRef.current?.focus()} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl }}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const digit = code[i];
              const isActive = i === code.length;
              return (
                <View
                  key={i}
                  style={{
                    width: 44,
                    height: 54,
                    borderRadius: radii.sm,
                    backgroundColor: "rgba(245,237,227,0.08)",
                    borderWidth: 1,
                    borderColor: isActive ? colors.horizon : "rgba(245,237,227,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bold, fontSize: 22, color: colors.paper }}>{digit ?? ""}</Text>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH)); if (error) setError(null); }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            autoFocus
            style={{ position: "absolute", opacity: 0, height: 0, width: 0 }}
          />

          {error && <Text style={{ ...typography.caption, color: colors.wine, marginTop: spacing.md }}>{error}</Text>}

          <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl }}>
            <TouchableOpacity onPress={handleResend} style={{ alignSelf: "center", marginBottom: spacing.lg }}>
              <Text style={{ ...typography.caption, color: colors.tide }}>{resent ? "Sent again" : "Send it again"}</Text>
            </TouchableOpacity>

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
              <Text style={typography.label}>{isSubmitting ? "Checking" : "Continue"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DuskBackground>
  );
}