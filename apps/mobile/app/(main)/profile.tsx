import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { colors, typography, radii, spacing, fontFamily } from "../../lib/theme";
import { DuskBackground } from "../../components/DuskBackground";

export default function Profile() {
  const { user, logout, setUser } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const payload: { username: string; bio: string; avatarUrl?: string } = {
        username,
        bio,
      };
      if (avatarUrl.trim()) {
        payload.avatarUrl = avatarUrl.trim();
      }

      const response = await apiFetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Save failed");
      const { data } = await response.json();
      // Reflect the change everywhere in the app immediately, not just
      // on this screen — AuthContext is what other screens read from.
      setUser?.(data);
    } catch {
      setError("Couldn't save that — try again");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DuskBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontFamily: fontFamily.logo,
              fontSize: 26,
              color: colors.paper,
              marginTop: spacing.xl * 1.4,
            }}
          >
            how you show up
          </Text>
          <Text style={{ ...typography.caption, marginTop: spacing.sm, maxWidth: 280 }}>
            just enough to feel like a person, not a stranger.
          </Text>

          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ ...typography.caption, marginBottom: spacing.xs }}>name</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="what should they call you?"
              placeholderTextColor={colors.fog}
              style={{
                fontFamily: fontFamily.medium,
                color: colors.paper,
                fontSize: 16,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radii.md,
                backgroundColor: "rgba(245,237,227,0.08)",
                borderWidth: 1,
                borderColor: "rgba(245,237,227,0.15)",
              }}
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.caption, marginBottom: spacing.xs }}>avatar url</Text>
            <TextInput
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="a link to your picture (optional)"
              placeholderTextColor={colors.fog}
              autoCapitalize="none"
              keyboardType="url"
              style={{
                fontFamily: fontFamily.medium,
                color: colors.paper,
                fontSize: 16,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radii.md,
                backgroundColor: "rgba(245,237,227,0.08)",
                borderWidth: 1,
                borderColor: "rgba(245,237,227,0.15)",
              }}
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.caption, marginBottom: spacing.xs }}>a few words about you</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="whatever feels true right now"
              placeholderTextColor={colors.fog}
              multiline
              numberOfLines={4}
              maxLength={200}
              style={{
                fontFamily: fontFamily.regular,
                color: colors.paper,
                fontSize: 15,
                lineHeight: 21,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radii.md,
                backgroundColor: "rgba(245,237,227,0.08)",
                borderWidth: 1,
                borderColor: "rgba(245,237,227,0.15)",
                minHeight: 96,
                textAlignVertical: "top",
              }}
            />
          </View>

          {error && (
            <Text style={{ ...typography.caption, color: colors.wine, marginTop: spacing.md }}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.horizon,
              opacity: isSaving ? 0.6 : 1,
              paddingVertical: spacing.md,
              borderRadius: radii.lg,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: spacing.xs,
              marginTop: spacing.xl,
              shadowColor: colors.horizon,
              shadowOpacity: isSaving ? 0 : 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: isSaving ? 0 : 6,
            }}
          >
            {isSaving && <ActivityIndicator size="small" color={colors.duskDeep} />}
            <Text style={typography.label}>{isSaving ? "Saving" : "Save"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert("Log out?", "You can always come back.", [
                { text: "Stay", onPress: () => {} },
                { text: "Log out", style: "destructive", onPress: () => logout() },
              ])
            }
            style={{ alignSelf: "center", marginTop: spacing.lg, marginBottom: spacing.xl }}
          >
            <Text style={{ ...typography.caption, color: colors.tide }}>log out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </DuskBackground>
  );
}