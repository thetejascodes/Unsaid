import { redis } from "../../common/redis/index.js";
import { queueKey, banDenylistKey } from "../../common/redis/keys.js";
import { getSocket } from "./socket-registry.js";
import { db } from "../../common/db/index.js";
import { blocks } from "../moderation/moderation.schema.js";
import { or, eq } from "drizzle-orm";
import { rooms } from "../chat/chat.schema.js";

export const joinQueue = async (
  userId: string,
  mood: string,
  interests: string[],
) => {
  const isBanned = await redis.exists(banDenylistKey(userId));
  if (isBanned) {
    const socket = getSocket(userId);
    if (socket) {
      socket.send(JSON.stringify({ type: "SESSION_REVOKED" }));
      socket.close();
    }
    return;
  }

  const blockRows = await db
    .select()
    .from(blocks)
    .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedUserId, userId)));
  const blockedIds = blockRows.map((row) => {
    if (row.blockerId === userId) {
      return row.blockedUserId;
    } else {
      return row.blockerId;
    }
  });

  const candidate = await findAndRemoveCandidate(mood, userId, blockedIds);

  if (candidate) {
    const [room] = await db
      .insert(rooms)
      .values({ userAId: userId, userBId: candidate.userId, mood })
      .returning();

    const mySocket = getSocket(userId);
    const candidateSocket = getSocket(candidate.userId);

    if (mySocket) {
      mySocket.send(
        JSON.stringify({
          type: "MATCHED",
          roomId: room?.id,
          partnerId: candidate.userId,
          partnerMood: mood,
        }),
      );
    }
    if (candidateSocket) {
      candidateSocket.send(
        JSON.stringify({
          type: "MATCHED",
          roomId: room?.id,
          partnerId: userId,
          partnerMood: mood,
        }),
      );
    }
  } else {
    const entry = { userId, interests, joinedAt: Date.now() };
    await redis.LPUSH(queueKey(mood), JSON.stringify(entry));
    const position = await redis.LLEN(queueKey(mood));
    const mySocket = getSocket(userId);
    if (mySocket) {
      mySocket.send(JSON.stringify({ type: "QUEUED", position }));
    }
  }
};

export const leaveQueue = async (userId: string, mood: string) => {
  if (!mood) {
    return;
  }
  const entries = await redis.LRANGE(queueKey(mood), 0, -1);
  for (const entry of entries) {
    const parsed = JSON.parse(entry);
    if (parsed.userId === userId) {
      await redis.LREM(queueKey(mood), 1, entry);
      break;
    }
  }
};
export const findAndRemoveCandidate = async (
  mood: string,
  excludeUserId: string,
  excludeIds: string[],
) => {
  const raw = await redis.LPOP(queueKey(mood));
  if (!raw) {
    return null;
  }
  const candidate = JSON.parse(raw);
  if (
    candidate.userId === excludeUserId ||
    excludeIds.includes(candidate.userId)
  ) {
    return null;
  }
  return candidate;
};
