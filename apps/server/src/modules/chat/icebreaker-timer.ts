import { getSocket } from "../matching/socket-registry.js";
import { generateIcebreaker, clearIcebreakerHistory } from "../ai/icebreaker.js";
import { db } from "../../common/db/index.js";
import { rooms } from "./chat.schema.js";
import { eq } from "drizzle-orm";

const lastMessageAt = new Map<string, number>();
const icebreakerSent = new Map<string, boolean>();

const SILENCE_THRESHOLD_MS = 30_000;
const CHECK_INTERVAL_MS = 10_000;

export const recordActivity = (roomId: string) => {
  lastMessageAt.set(roomId, Date.now());
  icebreakerSent.set(roomId, false);
};

export const clearRoomTimer = (roomId: string) => {
  lastMessageAt.delete(roomId);
  icebreakerSent.delete(roomId);
  clearIcebreakerHistory(roomId);
};

export const startIcebreakerTimer = () => {
  setInterval(async () => {
    const now = Date.now();
    for (const [roomId, ts] of lastMessageAt) {
      if (now - ts <= SILENCE_THRESHOLD_MS || icebreakerSent.get(roomId)) {
        continue;
      }

      const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
      if (!room || room.endedAt || !room.mood) {
        clearRoomTimer(roomId);
        continue;
      }

      icebreakerSent.set(roomId, true);

      const suggestion = await generateIcebreaker({ mood: room.mood, roomId });

      for (const userId of [room.userAId, room.userBId]) {
        const socket = getSocket(userId);
        if (socket) {
          socket.send(JSON.stringify({ type: "ICEBREAKER", suggestion }));
        }
      }
    }
  }, CHECK_INTERVAL_MS);
};