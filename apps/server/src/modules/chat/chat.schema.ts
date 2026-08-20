import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.schema.js";

export const rooms = pgTable("rooms", {
  id: uuid().primaryKey().defaultRandom(),

  userAId: uuid("user_a_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userBId: uuid("user_b_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  mood: varchar({ length: 32 }),

  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"), // null while the chat is still active
});
export const messages = pgTable("messages", {
  id: uuid().primaryKey().defaultRandom(),

  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  content: text().notNull(), // encrypted at the application layer before insert
  messageType: varchar("message_type", { length: 16 })
    .notNull()
    .default("text"),
  imageUrl: text("image_url"),

  sentAt: timestamp("sent_at").notNull().defaultNow(),
  flaggedAt: timestamp("flagged_at"), // set by AI moderation, null = not flagged
});
