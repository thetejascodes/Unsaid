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
import { connectSocket, sendEvent } from "../../lib/ws-client";
import { useAuth } from "../../lib/auth-context";
import { getAccessToken } from "../../lib/api";
import { colors, typography, spacing, radii } from "../../lib/theme";
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
      console.log("MOOD PICKER RECEIVED:", event.type, event);
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
        Alert.alert("Error", event.message || "An error occurred");
        break;
      default:
        break;
    }
  };

  const handleJoinQueue = () => {
  console.log("JOIN QUEUE TAPPED. ws exists:", !!ws, "readyState:", ws?.readyState);
  if (!selectedMood) {
    Alert.alert("Please select a mood");
    return;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendEvent(ws, "JOIN_QUEUE", {
      mood: selectedMood,
      interests: selectedInterests,
    });
  } else {
    Alert.alert("Connection Error", "WebSocket is not connected");
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
        <Text style={styles.title}>How are you feeling?</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Mood</Text>
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
                <Text
                  style={[
                    styles.moodButtonText,
                    selectedMood === mood.value && styles.moodButtonTextActive,
                  ]}
                >
                  {mood.emoji} {mood.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests (Optional)</Text>
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

        {/* Status Text */}
        {status === "queued" && (
          <Text style={styles.statusText}>Waiting for a match...</Text>
        )}

        {/* Find Match Button */}
        <Pressable
          style={[
            styles.findButton,
            status === "queued" && styles.findButtonDisabled,
          ]}
          onPress={handleJoinQueue}
          disabled={status === "queued"}
        >
          <Text style={styles.findButtonText}>
            {status === "queued" ? "Searching..." : "Find a Match"}
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
    paddingVertical: spacing.xl,
  },
  title: {
    ...typography.headline,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.body,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  moodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.fog,
    backgroundColor: "transparent",
    minWidth: 90,
    alignItems: "center",
  },
  moodButtonActive: {
    borderColor: colors.horizon,
    backgroundColor: colors.horizon,
  },
  moodButtonText: {
    ...typography.body,
    color: colors.fog,
  },
  moodButtonTextActive: {
    color: colors.duskDeep,
    fontWeight: "600",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  interestTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.tide,
    backgroundColor: "transparent",
  },
  interestTagActive: {
    borderColor: colors.tide,
    backgroundColor: colors.tide,
  },
  interestTagText: {
    ...typography.caption,
    color: colors.tide,
  },
  interestTagTextActive: {
    color: colors.duskDeep,
    fontWeight: "600",
  },
  statusText: {
    ...typography.body,
    color: colors.horizon,
    textAlign: "center",
    marginVertical: spacing.lg,
  },
  findButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.horizon,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  findButtonDisabled: {
    opacity: 0.6,
  },
  findButtonText: {
    ...typography.body,
    color: colors.duskDeep,
    fontWeight: "700",
  },
});
