import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { colors } from "../../lib/theme";

export default function OtpVerify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiFetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!response.ok) {
        throw new Error("Invalid code");
      }
      const { data } = await response.json();
      await login(data.accessToken, data.refreshToken, data.user);
      // AuthGate in _layout.tsx handles the redirect automatically once `user` updates
    } catch (err) {
      setError("Invalid or expired code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, padding: 24, justifyContent: "center" }}>
      <Text style={{ color: colors.parchment, fontSize: 22, marginBottom: 8 }}>
        Enter the code
      </Text>
      <Text style={{ color: colors.quietGrey, marginBottom: 24 }}>
        Sent to {phone}
      </Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="6-digit code"
        placeholderTextColor={colors.quietGrey}
        keyboardType="number-pad"
        maxLength={6}
        style={{
          backgroundColor: colors.surface,
          color: colors.parchment,
          borderRadius: 12,
          padding: 14,
          fontSize: 16,
          letterSpacing: 4,
        }}
      />

      {error && (
        <Text style={{ color: colors.bruisePlum, marginTop: 12 }}>{error}</Text>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={{
          backgroundColor: colors.brineGold,
          opacity: isSubmitting ? 0.6 : 1,
          padding: 16,
          borderRadius: 12,
          marginTop: 20,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: "600" }}>
          {isSubmitting ? "Verifying..." : "Verify"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}