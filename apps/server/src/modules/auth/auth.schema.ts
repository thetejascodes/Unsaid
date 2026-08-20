import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

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

export const otpCodes = pgTable("otp_codes", {
  id: uuid().primaryKey().defaultRandom(),
  // No FK to users — a user doesn't exist yet at OTP-request time
  phoneHash: varchar("phone_hash", { length: 255 }).notNull(),
  codeHash: varchar("code_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumed: boolean().notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: varchar("refresh_token_hash", { length: 255 })
    .notNull()
    .unique(),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"), // set immediately on ban/logout
});
