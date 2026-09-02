import {
  registerMessageHandler,
  onDisconnect,
} from "../../common/ws/server.js";
import { joinQueue, leaveQueue } from "./matching.queue.js";
import {  unregisterSocket } from "./socket-registry.js";

export const registerMatchingHandlers = () => {
  registerMessageHandler("JOIN_QUEUE", async (ws, msg) => {
    ws.queuedMood = msg.mood;
    await joinQueue(ws.userId, msg.mood, msg.interests);
  });
  registerMessageHandler("LEAVE_QUEUE", async (ws, msg) => {
    if (ws.queuedMood) {
      await leaveQueue(ws.userId, ws.queuedMood);
    }
    delete ws.queuedMood;
  });
    registerMessageHandler("PING", async (ws, msg) => {
    ws.send(JSON.stringify({ type: "PONG" }));
  });


  onDisconnect((ws) => {
    unregisterSocket(ws.userId);
    if (ws.queuedMood) {
      leaveQueue(ws.userId, ws.queuedMood);
    }
  });
};
