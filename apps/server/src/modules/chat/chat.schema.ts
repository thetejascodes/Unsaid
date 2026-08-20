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

