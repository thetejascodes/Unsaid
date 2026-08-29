# Unsaid

> *The wound that ages, aches deeper.*  
> *The fruit that ripens, tastes sweeter.*  
> *The pickle that marinates, hits different.*  
>  
> *Some things need time to become what they were always meant to be.*

---

**Unsaid** is a pseudonymous mood-matching social platform that connects people through authentic conversations. Phone-verified accounts ensure accountability, while chosen usernames keep early interactions comfortably private.

**Status:** 🚧 Work in Progress — Backend foundation complete, chat layer in development, mobile scaffold ready.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [WebSocket API](#-websocket-api)
- [Data Model & Persistence](#-data-model--persistence)
- [AI Moderation Pipeline](#-ai-moderation-pipeline)
- [Security & Privacy](#-security--privacy)
- [Development Conventions](#-development-conventions)
- [Development Commands](#-development-commands)
- [Testing & Debugging](#-testing--debugging)
- [Troubleshooting](#-troubleshooting)
- [Roadmap & Next Steps](#-roadmap--next-steps)
- [Architecture Decisions](#-architecture-decisions)
- [License](#-license)

---

## ✨ Features

### ✅ Fully Implemented

#### Authentication & Accounts
- **Phone OTP Verification** — Twilio integration with fallback to console stub mode for local dev
- **JWT Token System** — Access tokens (15m default) + refresh tokens (7d default) with secure rotation
- **Session Management** — Automatic session rotation on refresh, logout revocation, expired token cleanup
- **User Profiles** — Create/update username, avatar URL, and bio after phone verification

#### Real-Time Matching
- **Mood-based Queue** — FIFO pairing by exact mood match using Valkey
- **Interest Tagging** — Users can specify interests for future advanced matching
- **Socket Registry** — Track active WebSocket connections per user ID
- **Queue Management** — Join/leave queue with automatic cleanup on disconnect
- **Block/Ban System** — Exclude previously blocked or globally banned users from matching

#### Chat System
- **Room Lifecycle** — Automatic room creation on match, persistence in PostgreSQL
- **Message Persistence** — All messages stored with timestamps and user attribution
- **Real-time Messaging** — Validated message sending via WebSocket with moderation checks
- **Activity Tracking** — Record user activity to manage silence timers

#### Moderation & Safety
- **AI Content Screening** — OpenAI-compatible API integration (NVIDIA NIM by default)
- **Report System** — Users can report messages with optional reason
- **Block Enforcement** — Block users from your match queue
- **Bans** — Global ban list with denylist key lookups in Valkey
- **Fail-Open Design** — Chat continues even if AI moderation times out or fails

### 🛠️ In Development

- **Icebreaker Generation** — Conversation starter generation when silence detected (implemented, timer integration pending)
- **Typing Indicators** — Real-time typing status broadcasts
- **Enhanced Moderation Events** — Admin tools for reporting workflow

### 📅 Planned

- **File Uploads** — Avatar and image uploads in messages
- **Chat History Export** — Download/archive conversations
- **Account Deletion** — Permanent data purge with grace period
- **Advanced Matching** — Compatibility scoring, time-zone pairing, topic filters
- **Mobile App** — React Native UI for OTP → mood selection → matching → chat
- **Multi-Instance Deployment** — Redis pub/sub for WebSocket scaling across server instances

---

## 🏗️ Project Structure

```
unsaid/
├── apps/
│   ├── mobile/                    # React Native / Expo app (scaffolded)
│   │   ├── App.tsx
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── server/                    # Express backend, WebSocket, ORM, queue
│       ├── src/
│       │   ├── common/            # Config, DB, Redis, auth, error handling
│       │   │   ├── config/        # Environment & service setup
│       │   │   ├── db/            # Drizzle ORM schema & queries
│       │   │   ├── redis/         # Valkey client & queue keys
│       │   │   ├── ws/            # WebSocket server & handlers
│       │   │   └── middlewares/   # Auth, validation, error handling
│       │   │
│       │   └── modules/           # Feature domains
│       │       ├── auth/          # OTP, JWT, session management
│       │       ├── users/         # Profile endpoints
│       │       ├── matching/      # Queue logic, pairing algorithm
│       │       ├── chat/          # Messages, rooms, persistence
│       │       ├── moderation/    # Report, block, ban workflows
│       │       ├── ai/            # AI content screening
│       │       └── upload/        # File handling (planned)
│       │
│       ├── drizzle/               # SQL migrations & snapshots
│       ├── docker-compose.yml     # Local Postgres + Valkey
│       ├── app.ts                 # Express setup
│       ├── server.ts              # Server startup
│       └── package.json
│
├── docs/
│   ├── backend-build-plan.md      # Feature roadmap & implementation notes
│   └── adr/                       # Architecture decision records
│       ├── 0001-database-selection.md
│       ├── 0002-authentication-strategy.md
│       ├── 0003-realtime-matching-architecture.md
│       └── 0004-ai-provider-strategy.md
│
└── README.md
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Frontend** | React Native, Expo SDK 57 | Mobile app (scaffolded) |
| **Backend Runtime** | Node.js 20+, Express 5 | HTTP server & REST API |
| **Language** | TypeScript (strict mode) | Type-safe backend code |
| **Real-time** | WebSocket (`ws` library) | Bidirectional chat & matching |
| **Database** | PostgreSQL 17 | Persistent user, chat, moderation data |
| **ORM** | Drizzle ORM + Drizzle Kit | Type-safe schema & migrations |
| **Cache/Queue** | Valkey 8 (Redis-compatible) | Mood queues, session/ban denylists, transient state |
| **Input Validation** | Zod + BaseDto wrapper | Schema-based DTO validation |
| **Authentication** | Twilio + JWT | Phone OTP → access/refresh tokens |
| **AI/Moderation** | OpenAI-compatible API | Content screening (NVIDIA NIM default) |
| **Error Handling** | Centralized ApiError | Consistent error codes & HTTP responses |
| **Dev Tooling** | Docker Compose, npm workspaces | Local Postgres/Valkey stack |

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop with Docker Compose

## Quick Start

### 1. Install dependencies

This repository currently contains independent app packages rather than a configured root npm workspace.

```bash
cd apps/server
npm install

cd ../mobile
npm install
```

### 2. Start local infrastructure

From the repository root:

```bash
docker compose -f apps/server/docker-compose.yml up -d
```

This starts PostgreSQL on port `5432` and Valkey on port `6379`.

### 3. Configure the backend

From the repository root, create the server environment file:

```powershell
Copy-Item apps/server/.env.example apps/server/.env
```

Important local values:

```dotenv
PORT=8000
DATABASE_URL=postgresql://admin:admin@localhost:5432/unsaid
VALKEY_URL=redis://localhost:6379
JWT_ACCESS_SECRET=replace-with-a-long-random-access-secret
JWT_REFRESH_SECRET=replace-with-a-long-random-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OTP_STUB_MODE=true
NVIDIA_API_KEY=your-nvidia-nim-api-key
MODERATION_MODEL=meta/muse-glimmer-30b
ICEBREAKER_MODEL=meta/muse-glimmer-30b
AI_BASE_URL=https://integrate.api.nvidia.com/v1
```

Keep `OTP_STUB_MODE=true` during local development. The OTP is logged instead of sent by SMS. To send real OTPs, set it to `false` and provide the Twilio variables in `apps/server/.env`. Never commit `.env` or real API keys.

`NVIDIA_API_KEY`, `MODERATION_MODEL`, and `AI_BASE_URL` are read by the server configuration layer (`common/config`) and are required for the moderation module to function — the client defaults to NVIDIA's NIM catalog, which offers free access to a range of open models, chosen specifically to avoid a billing dependency during development. See [ADR-0004](docs/adr/0004-ai-provider-strategy.md) for the reasoning, including the fail-open policy if the AI call fails.

### 4. Apply database migrations

```bash
cd apps/server
npx drizzle-kit migrate
```

Generate a new migration only after changing a schema:

```bash
npx drizzle-kit generate
```

### 5. Run the backend

```bash
npm run dev
```

The backend listens at `http://localhost:8000` by default. Verify it with:

```text
GET http://localhost:8000/health
```

### 6. Run the mobile scaffold

In another terminal:

```bash
cd apps/mobile
npm start
```

Use Expo Go, an Android emulator, an iOS simulator, or the web target.

## API Reference

### Authentication Endpoints

All request bodies are validated with Zod DTOs. Protected endpoints require an access token in the `Authorization: Bearer <token>` header.

#### Request OTP

```http
POST /api/auth/otp/request
```

Request body:
```json
{
  "phone": "+1234567890"
}
```

Response (200):
```json
{
  "message": "OTP sent successfully"
}
```

In stub mode (`OTP_STUB_MODE=true`), the OTP is logged to the server console instead of sent via SMS.

---

#### Verify OTP & Create Session

```http
POST /api/auth/otp/verify
```

Request body:
```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```

Response (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": null,
    "avatarUrl": null,
    "bio": null,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

**Error 403** if the account is globally banned. **Error 401** if the OTP is invalid or expired.

---

#### Refresh Access Token

```http
POST /api/auth/refresh
```

Request body:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

The refresh token is rotated on each call; old tokens are invalidated.

---

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

Request body:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (204): No content. The session and refresh token are revoked.

---

### User Endpoints

#### Get Current User

```http
GET /api/users/me
Authorization: Bearer <accessToken>
```

Response (200):
```json
{
  "id": "uuid",
  "username": "chosen_username",
  "avatarUrl": "https://...",
  "bio": "A short bio",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

**Note:** The `phoneHash` and `banReason` fields are never returned in API responses.

---

#### Update User Profile

```http
PATCH /api/users/me
Authorization: Bearer <accessToken>
```

Request body (all fields optional):
```json
{
  "username": "new_username",
  "avatarUrl": "https://...",
  "bio": "Updated bio"
}
```

Response (200): Updated user object (same shape as `GET /api/users/me`).

---

### Health Check

```http
GET /health
```

Response (200):
```json
{
  "message": "ok"
}
```

## WebSocket API

The WebSocket server authenticates during the upgrade handshake using the access token. Missing or invalid tokens are rejected before the connection opens.

### Connection

```
ws://localhost:8000/ws?accessToken=<ACCESS_TOKEN>
```

Use `wscat` for testing:
```bash
npm install -g wscat
wscat -c "ws://localhost:8000/ws?accessToken=<ACCESS_TOKEN>"
```

### Matching Events

#### Client: Join Queue

```json
{
  "type": "JOIN_QUEUE",
  "mood": "anxious",
  "interests": ["music", "philosophy"]
}
```

The user enters the Valkey FIFO queue for the specified mood. If another user is already queued for the same mood, both receive a `MATCHED` event and a persistent room is created in PostgreSQL.

---

#### Client: Leave Queue

```json
{
  "type": "LEAVE_QUEUE"
}
```

Removes the user from the current mood queue. No payload required.

---

#### Server: Queued

```json
{
  "type": "QUEUED",
  "position": 3
}
```

Sent when a user successfully joins the queue, indicating their position. Position 1 means next in line.

---

#### Server: Matched

```json
{
  "type": "MATCHED",
  "roomId": "uuid",
  "partnerId": "uuid",
  "partnerMood": "anxious"
}
```

Sent to both users when a match is found. A chat room is automatically created and persisted. Both users are now in an active conversation.

---

### Chat Events

#### Client: Send Message

```json
{
  "type": "SEND_MESSAGE",
  "roomId": "uuid",
  "content": "Hello!",
  "messageType": "text",
  "imageUrl": null
}
```

Send a message to the current chat room. The message is:
1. Validated (non-empty, valid room ID)
2. Checked against the AI moderation endpoint
3. Persisted to the database with a timestamp
4. Broadcast to the partner (if connected)

**Status**: Service layer implemented; gateway wiring in progress.

---

#### Server: Message

```json
{
  "type": "MESSAGE",
  "roomId": "uuid",
  "senderId": "uuid",
  "content": "Hello!",
  "messageType": "text",
  "imageUrl": null,
  "timestamp": "2026-01-01T12:34:56Z",
  "flaggedAt": null
}
```

Received when the partner sends a message. `flaggedAt` is set if AI moderation flagged the content as policy-violating.

**Status**: Service layer implemented; gateway wiring pending.

---

#### Server: Support Resource

```json
{
  "type": "SUPPORT_RESOURCE",
  "message": "If you're struggling, here are some resources: ..."
}
```

Sent when moderation flags a message as related to self-harm or crisis. Surfaced to both users for safety.

**Status**: Planned.

---

### Moderation Events

#### Client: Report

```json
{
  "type": "REPORT",
  "roomId": "uuid",
  "messageId": "uuid",
  "reason": "Harassment or spam"
}
```

Report a specific message from the partner. Creates a persistent report record in the database for admin review.

**Status**: Planned.

---

#### Server: Report Received

```json
{
  "type": "REPORT_RECEIVED"
}
```

Acknowledgment that the report was logged.

**Status**: Planned.

---

#### Client: Block

```json
{
  "type": "BLOCK",
  "roomId": "uuid"
}
```

Block the current partner. The user will not be matched with this person again. The room is closed for both participants.

**Status**: Planned. (Service layer `createBlock` is implemented.)

---

#### Server: Partner Left

```json
{
  "type": "PARTNER_LEFT"
}
```

Sent when the partner leaves the room, blocks you, or is disconnected.

**Status**: Planned.

---

### Typing Indicators

#### Client: Typing / Stop Typing

```json
{
  "type": "TYPING",
  "roomId": "uuid"
}
```

```json
{
  "type": "STOP_TYPING",
  "roomId": "uuid"
}
```

Broadcast typing state to the partner in real time.

**Status**: Planned.

---

#### Server: Partner Typing / Partner Stop Typing

```json
{
  "type": "PARTNER_TYPING"
}
```

```json
{
  "type": "PARTNER_STOP_TYPING"
}
```

Indicates the partner is actively typing.

**Status**: Planned.

---

### Silence Management

#### Server: Icebreaker

```json
{
  "type": "ICEBREAKER",
  "suggestion": "What's your favorite music genre and why?"
}
```

Sent when the system detects a conversation silence (configurable timer, default 30 seconds). Provides an AI-generated conversation starter to help re-engage users.

**Status**: Service layer implemented; timer integration pending.

---

### Other Events

#### Server: Session Revoked

```json
{
  "type": "SESSION_REVOKED",
  "reason": "account_banned"
}
```

Sent when the user's account is globally banned or their session is revoked mid-conversation. The connection is closed immediately after.

**Status**: Implemented for ban checks during matching; mid-chat enforcement planned.

---

#### Server: Error

```json
{
  "type": "ERROR",
  "message": "Invalid room ID or message format"
}
```

Generic error response for malformed or rejected events.

**Status**: Implemented.

---

### Matching Algorithm

The current algorithm is **exact-mood FIFO** using Valkey:
- Users join a queue named `queue:{mood}` (e.g., `queue:anxious`)
- The first two users in the queue are paired
- Matches exclude globally banned users and users who have blocked each other
- If a discarded candidate is found (banned or blocked), they are removed but not re-queued — documented as a known trade-off in [ADR-0003](docs/adr/0003-realtime-matching-architecture.md)

## Data Model & Persistence

### Database Schema

PostgreSQL stores all persistent state across seven tables:

#### Authentication
- **`users`** — User accounts
  - `id` (UUID, primary key)
  - `phoneHash` (text, unique) — HMAC-SHA256 hash of the phone number
  - `username` (text, unique, nullable)
  - `avatarUrl` (text, nullable)
  - `bio` (text, nullable)
  - `createdAt` (timestamp)
  - `bannedAt` (timestamp, nullable) — Set if the user is globally banned
  - `banReason` (text, nullable) — Admin reason for the ban

- **`otpCodes`** — One-time passwords for authentication
  - `id` (UUID, primary key)
  - `phoneHash` (text) — References the phone requesting the OTP
  - `codeHash` (text) — HMAC-SHA256 hash of the actual OTP code
  - `expiresAt` (timestamp)
  - `consumed` (boolean) — Set to true once verified
  - `createdAt` (timestamp)

- **`sessions`** — Active JWT refresh tokens
  - `id` (UUID, primary key)
  - `userId` (UUID, foreign key)
  - `refreshTokenHash` (text, unique) — HMAC-SHA256 hash of the refresh token
  - `expiresAt` (timestamp)
  - `revokedAt` (timestamp, nullable) — Set when the user logs out

#### Chat
- **`rooms`** — Chat rooms created when a match occurs
  - `id` (UUID, primary key)
  - `userAId` (UUID, foreign key)
  - `userBId` (UUID, foreign key)
  - `createdAt` (timestamp)
  - `closedAt` (timestamp, nullable) — Set when the conversation ends

- **`messages`** — Persistent chat history
  - `id` (UUID, primary key)
  - `roomId` (UUID, foreign key)
  - `senderId` (UUID, foreign key)
  - `content` (text)
  - `messageType` (text) — e.g., "text", "image"
  - `imageUrl` (text, nullable)
  - `createdAt` (timestamp)
  - `flaggedAt` (timestamp, nullable) — Set if AI moderation flagged the message

#### Moderation
- **`reports`** — User reports on messages or behavior
  - `id` (UUID, primary key)
  - `reporterId` (UUID, foreign key)
  - `reportedUserId` (UUID, foreign key)
  - `messageId` (UUID, foreign key, nullable) — Message being reported
  - `reason` (text, nullable)
  - `createdAt` (timestamp)
  - `resolvedAt` (timestamp, nullable) — Set when admin reviews the report

- **`blocks`** — Bidirectional user blocks
  - `id` (UUID, primary key)
  - `blockerId` (UUID, foreign key)
  - `blockedUserId` (UUID, foreign key)
  - `createdAt` (timestamp)
  - `(blockerId, blockedUserId)` — Unique constraint to prevent duplicate blocks

### Transient State (Valkey/Redis)

Valkey stores ephemeral state that does not require durability:

- **`queue:{mood}`** — FIFO list of users waiting to be matched for a specific mood
  - Members: user IDs (strings)
  - Used by `joinQueue` and `leaveQueue`

- **`ban:{userId}`** — Denylist key for globally banned users
  - Checked during matching (`joinQueue`) and message sending
  - Presence = banned; absence = not banned

Key builders in [common/redis/keys.ts](apps/server/src/common/redis/keys.ts) ensure consistent key formatting.

### Migrations

All schema changes are managed with Drizzle Kit. Migrations live in [apps/server/drizzle/](apps/server/drizzle/) and are applied with:

```bash
npx drizzle-kit migrate
```

To generate a new migration after editing [common/db/schema.ts](apps/server/src/common/db/schema.ts):

```bash
npx drizzle-kit generate
```

## AI Moderation Pipeline

### Overview

Every chat message sent through the WebSocket is checked against an AI content moderation endpoint before persistence. The moderation check runs asynchronously and includes a fail-open design to ensure that network failures do not block user communication.

### Implementation

**Service layer** ([modules/ai/moderation.ts](apps/server/src/modules/ai/moderation.ts)):
- Calls an OpenAI-compatible chat completion endpoint
- Sends a structured prompt asking for `{ flagged, category }` verdicts
- Runs at low temperature (0.1) for consistency
- Returns a parsed moderation decision or `null` on failure

**Integration points**:
- [modules/chat/chat.gateway.ts](apps/server/src/modules/chat/chat.gateway.ts) — Validates the message, calls moderation, and persists the result
- [modules/chat/chat.schema.ts](apps/server/src/modules/chat/chat.schema.ts) — `messages.flaggedAt` timestamp indicates a policy violation

### Fail-Open Design

If the moderation call fails for **any reason** — network timeout, provider outage, malformed response, invalid API key — the system:
1. Logs the error for debugging
2. **Allows the message to be sent and persisted**
3. Sets `flaggedAt = null` (no moderation coverage for that message)
4. Continues the conversation

This is an intentional trade-off: avoiding the error of blocking valid communication takes priority over the error of missing one harmful message. See [ADR-0004](docs/adr/0004-ai-provider-strategy.md) for the full reasoning.

### Configuration

Moderation is configured via environment variables:

```dotenv
AI_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=your-api-key
MODERATION_MODEL=meta/muse-glimmer-30b
```

The client in [common/ai/client.ts](apps/server/src/common/ai/client.ts) is swappable; you can point to any OpenAI-compatible endpoint (e.g., Mistral, Ollama, OpenAI's own API). **NVIDIA NIM is the default** during development because it offers free access to a curated set of open models, removing the need for a billing dependency.

### Supported Moderation Categories

The moderation model typically returns flags like:
- `violence`
- `harassment`
- `self_harm` (or `crisis`) — triggers a `SUPPORT_RESOURCE` event to both users
- `sexual`
- `dangerous_goods`

Contact your AI provider's documentation for the full set of categories supported by your chosen model.

## Security & Privacy

### Cryptographic Practices

- **Phone numbers** — Stored as HMAC-SHA256 hashes (`phoneHash`), never in plaintext
- **OTP codes** — Stored as HMAC-SHA256 hashes; the actual code is never logged in production
- **Refresh tokens** — Hashed before database storage; only the hash is persisted
- **Access tokens** — Short-lived (15 minutes by default) and signed with `JWT_ACCESS_SECRET`
- **Refresh tokens** — Longer-lived (7 days by default) and signed with `JWT_REFRESH_SECRET`

### Race Condition Prevention

- **OTP consumption** — Guarded by row-level locking; once consumed, the row is marked and cannot be reused
- **Token rotation** — Transactional: old refresh tokens are revoked and new ones issued atomically
- **Matching queue** — Redis/Valkey's atomic `LPOP` prevents race conditions on the queue itself (no application-level locking needed)

### Authentication & Authorization

- **Access token validation** — Required on all WebSocket connections; missing or expired tokens are rejected at the handshake
- **Account bans** — Checked at two points:
  1. During `verifyOtp` — Banned accounts cannot log in (403 Forbidden)
  2. During `joinQueue` — Banned accounts cannot enter the matching queue
  3. Planned: During message sending — Active sockets closed immediately if the user is banned mid-conversation

- **Blocking** — Checked during matching; users who block each other are never paired

### Data Handling

- **Pseudonymity** — Usernames are chosen and can be changed; phone numbers are hashed and never exposed
- **Profile visibility** — Only your matched partner can see your username and profile
- **Message persistence** — Chat history is stored indefinitely (retention policy is planned before public launch)
- **Account deletion** — Not yet implemented; planned feature with a grace period

### Third-Party Integrations

- **Twilio** — Uses a Restricted API Key scoped only to SMS sending, not full account access
- **AI moderation** — Calls are isolated behind a swappable client interface; queries do not include full message context (only necessary excerpts)
- **Environment variables** — API keys are read from `.env` and never committed to version control

### Session Security

- **WebSocket token** — Passed as a query parameter; safe for WebSocket handshakes (HTTP-only cookies are not available for WebSocket)
- **Session revocation** — Active sessions can be revoked via logout; sessions expire automatically after the refresh token lifetime
- **Concurrent connections** — Users can have multiple active WebSocket connections (no single-session enforcement yet)

### Known Limitations (Pre-Launch)

- Retention and account-deletion policies are not yet defined
- No rate limiting on OTP requests or login attempts (planned)
- No audit logging (planned for a future admin dashboard)
- Message history export not yet implemented
- No end-to-end encryption (messages are in plaintext in the database)

## Development Commands

Run these from `apps/server`:

```bash
npm run dev             # Compile in watch mode and start the server
npm run db:generate     # Generate a migration from schema changes
npm run db:migrate      # Apply pending migrations
npm run db:studio       # Open Drizzle Studio
```

There is currently no automated test command configured in `apps/server/package.json`; backend verification is manual, run against live infrastructure (Docker Postgres/Valkey, Postman, and Postman's WebSocket client) for the implemented auth, profile, and matching flows.

## Architecture Decisions

- [Database selection](docs/adr/0001-database-selection.md)
- [Authentication strategy](docs/adr/0002-authentication-strategy.md)
- [Realtime matching architecture](docs/adr/0003-realtime-matching-architecture.md)
- [AI provider strategy and fail-open moderation](docs/adr/0004-ai-provider-strategy.md)
- [Backend build plan](docs/backend-build-plan.md)

## Testing & Debugging

### Manual API Testing

Use **Postman** or similar tools to test HTTP endpoints. Import the base URL and auth flow:

1. **Request OTP**: `POST /api/auth/otp/request` with `{ "phone": "+1234567890" }`
2. **Verify OTP**: `POST /api/auth/otp/verify` with `{ "phone": "+1234567890", "otp": "<logged-to-console>" }`
3. **Store tokens**: Copy `accessToken` and `refreshToken` from the response
4. **Set Authorization header**: `Authorization: Bearer <accessToken>`
5. **Get profile**: `GET /api/users/me`

### WebSocket Testing

Use Postman's WebSocket client or `wscat`:

```bash
npm install -g wscat
wscat -c "ws://localhost:8000/ws?accessToken=<ACCESS_TOKEN>"
```

Then send events as JSON:

```json
{ "type": "JOIN_QUEUE", "mood": "anxious", "interests": ["music"] }
```

### Debugging

- **Database queries**: Open Drizzle Studio with `npm run db:studio` to inspect tables in real time
- **Redis state**: Use `redis-cli` to inspect Valkey queues and ban denylist
- **Server logs**: Run `npm run dev` to see console logs (includes OTP codes in stub mode)

## Troubleshooting

| Issue | Solution |
| --- | --- |
| **`ECONNREFUSED` on PostgreSQL** | Check Docker: `docker ps`. If Postgres is not running, run `docker compose -f apps/server/docker-compose.yml up -d` |
| **`ECONNREFUSED` on Valkey** | Same as above; both services start together |
| **Migration errors** | Ensure `DATABASE_URL` is correct and Postgres is running. Try `npx drizzle-kit migrate --help` |
| **OTP never arrives via SMS** | Ensure `OTP_STUB_MODE=false` and Twilio vars are set. In stub mode, check the server console |
| **WebSocket connection rejected** | Verify the access token is valid and included in the query string: `ws://localhost:8000/ws?accessToken=<TOKEN>` |
| **AI moderation fails silently** | Check `NVIDIA_API_KEY` and `AI_BASE_URL`. The system is designed to fail open — messages are sent regardless, with a logged error |
| **Port 8000 already in use** | Change `PORT` env var or kill the process: `lsof -i :8000` (macOS/Linux) or `netstat -ano` (Windows) |

## Development Conventions

### Code Organization

- **TypeScript strict mode** — All files must pass `npx tsc --noEmit` without errors
- **Async/await** — Preferred over `.then()` chains for readability and error handling
- **Environment variables** — Always read via [common/config/index.ts](apps/server/src/common/config/index.ts) using `required()` or `optional()` helpers, never directly from `process.env`
- **Database queries** — Use Drizzle ORM methods; raw SQL is only acceptable in migration files
- **Error handling** — Leverage the centralized `ApiError` class in [common/utils/api-error.ts](apps/server/src/common/utils/api-error.ts)

### API Layer

- **DTO pattern** — Define request/response shapes using Zod schemas in `src/modules/<feature>/dto/`
- **Controllers** — Lightweight handlers in `src/modules/<feature>/<feature>.controllers.ts` that call services and format responses
- **Services** — Business logic in `src/modules/<feature>/<feature>.service.ts` (database queries, integrations, side effects)
- **Routes** — HTTP route definitions in `src/modules/<feature>/<feature>.routes.ts`; export and mount in [app.ts](apps/server/src/app.ts)

### WebSocket Layer

- **Gateways** — Event handlers in `src/modules/<feature>/<feature>.gateway.ts` that parse, validate, and route incoming WebSocket events
- **Message types** — Define client and server event types as constants or enums
- **Error responses** — Send structured `{ type: "ERROR", message: "..." }` events on validation failures

### Database

- **Keys** — Use builder functions in [common/redis/keys.ts](apps/server/src/common/redis/keys.ts) for Redis/Valkey keys; never hardcode key strings
- **Migrations** — Store in [drizzle/](apps/server/drizzle/); generate with `npx drizzle-kit generate` after schema changes
- **Schema** — Define in [common/db/schema.ts](apps/server/src/common/db/schema.ts); use Drizzle column types for consistency

### Logging

- Use `console.log()`, `console.error()`, and `console.warn()` for now
- Structured logging (JSON-formatted logs with levels and context) is a planned enhancement
- Sensitive data (API keys, full phone numbers, full JWTs) must never be logged

### Testing

- **HTTP endpoints** — Test manually with Postman or `curl`
- **WebSocket events** — Test with `wscat` or Postman's WebSocket client
- **Database state** — Inspect with `npm run db:studio` (Drizzle Studio)
- **Redis state** — Inspect with `redis-cli` (Valkey)
- Automated tests are planned for a future sprint

## Common Development Tasks

### Adding a new HTTP endpoint

1. Create a route file in `src/modules/<feature>/<feature>.routes.ts`
2. Define a DTO in `src/modules/<feature>/dto/`
3. Implement the handler in `src/modules/<feature>/<feature>.controllers.ts`
4. Register the route in `src/app.ts`

### Adding a new WebSocket event

1. Define the event type and payload in `src/modules/<feature>/<feature>.gateway.ts`
2. Emit from the server using `socket.emit('<EVENT_NAME>', payload)`
3. Update the [WebSocket Events](#-websocket-events) section of this README

### Running a database migration

```bash
# After modifying schema in src/common/db/schema.ts
npx drizzle-kit generate

# Review the generated SQL in drizzle/
npx drizzle-kit migrate

# View the data
npm run db:studio
```

### Checking TypeScript errors

```bash
npx tsc --noEmit
```

## Roadmap & Next Steps

### Phase 2: Chat & Conversation (In Progress)

- [ ] Wire `SEND_MESSAGE` event to chat gateway and service layer
- [ ] Implement typing indicators (`TYPING`, `STOP_TYPING` events)
- [ ] Add `LEAVE_ROOM` event to close conversations explicitly
- [ ] Implement 30-second silence timer and icebreaker generation
- [ ] Add support for message image uploads and URLs

### Phase 3: Moderation & Safety (Planned)

- [ ] Wire `REPORT` event to moderation gateway
- [ ] Wire `BLOCK` event and enforce bi-directional blocks
- [ ] Implement message-level ban enforcement (close socket mid-conversation)
- [ ] Add `SUPPORT_RESOURCE` event for crisis detection
- [ ] Build admin reporting dashboard (future)

### Phase 4: Mobile App (Planned)

- [ ] Scaffold React Native screens:
  - Phone number input
  - OTP verification
  - Mood selection
  - Matching queue status
  - Chat interface
- [ ] Integrate with backend WebSocket API
- [ ] Add push notifications (optional)
- [ ] Implement avatar upload from device

### Phase 5: Scaling & Polish (Planned)

- [ ] Add automated test suite (Jest for backend, Detox for mobile)
- [ ] Implement rate limiting on auth endpoints
- [ ] Add structured logging (JSON format, log levels)
- [ ] Support multi-instance deployments with Redis Pub/Sub
- [ ] Define retention policy and implement data expiry
- [ ] Build account-deletion workflow with grace period

### Post-Launch Enhancements

- [ ] Advanced matching beyond exact-mood FIFO (compatibility scores, time zones, topics)
- [ ] Chat history export and search
- [ ] User analytics dashboard
- [ ] AI-powered icebreaker and conversation improvement suggestions
- [ ] Read receipts and delivery status
- [ ] End-to-end encryption (E2EE) for messages
- [ ] Web app companion (browser-based chat)

## License

MIT © 2026 Unsaid

*Built from a feeling that stayed too long.*