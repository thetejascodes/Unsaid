import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, Server } from "node:http";
import { Socket } from "node:net";
import { verifyAccessToken } from "../utils/jwt.utils.js";
import { registerSocket,unregisterSocket } from "../../modules/matching/socket-registry.js";

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  queuedMood?: string;
}

const connectionHandlers = new Map<
  string,
  (ws: AuthenticatedWebSocket, message: any) => Promise<void>
>();

export const registerMessageHandler = (
  eventType: string,
  handlerFn: (ws: AuthenticatedWebSocket, message: any) => Promise<void>,
) => {
  connectionHandlers.set(eventType, handlerFn);
};

const disconnectHandlers: ((ws: AuthenticatedWebSocket) => void)[] = [];

export const onDisconnect = (fn: (ws: AuthenticatedWebSocket) => void) => {
  disconnectHandlers.push(fn);
};

const sendError = (ws: AuthenticatedWebSocket, message: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ERROR", message }));
  }
};

const routeMessage = async (ws: AuthenticatedWebSocket, rawMessage: string) => {
  let parsed: any;
  try {
    parsed = JSON.parse(rawMessage);
  } catch (error) {
    sendError(ws, "Malformed message");
    return;
  }

  if (!parsed?.type || typeof parsed.type !== "string") {
    sendError(ws, "Message missing 'type' field");
    return;
  }

  const handler = connectionHandlers.get(parsed.type);
  if (!handler) {
    sendError(ws, `Unknown event type: ${parsed.type}`);
    return;
  }

  try {
    await handler(ws, parsed);
  } catch (error) {
    console.error("Handler error:", error);
    sendError(ws, "Something went wrong processing that event");
  }
};

const emitDisconnect = (ws: AuthenticatedWebSocket) => {
  for (const fn of disconnectHandlers) {
    try {
      fn(ws);
    } catch (error) {
      console.error("Disconnect handler failed:", error);
    }
  }
};

export const attachWebSocketServer = (httpServer: Server) => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on(
    "upgrade",
    (req: IncomingMessage, socket: Socket, head: Buffer) => {
      const parsedUrl = new URL(req.url || "", `http://${req.headers.host}`);
      const token = parsedUrl.searchParams.get("accessToken") || "";

      if (!token) {
        socket.destroy();
        return;
      }

      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch (error) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        const authedWs = ws as AuthenticatedWebSocket;
        authedWs.userId = payload.userId;
        registerSocket(authedWs.userId,authedWs);
        wss.emit("connection", authedWs, req);
      });
    },
  );

  // registered ONCE here, not per-connection
  wss.on("connection", (ws: AuthenticatedWebSocket) => {
    ws.on("message", (rawMessage) => {
      routeMessage(ws, rawMessage.toString());
    });

    ws.on("close", () => {
      unregisterSocket(ws.userId);
      emitDisconnect(ws);
    });
  });
};