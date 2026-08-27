import {
  registerMessageHandler,
  type AuthenticatedWebSocket,
} from "../../common/ws/server.js";
import { persistMessage, endRoom } from "./chat.service.js";
import { checkModeration } from "../ai/moderation.js";
import { getSocket } from "../matching/socket-registry.js";
import { redis } from "../../common/redis/index.js";
import { banDenylistKey } from "../../common/redis/keys.js";
import { db } from "../../common/db/index.js";
import { rooms } from "./chat.schema.js";
import { eq } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";
import SendMessageDto, { type SendMessageInput } from "./dto/SendMessageDto.js";

export const lookupPartnerId = async (
  roomId: string,
  requestingUserId: string,
) => {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) {
    return;
  }
  if (requestingUserId !== room.userAId && requestingUserId !== room.userBId) {
    throw ApiError.forbidden("not a participant in this room");
  }
  return room.userAId === requestingUserId ? room.userBId : room.userAId;
};

export const registerChatHandlers = () => {
  registerMessageHandler(
    "SEND_MESSAGE",
    async (ws: AuthenticatedWebSocket, msg: any) => {
      const { value, errors } = SendMessageDto.validate(msg);
      if (errors || !value) {
        ws.send(
          JSON.stringify({
            type: "ERROR",
            message: errors?.join("; ") ?? "Invalid message",
          }),
        );
        return;
      }
      const validated = value as unknown as SendMessageInput;

      const isBanned = await redis.exists(banDenylistKey(ws.userId));
      if (isBanned) {
        ws.send(JSON.stringify({ type: "SESSION_REVOKED" }));
        ws.close();
        return;
      }

      let partnerId: string | undefined;
      try {
        partnerId = await lookupPartnerId(validated.roomId, ws.userId);
      } catch (error) {
        if (error instanceof ApiError) {
          ws.send(JSON.stringify({ type: "ERROR", message: error.message }));
          return;
        }
        throw error;
      }

      const moderation = await checkModeration(validated.content);

      const message = await persistMessage(
        validated.roomId,
        ws.userId,
        validated.content,
        validated.messageType,
        validated.imageUrl ?? "",
        moderation.flagged,
      );

      if (moderation.flagged && moderation.category === "self_harm") {
        ws.send(JSON.stringify({ type: "SUPPORT_RESOURCE" }));
      }

      if (partnerId) {
        const partnerSocket = getSocket(partnerId);
        if (partnerSocket) {
          partnerSocket.send(JSON.stringify({ type: "MESSAGE", message }));
        }
      }
    },
  );

  registerMessageHandler(
    "TYPING",
    async (ws: AuthenticatedWebSocket, msg: any) => {
      const partnerId = await lookupPartnerId(msg.roomId, ws.userId);
      if (partnerId) {
        const partnerSocket = getSocket(partnerId);
        if (partnerSocket) {
          partnerSocket.send(JSON.stringify({ type: "PARTNER_TYPING" }));
        }
      }
    },
  );

  registerMessageHandler(
    "STOP_TYPING",
    async (ws: AuthenticatedWebSocket, msg: any) => {
      const partnerId = await lookupPartnerId(msg.roomId, ws.userId);
      if (partnerId) {
        const partnerSocket = getSocket(partnerId);
        if (partnerSocket) {
          partnerSocket.send(JSON.stringify({ type: "PARTNER_STOP_TYPING" }));
        }
      }
    },
  );

  registerMessageHandler(
    "LEAVE_ROOM",
    async (ws: AuthenticatedWebSocket, msg: any) => {
      const partnerId = await lookupPartnerId(msg.roomId, ws.userId);
      await endRoom(msg.roomId);
      if (partnerId) {
        const partnerSocket = getSocket(partnerId);
        if (partnerSocket) {
          partnerSocket.send(JSON.stringify({ type: "PARTNER_LEFT" }));
        }
      }
    },
  );
};