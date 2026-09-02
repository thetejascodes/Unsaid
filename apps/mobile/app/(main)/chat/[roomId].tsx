import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { connectSocket, sendEvent } from "../../../lib/ws-client";
import { useAuth } from "../../../lib/auth-context";
import { getAccessToken } from "../../../lib/api";
import {
  colors,
  typography,
  spacing,
  radii,
  fontFamily,
} from "../../../lib/theme";
import { DuskBackground } from "../../../components/DuskBackground";

interface Message {
  id: string;
  content: string;
  sender: "self" | "partner" | "system";
  type: "text" | "icebreaker" | "support_resource" | "system";
  timestamp: number;
  messageId?: string;
}

type RoomStatus = "connected" | "partner_left" | "revoked";

export default function ChatRoom() {
  const router = useRouter();
  const { logout } = useAuth();
  const { roomId, partnerId, partnerMood } = useLocalSearchParams<{
    roomId: string;
    partnerId: string;
    partnerMood: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("connected");
  const flatListRef = useRef<FlatList<Message>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSocketMessage = async (event: any) => {
    switch (event.type) {
      case "MESSAGE": {
        // Backend sends { type: "MESSAGE", message: {...} } — content is
        // nested inside `message`, not directly on the event.
        const incoming = event.message ?? event;
        addMessage({
          id: incoming.id || String(Date.now()),
          content: incoming.content,
          sender: "partner",
          type: "text",
          timestamp: incoming.sentAt
            ? new Date(incoming.sentAt).getTime()
            : Date.now(),
          messageId: incoming.id,
        });
        break;
      }

      case "PARTNER_TYPING":
        setPartnerTyping(true);
        break;

      case "PARTNER_STOP_TYPING":
        setPartnerTyping(false);
        break;

      case "PARTNER_LEFT":
        setRoomStatus("partner_left");
        addMessage({
          id: String(Date.now()),
          content: "Your partner has left the conversation.",
          sender: "system",
          type: "system",
          timestamp: Date.now(),
        });
        break;

      case "ICEBREAKER":
        // Backend sends { type: "ICEBREAKER", suggestion: "..." } — flat,
        // under `suggestion`, not `content`.
        addMessage({
          id: String(Date.now()),
          content: event.suggestion,
          sender: "system",
          type: "icebreaker",
          timestamp: Date.now(),
        });
        break;

      case "SUPPORT_RESOURCE":
        Alert.alert("You're not alone", event.content, [
          { text: "OK", onPress: () => {} },
        ]);
        addMessage({
          id: String(Date.now()),
          content: event.content,
          sender: "system",
          type: "support_resource",
          timestamp: Date.now(),
        });
        break;

      case "ERROR":
        Alert.alert("Something went wrong", event.message);
        break;

      case "SESSION_REVOKED":
        setRoomStatus("revoked");
        Alert.alert(
          "Session Revoked",
          "Your session has been revoked. Please log in again.",
        );
        await logout();
        router.replace("/phone-login");
        break;

      default:
        break;
    }
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = () => {
    if (!inputText.trim() || !ws || roomStatus !== "connected") {
      return;
    }

    const message: Message = {
      id: String(Date.now()),
      content: inputText,
      sender: "self",
      type: "text",
      timestamp: Date.now(),
    };

    addMessage(message);
    sendEvent(ws, "SEND_MESSAGE", {
      roomId,
      content: inputText,
      messageType: "text",
    });
    setInputText("");
    handleStopTyping();
  };

  const handleTyping = () => {
    if (!ws || roomStatus !== "connected") return;

    sendEvent(ws, "TYPING", { roomId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (!ws || roomStatus !== "connected") return;

    sendEvent(ws, "STOP_TYPING", { roomId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleLeave = () => {
    if (!ws) return;

    Alert.alert("Leave this conversation?", "You won't be able to return to it.", [
      { text: "Stay", onPress: () => {} },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          sendEvent(ws, "LEAVE_ROOM", { roomId });
          router.replace("/mood-picker");
        },
      },
    ]);
  };

  const handleReport = (messageId: string) => {
    Alert.prompt(
      "Report this message",
      "What happened?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Report",
          onPress: (reason?: string) => {
            if (reason && ws) {
              sendEvent(ws, "REPORT", { roomId, messageId, reason });
              Alert.alert("Reported", "Thank you — we'll take a look.");
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const handleBlock = () => {
    Alert.alert("Block this person?", "You won't be matched with them again.", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Block",
        style: "destructive",
        onPress: () => {
          if (ws) {
            sendEvent(ws, "BLOCK", { roomId });
            router.replace("/mood-picker");
          }
        },
      },
    ]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender === "self";
    const isSystem = item.sender === "system";
    const isIcebreaker = item.type === "icebreaker";
    const isSupport = item.type === "support_resource";

    if (isIcebreaker) {
      return (
        <View style={styles.icebreakerRow}>
          <View style={styles.icebreakerCard}>
            <Text style={styles.icebreakerLabel}>a way in</Text>
            <Text style={styles.icebreakerText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    if (isSupport) {
      return (
        <View style={styles.icebreakerRow}>
          <View style={styles.supportCard}>
            <Text style={styles.supportText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn && styles.ownMessageContainer,
          isSystem && styles.systemMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwn && styles.ownMessageBubble,
            isSystem && styles.systemMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn && styles.ownMessageText,
              isSystem && styles.systemMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>

        {isOwn && item.messageId && (
          <Pressable onPress={() => handleReport(item.messageId!)} hitSlop={8}>
            <Text style={styles.reportButton}>report</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <DuskBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>a quiet room</Text>
            {partnerMood && (
              <Text style={styles.partnerInfo}>
                someone feeling {partnerMood.replace("_", " ")}
              </Text>
            )}
          </View>
          <Pressable onPress={handleLeave} hitSlop={8}>
            <Text style={styles.headerButton}>leave</Text>
          </Pressable>
        </View>

        {roomStatus !== "connected" && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>
              {roomStatus === "partner_left"
                ? "They've stepped away."
                : "This session has ended."}
            </Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          scrollEnabled={true}
        />

        {partnerTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>they're writing</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="say what you're carrying..."
            placeholderTextColor={colors.fog}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (text.length > 0) {
                handleTyping();
              }
            }}
            multiline
            maxLength={500}
            editable={roomStatus === "connected"}
          />
          <Pressable
            onPress={handleSend}
            style={[
              styles.sendButton,
              (roomStatus !== "connected" || !inputText.trim()) &&
                styles.sendButtonDisabled,
            ]}
            disabled={roomStatus !== "connected" || !inputText.trim()}
          >
            <Text style={styles.sendButtonText}>send</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleBlock}
          style={styles.blockRow}
          disabled={roomStatus !== "connected"}
          hitSlop={8}
        >
          <Text style={styles.blockText}>block this person</Text>
        </Pressable>
      </View>
    </DuskBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245, 237, 227, 0.08)",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontFamily.logo,
    fontSize: 24,
    color: colors.paper,
  },
  partnerInfo: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.fog,
    marginTop: 2,
  },
  headerButton: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.horizon,
    paddingBottom: 2,
  },
  statusBanner: {
    backgroundColor: "rgba(181, 85, 107, 0.15)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statusText: {
    fontFamily: fontFamily.regular,
    color: colors.wine,
    fontSize: 13,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    alignItems: "flex-start",
    maxWidth: "100%",
  },
  ownMessageContainer: {
    alignItems: "flex-end",
  },
  systemMessageContainer: {
    alignItems: "center",
  },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "rgba(245, 237, 227, 0.08)",
    borderRadius: radii.lg,
    borderBottomLeftRadius: 4,
  },
  ownMessageBubble: {
    backgroundColor: colors.duskWarm,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: 4,
  },
  systemMessageBubble: {
    backgroundColor: "transparent",
  },
  messageText: {
    fontFamily: fontFamily.regular,
    color: colors.paper,
    fontSize: 15,
    lineHeight: 21,
  },
  ownMessageText: {
    color: colors.paper,
  },
  systemMessageText: {
    fontFamily: fontFamily.regular,
    color: colors.fog,
    fontSize: 12,
    fontStyle: "italic",
  },
  reportButton: {
    fontFamily: fontFamily.regular,
    color: colors.fog,
    fontSize: 11,
    marginTop: 3,
    marginRight: 2,
  },
  icebreakerRow: {
    alignItems: "center",
    marginVertical: spacing.md,
  },
  icebreakerCard: {
    maxWidth: "88%",
    borderWidth: 1,
    borderColor: "rgba(240, 149, 78, 0.35)",
    backgroundColor: "rgba(240, 149, 78, 0.08)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  icebreakerLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.horizon,
    marginBottom: 4,
  },
  icebreakerText: {
    fontFamily: fontFamily.logo,
    fontSize: 16,
    color: colors.paper,
    lineHeight: 22,
  },
  supportCard: {
    maxWidth: "88%",
    borderWidth: 1,
    borderColor: "rgba(110, 156, 147, 0.4)",
    backgroundColor: "rgba(110, 156, 147, 0.1)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  supportText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.paper,
    lineHeight: 20,
  },
  typingIndicator: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  typingText: {
    fontFamily: fontFamily.regular,
    fontStyle: "italic",
    color: colors.fog,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(245, 237, 227, 0.08)",
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    backgroundColor: "rgba(245, 237, 227, 0.07)",
    color: colors.paper,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.lg,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: colors.horizon,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.lg,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonText: {
    fontFamily: fontFamily.semibold,
    color: colors.duskDeep,
    fontSize: 14,
  },
  blockRow: {
    alignItems: "center",
    paddingBottom: spacing.md,
  },
  blockText: {
    fontFamily: fontFamily.regular,
    color: colors.fog,
    fontSize: 12,
  },
});