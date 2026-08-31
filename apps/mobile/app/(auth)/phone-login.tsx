import { useRouter } from "expo-router";
import { useState } from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import { apiFetch } from "../../lib/api";

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
    <View style={{ padding: 20, marginTop: 100 }}>
      <Text>Enter your phone number</Text>

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number"
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 12,
        }}
      />

      {error && <Text style={{ color: "red", marginTop: 8 }}>{error}</Text>}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={{
          backgroundColor: isSubmitting ? "#999" : "#333",
          padding: 14,
          borderRadius: 8,
          marginTop: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff" }}>
          {isSubmitting ? "Sending..." : "Send code"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
