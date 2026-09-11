import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { connectSocket, sendEvent } from "../../lib/ws-client";
import { useAuth } from "../../lib/auth-context";
import { getAccessToken } from "../../lib/api";
import { colors, typography, spacing, radii, fontFamily } from "../../lib/theme";
import { DuskBackground } from "../../components/DuskBackground";
import { FadeInUp } from "../../components/FadeInUp";

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

function MoodChip({
  mood,
  isSelected,
  onPress,
}: {
  mood: (typeof MOODS)[number];
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasSelected = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !wasSelected.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 110, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();
    }
    wasSelected.current = isSelected;
  }, [isSelected, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[styles.moodButton, isSelected && styles.moodButtonActive]}
        onPress={onPress}
      >
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <Text style={[styles.moodButtonText, isSelected && styles.moodButtonTextActive]}>
          {mood.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function InterestTag({
  interest,
  isOn,
  onPress,
}: {
  interest: string;
  isOn: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={[styles.interestTag, isOn && styles.interestTagActive]} onPress={handlePress}>
        <Text style={[styles.interestTagText, isOn && styles.interestTagTextActive]}>{interest}</Text>
      </Pressable>
    </Animated.View>
  );
}

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
        <FadeInUp delay={0}>
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
        </FadeInUp>

        <FadeInUp delay={100} style={styles.section}>
          <View style={styles.moodGrid}>
            {MOODS.map((mood) => (
              <MoodChip
                key={mood.value}
                mood={mood}
                isSelected={selectedMood === mood.value}
                onPress={() => setSelectedMood(mood.value)}
              />
            ))}
          </View>
        </FadeInUp>

        <FadeInUp delay={200} style={styles.section}>
          <Text style={styles.sectionTitle}>anything you'd want to talk about (optional)</Text>
          <View style={styles.interestsGrid}>
            {INTERESTS.map((interest) => (
              <InterestTag
                key={interest}
                interest={interest}
                isOn={selectedInterests.includes(interest)}
                onPress={() => toggleInterest(interest)}
              />
            ))}
          </View>
        </FadeInUp>

        {status === "queued" && (
          <Text style={styles.statusText}>looking for someone who understands...</Text>
        )}

        <FadeInUp delay={280}>
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
        </FadeInUp>
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