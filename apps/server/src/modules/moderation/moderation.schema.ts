import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "../auth/auth.schema.js";
import { messages } from "../chat/chat.schema.js";

export const reports = pgTable("reports", {
  id: uuid().primaryKey().defaultRandom(),

  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: uuid("reported_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Optional — a report can point at a specific message, or just at the user/chat generally
  messageId: uuid("message_id").references(() => messages.id, {
    onDelete: "set null",
  }),

  reason: text().notNull(),
  status: varchar({ length: 16 }).notNull().default("pending"), // pending | reviewed | dismissed

  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const blocks = pgTable(
  "blocks",
  {
    id: uuid().primaryKey().defaultRandom(),

    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: uuid("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // A user can only block the same person once
    unique().on(table.blockerId, table.blockedUserId),
  ],
);
