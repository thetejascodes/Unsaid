import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { connectSocket, sendEvent } from "../../lib/ws-client";
import { useAuth } from "../../lib/auth-context";
import { getAccessToken } from "../../lib/api";
import { colors, typography, spacing, radii, fontFamily } from "../../lib/theme";
import { DuskBackground } from "../../components/DuskBackground";

type Status = "idle" | "queued" | "matched";

const MOODS = [
  { value: "lonely", label: "Lonely", emoji: "🌙" },
  { value: "heartbroken", label: "Heartbroken", emoji: "💔" },
  { value: "anxious", label: "Anxious", emoji: "🌀" },
  { value: "overwhelmed", label: "Overwhelmed", emoji: "🌊" },
  { value: "just_venting", label: "Just venting", emoji: "💭" },
  { value: "need_advice", label: "Need advice", emoji: "🕯️" },
  { value: "bored", label: "Bored", emoji: "☁️" },
  { value: "okay", label: "Just okay", emoji: "🍃" },
];

const INTERESTS = ["Music", "Art", "Sports", "Gaming", "Reading", "Cooking"];

export default function MoodPicker() {
  const router = useRouter();
  const { logout } = useAuth();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const accessToken = getAccessToken();
    const socket = connectSocket(accessToken, handleSocketMessage);
    setWs(socket);

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const handleSocketMessage = async (event: any) => {
    switch (event.type) {
      case "QUEUED":
        setStatus("queued");
        break;
      case "MATCHED":
        setStatus("matched");
        router.push({
          pathname: "/chat/[roomId]",
          params: {
            roomId: event.roomId,
            partnerId: event.partnerId,
            partnerMood: event.partnerMood,
          },
        });
        break;
      case "SESSION_REVOKED":
        Alert.alert(
          "Session Revoked",
          "Your session has been revoked. Please log in again.",
        );
        await logout();
        router.replace("/phone-login");
        break;
      case "ERROR":
        Alert.alert("Something went wrong", event.message || "Please try again.");
        break;
      default:
        break;
    }
  };

  const handleJoinQueue = () => {
    if (!selectedMood) {
      Alert.alert("Pick how you're feeling first");
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendEvent(ws, "JOIN_QUEUE", {
        mood: selectedMood,
        interests: selectedInterests,
      });
    } else {
      Alert.alert("Not connected", "Reconnecting — try again in a moment.");
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  return (
    <DuskBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>unsaid</Text>
          <Pressable onPress={() => router.push("/profile")} hitSlop={8} style={styles.profileButton}>
            <Feather name="user" size={16} color={colors.tide} />
          </Pressable>
        </View>
        <Text style={styles.title}>what's sitting with you tonight?</Text>
        <Text style={styles.subtitle}>
          someone else is probably feeling it too.
        </Text>

        <View style={styles.section}>
          <View style={styles.moodGrid}>
            {MOODS.map((mood) => (
              <Pressable
                key={mood.value}
                style={[
                  styles.moodButton,
                  selectedMood === mood.value && styles.moodButtonActive,
                ]}
                onPress={() => setSelectedMood(mood.value)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.moodButtonText,
                    selectedMood === mood.value && styles.moodButtonTextActive,
                  ]}
                >
                  {mood.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>anything you'd want to talk about (optional)</Text>
          <View style={styles.interestsGrid}>
            {INTERESTS.map((interest) => (
              <Pressable
                key={interest}
                style={[
                  styles.interestTag,
                  selectedInterests.includes(interest) &&
                    styles.interestTagActive,
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestTagText,
                    selectedInterests.includes(interest) &&
                      styles.interestTagTextActive,
                  ]}
                >
                  {interest}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {status === "queued" && (
          <Text style={styles.statusText}>looking for someone who understands...</Text>
        )}

        <Pressable
          style={[
            styles.findButton,
            status === "queued" && styles.findButtonDisabled,
          ]}
          onPress={handleJoinQueue}
          disabled={status === "queued"}
        >
          <Text style={styles.findButtonText}>
            {status === "queued" ? "searching..." : "find someone"}
          </Text>
        </Pressable>
      </ScrollView>
    </DuskBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.horizon,
    textTransform: "uppercase",
  },
  profileButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(110, 156, 147, 0.35)",
    backgroundColor: "rgba(110, 156, 147, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fontFamily.logo,
    fontSize: 28,
    lineHeight: 36,
    color: colors.paper,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.fog,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.fog,
    marginBottom: spacing.md,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  moodButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(245, 237, 227, 0.15)",
    backgroundColor: "rgba(245, 237, 227, 0.05)",
  },
  moodButtonActive: {
    borderColor: colors.horizon,
    backgroundColor: "rgba(240, 149, 78, 0.15)",
  },
  moodEmoji: {
    fontSize: 15,
  },
  moodButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.fog,
  },
  moodButtonTextActive: {
    fontFamily: fontFamily.medium,
    color: colors.horizon,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  interestTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(110, 156, 147, 0.35)",
    backgroundColor: "transparent",
  },
  interestTagActive: {
    borderColor: colors.tide,
    backgroundColor: "rgba(110, 156, 147, 0.18)",
  },
  interestTagText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.tide,
  },
  interestTagTextActive: {
    fontFamily: fontFamily.medium,
    color: colors.paper,
  },
  statusText: {
    fontFamily: fontFamily.regular,
    fontStyle: "italic",
    fontSize: 14,
    color: colors.horizon,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  findButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.horizon,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  findButtonDisabled: {
    opacity: 0.5,
  },
  findButtonText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.duskDeep,
  },
});