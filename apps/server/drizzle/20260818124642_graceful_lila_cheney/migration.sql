CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone_hash" varchar(255) NOT NULL UNIQUE,
	"username" varchar(32) NOT NULL UNIQUE,
	"avatar_url" text,
	"bio" varchar(280),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"banned_at" timestamp,
	"ban_reason" text
);
