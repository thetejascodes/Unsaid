import { eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { sessions, users } from "../auth/auth.schema.js";
import { blocks, reports } from "./moderation.schema.js";
import { redis } from "../../common/redis/index.js";
import { banDenylistKey } from "../../common/redis/keys.js";
import {
  registerSocket,
  getSocket,
  unregisterSocket,
} from "../matching/socket-registry.js";
const POSTGRES_UNIQUE_VIOLATION = "23505";

export const createReport = async (
  reporterId: string,
  reportedUserId: string,
  messageId: string,
  reason: string,
) => {
  const [report] = await db
    .insert(reports)
    .values({
      reporterId,
      reportedUserId,
      messageId,
      reason,
    })
    .returning();
  return report;
};

export const createBlock = async (blockerId: string, blockedUserId: string) => {
  try {
    const [block] = await db
      .insert(blocks)
      .values({
        blockerId,
        blockedUserId,
      })
      .returning();
    return block;
  } catch (error: any) {
    if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
      return;
    }
    throw error;
  }
};

export const banUser = async (userId: string, reason: string) => {
  const [user] = await db
    .update(users)
    .set({
      bannedAt: new Date(Date.now()),
      banReason: reason,
    })
    .where(eq(users.id, userId))
    .returning();
  const [session] = await db
    .update(sessions)
    .set({
      revokedAt: new Date(Date.now()),
    })
    .where(eq(sessions.userId, userId))
    .returning();
  await redis.set(
    banDenylistKey(userId),
    JSON.stringify({ reason, bannedAt: new Date(Date.now()) }),
  );
  const socket = getSocket(userId);
  if (socket) {
    socket.send(JSON.stringify({ type: "SESSION_REVOKED", reason }));
    socket.close(4001, "SESSION_REVOKED");
    unregisterSocket(userId);
  }
  return { user, session };
};
