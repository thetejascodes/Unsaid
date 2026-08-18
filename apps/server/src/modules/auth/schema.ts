import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  phoneHash: varchar("phone_hash", { length: 255 }).notNull().unique(),
  username: varchar({ length: 32 }).notNull().unique(),
  avatarUrl: text("avatar_url"),
  bio: varchar({ length: 280 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
});