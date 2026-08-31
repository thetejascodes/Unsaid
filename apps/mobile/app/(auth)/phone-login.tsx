import { useRouter } from "expo-router";
import { useState } from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import { apiFetch } from "../../lib/api";
import { colors } from "../../lib/theme";

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      router.push({ pathname: "/otp-verify", params: { phone } });
    } catch (error) {
      setError("Couldn't send code, try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, padding: 24, justifyContent: "center" }}>
      <Text style={{ color: colors.parchment, fontSize: 22, marginBottom: 24 }}>
        What's your number?
      </Text>

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number"
        placeholderTextColor={colors.quietGrey}
        keyboardType="phone-pad"
        style={{
          backgroundColor: colors.surface,
          color: colors.parchment,
          borderRadius: 12,
          padding: 14,
          fontSize: 16,
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
          {isSubmitting ? "Sending..." : "Send code"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}