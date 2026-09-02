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
        // TEMP DEBUG — remove once the one-directional delivery bug is found
        console.log("RAW MESSAGE EVENT:", JSON.stringify(event));
        // Backend sends { type: "MESSAGE", message: {...} } — content is
        // nested inside `message`, not directly on the event. Fall back to
        // reading flat fields too, in case any event ever sends it that way.
        const incoming = event.message ?? event;
        addMessage({
          id: incoming.id || incoming.messageId || String(Date.now()),
          content: incoming.content,
          sender: "partner",
          type: "text",
          timestamp: incoming.createdAt || incoming.timestamp || Date.now(),
          messageId: incoming.id || incoming.messageId,
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
          console.log("RAW ICEBREAKER EVENT:", JSON.stringify(event));
        addMessage({
          id: event.messageId || String(Date.now()),
          content: event.suggestion,
          sender: "system",
          type: "icebreaker",
          timestamp: event.timestamp || Date.now(),
          messageId: event.messageId,
        });
        break;

      case "SUPPORT_RESOURCE":
        Alert.alert("Support Resource", event.content, [
          { text: "OK", onPress: () => {} },
        ]);
        addMessage({
          id: event.messageId || String(Date.now()),
          content: event.content,
          sender: "system",
          type: "support_resource",
          timestamp: event.timestamp || Date.now(),
          messageId: event.messageId,
        });
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

  // Send a message
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

  // Handle typing
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

  // Handle stop typing
  const handleStopTyping = () => {
    if (!ws || roomStatus !== "connected") return;

    sendEvent(ws, "STOP_TYPING", { roomId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Leave the room
  const handleLeave = () => {
    if (!ws) return;

    Alert.alert("Leave Conversation", "Are you sure you want to leave?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Leave",
        onPress: () => {
          sendEvent(ws, "LEAVE_ROOM", { roomId });
          router.replace("/mood-picker");
        },
      },
    ]);
  };

  // Report a message
  const handleReport = (messageId: string) => {
    Alert.prompt(
      "Report Message",
      "Please provide a reason for reporting this message:",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Report",
          onPress: (reason?: string) => {
            if (reason && ws) {
              sendEvent(ws, "REPORT", { roomId, messageId, reason });
              Alert.alert("Success", "Message reported successfully.");
            }
          },
        },
      ],
      "plain-text",
    );
  };

  // Block the partner
  const handleBlock = () => {
    Alert.alert("Block User", "Are you sure you want to block this user?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Block",
        onPress: () => {
          if (ws) {
            sendEvent(ws, "BLOCK", { roomId });
            router.replace("/mood-picker");
          }
        },
      },
    ]);
  };

  // Render message item
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender === "self";
    const isSystem = item.sender === "system";

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
          <Pressable onPress={() => handleReport(item.messageId!)}>
            <Text style={styles.reportButton}>Report</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <DuskBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Chat</Text>
            {partnerId && (
              <Text style={styles.partnerInfo}>
                Chatting with someone {partnerMood && `who is ${partnerMood}`}
              </Text>
            )}
          </View>
          <Pressable onPress={handleLeave}>
            <Text style={styles.headerButton}>Leave</Text>
          </Pressable>
        </View>

        {roomStatus !== "connected" && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>
              {roomStatus === "partner_left"
                ? "Your partner has left"
                : "Session revoked"}
            </Text>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          scrollEnabled={true}
        />

        {/* Typing Indicator */}
        {partnerTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Partner is typing</Text>
            <Text style={styles.typingDots}>...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
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
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleBlock}
            style={styles.actionButton}
            disabled={roomStatus !== "connected"}
          >
            <Text style={styles.actionButtonText}>Block</Text>
          </Pressable>
        </View>
      </View>
    </DuskBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.headline.fontSize,
    fontWeight: "600",
    color: colors.paper,
  },
  partnerInfo: {
    fontSize: 12,
    color: colors.fog,
    marginTop: spacing.xs,
  },
  headerButton: {
    fontSize: 12,
    color: colors.horizon,
    fontWeight: "600",
  },
  statusBanner: {
    backgroundColor: "rgba(255, 100, 100, 0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 100, 100, 0.3)",
  },
  statusText: {
    color: "#ffcccc",
    fontSize: 12,
    fontWeight: "500",
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.md,
    alignItems: "flex-start",
  },
  ownMessageContainer: {
    alignItems: "flex-end",
  },
  systemMessageContainer: {
    alignItems: "center",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radii.md,
  },
  ownMessageBubble: {
    backgroundColor: colors.wine,
  },
  systemMessageBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  messageText: {
    color: colors.paper,
    fontSize: typography.body.fontSize,
  },
  ownMessageText: {
    color: colors.paper,
  },
  systemMessageText: {
    color: colors.fog,
    fontSize: 12,
    fontStyle: "italic",
  },
  reportButton: {
    color: colors.horizon,
    fontSize: 10,
    marginTop: spacing.xs,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  typingText: {
    color: colors.fog,
    fontSize: 12,
  },
  typingDots: {
    color: colors.fog,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: colors.paper,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.wine,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.paper,
    fontWeight: "600",
    fontSize: typography.body.fontSize,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(255, 100, 100, 0.2)",
    borderRadius: radii.md,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#ffcccc",
    fontWeight: "600",
  },
});