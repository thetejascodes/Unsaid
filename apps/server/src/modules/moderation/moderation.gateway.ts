import {
  registerMessageHandler,
  type AuthenticatedWebSocket,
} from "../../common/ws/server.js";
import { createReport, createBlock } from "./moderation.service.js";
import { lookupPartnerId } from "../chat/chat.gateway.js";
import { endRoom } from "../chat/chat.service.js";
import { getSocket } from "../matching/socket-registry.js";

export const registerModerationHandlers = () => {
  registerMessageHandler(
    "REPOR",
    async (ws: AuthenticatedWebSocket, msg: any) => {
      const partnerId = await lookupPartnerId(msg.roomId, ws.userId);
      if (partnerId) {
        await createReport(ws.userId, partnerId, msg.messageId, msg.reason);
        ws.send(JSON.stringify({ type: "REPORT_RECEIVED" }));
      }
    },
  );
};
