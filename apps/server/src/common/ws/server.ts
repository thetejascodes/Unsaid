import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, Server } from "node:http";
import { verifyAccessToken } from "../utils/jwt.utils.js";
import { URL, URLSearchParams } from "url";
import { Socket } from "node:net";
const connectionHandlers = new Map<
  string,
  (ws: WebSocket, message: any) => Promise<void>
>();

export const registerMessageHandler = (
  eventType: string,
  handlerFn: (ws: WebSocket, message: any) => Promise<void>,
) => {
  connectionHandlers.set(eventType, handlerFn);
};

const disconnectHandlers: ((ws: WebSocket) => void)[] = [];

export const onDisconnect = (fn: (ws: WebSocket) => void) => {
  disconnectHandlers.push(fn);
};

interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  queuedMood?: string;
}
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
        wss.emit("connection", authedWs, req);
      });

      wss.on("connection", (ws: AuthenticatedWebSocket) => {
        ws.on("message", (rawMessage) => {
          routeMessage(ws, rawMessage.toString());
        });
        ws.on("close", () => {
          emitDisconnect(ws);
        });
      });
    },
  );
};
