# Unsaid

> *The wound that ages, aches deeper.*  
> *The fruit that ripens, tastes sweeter.*  
> *The pickle that marinates, hits different.*  
>  
> *Some things need time to become what they were always meant to be.*

---

**Unsaid** is a pseudonymous mood-matching social platform that connects people through authentic conversations. Phone-verified accounts ensure accountability, while chosen usernames keep early interactions comfortably private.

**Status:** ✅ Active development — the core flow is live: phone OTP auth, mood-based matching, real-time chat, typing indicators, icebreakers, moderation (report/block), and connection heartbeat are all in place across the mobile app and backend.

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

### ✅ Implemented

#### Authentication & Accounts
- **Phone OTP Verification** — Twilio integration with a console stub mode for local development
- **JWT Token System** — Access and refresh tokens with rotation and revocation
- **Session Management** — Login, refresh, logout, and session expiry handling
- **User Profiles** — Username, avatar URL, and bio support after onboarding, editable from the mobile app's profile screen

#### Real-Time Matching
- **Mood-based Queue** — Exact mood FIFO matching via Valkey
- **Interest Tagging** — User interests are captured for the matching flow
- **Socket Registry** — Active socket tracking by user ID, registered on every authenticated connection (not just queue joins), so matched or already-chatting users stay reachable across reconnects and server restarts
- **Queue Management** — Join/leave queue and disconnect cleanup
- **Block/Ban System** — Matching excludes blocked and banned users

#### Chat System
- **Room Lifecycle** — Match creates a persistent room in PostgreSQL
- **Message Persistence** — Messages and timestamps are stored reliably
- **Real-time Messaging** — Send/receive through WebSocket events with validation
- **Typing Indicators** — Real-time typing and stop-typing broadcasts between participants
- **Activity & Silence Flow** — Activity tracking resets the icebreaker timer whenever either participant sends a message
- **Report & Block Actions** — Users can report or block the active partner from chat; blocking ends the room and notifies the other participant
- **Icebreaker Generation** — AI-generated conversation starters fire after a configurable silence window, avoid repeating the previous suggestion in the same room, and fall back to a static prompt if the AI call fails or times out
- **Connection Heartbeat** — Client sends a periodic `PING`, server replies `PONG`, keeping WebSocket connections alive on networks (e.g. mobile hotspots) that kill idle sockets

#### Mobile Chat Interface
- **Matched Chat Screen** — Full message history and conversation state in the mobile app
- **Self/Partner/System Bubbles** — Message rendering matches the active participant and system events, with distinct card styling for icebreakers and support-resource messages
- **Typing UI** — Partner typing state is surfaced visually while they are active
- **Input and Send Flow** — Text input, send action, and typing debounce behavior are wired
- **Room Actions** — Leave, block, and report actions are connected to socket events
- **Session Handling** — Revoked sessions and partner departures are handled gracefully
- **Profile Screen** — Edit username, avatar URL, and bio; changes reflect app-wide immediately via AuthContext

#### Moderation & Safety
- **AI Content Screening** — OpenAI-compatible moderation pipeline with fail-open behavior
- **Report System** — Report events are supported in the chat flow and persisted for review
- **Block Enforcement** — Matching and room state respect the current block graph
- **Bans** — Global ban checks are enforced during login and queue entry
- **Safety Fallbacks** — The app keeps the conversation alive if moderation fails instead of blocking the user
- **Support Resource Messaging** — Self-harm-flagged messages trigger a `SUPPORT_RESOURCE` event with an actual supportive message shown to both participants

### 🛠️ In Progress

- **Moderation admin workflow** — More advanced report review and moderation tooling
- **Expanded chat cleanup and edge-case recovery** — Room close, reconnect, and message resync polishing
- **Shared WebSocket connection** — Currently each screen (mood picker, chat room) opens its own connection independently; a shared app-wide connection via context is planned to reduce connection churn during navigation

### 📅 Planned

- **File Uploads** — Avatar and message image support
- **Chat History Export** — Download or archive a conversation
- **Account Deletion** — Hard-delete and grace-period workflows
- **Advanced Matching** — Compatibility scoring, timezone-aware pairing, and richer filters
- **Multi-Instance Deployment** — Redis Pub/Sub and horizontal WebSocket scaling

---

## 🏗️ Project Structure

```
unsaid/
├── apps/
│   ├── mobile/                    # React Native / Expo app (in development)
│   │   ├── app/
│   │   │   ├── (auth)/            # Authentication screens (phone-login, otp-verify)
│   │   │   ├── (main)/            # Main app screens (mood-picker, chat, profile)
│   │   │   │   ├── mood-picker.tsx       # Mood selection & matching interface
│   │   │   │   ├── profile.tsx           # Edit username/avatar/bio, logout
│   │   │   │   └── chat/[roomId].tsx     # Chat room with messaging & moderation
│   │   │   ├── _layout.tsx        # Root layout
│   │   │   └── fonts.ts           # Font configuration
│   │   ├── components/
│   │   │   └── DuskBackground.tsx # Gradient background component
│   │   ├── lib/
│   │   │   ├── api.ts             # HTTP client with token management
│   │   │   ├── auth-context.tsx   # Auth state management
│   │   │   ├── auth-storage.ts    # Secure token storage
│   │   │   ├── ws-client.ts       # WebSocket connection helpers (incl. heartbeat)
│   │   │   └── theme.ts           # Design tokens (colors, typography, spacing)
│   │   ├── assets/
│   │   ├── app.json               # Expo configuration
│   │   ├── package.json
│   │   └── tsconfig.json
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
│       │       ├── matching/      # Queue logic, pairing algorithm, socket registry
│       │       ├── chat/          # Messages, rooms, persistence, icebreaker timer
│       │       ├── moderation/    # Report, block, ban workflows
│       │       ├── ai/            # AI content screening & icebreaker generation
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
│       ├── 0004-ai-provider-strategy.md
│       └── 0005-websocket-connection-resilience.md
│
└── README.md
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Frontend** | React Native, Expo SDK 57 | Mobile app |
| **Backend Runtime** | Node.js 20+, Express 5 | HTTP server & REST API |
| **Language** | TypeScript (strict mode) | Type-safe backend code |
| **Real-time** | WebSocket (`ws` library) | Bidirectional chat & matching |
| **Database** | PostgreSQL 17 | Persistent user, chat, moderation data |
| **ORM** | Drizzle ORM + Drizzle Kit | Type-safe schema & migrations |
| **Cache/Queue** | Valkey 8 (Redis-compatible) | Mood queues, session/ban denylists, transient state |
| **Input Validation** | Zod + BaseDto wrapper | Schema-based DTO validation |
| **Authentication** | Twilio + JWT | Phone OTP → access/refresh tokens |
| **AI/Moderation** | OpenAI-compatible API | Content screening & icebreaker generation (NVIDIA NIM default) |
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

`NVIDIA_API_KEY`, `MODERATION_MODEL`, and `AI_BASE_URL` are read by the server configuration layer (`common/config`) and are required for the moderation and icebreaker modules to function — the client defaults to NVIDIA's NIM catalog, which offers free access to a range of open models, chosen specifically to avoid a billing dependency during development. See [ADR-0004](docs/adr/0004-ai-provider-strategy.md) for the reasoning, including the fail-open policy if the AI call fails.

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

### 6. Run the mobile app

In another terminal:

```bash
cd apps/mobile
npm start
```

Use Expo Go, an Android emulator, an iOS simulator, or the web target.

If testing across two devices on the same network (e.g. an emulator plus a physical phone), point `EXPO_PUBLIC_BASE_URL` and `EXPO_PUBLIC_WS_URL` in `apps/mobile/.env` at your machine's actual LAN IP rather than `10.0.2.2` (which only resolves from an Android emulator, not a real device), and make sure your firewall allows inbound connections on the backend's port.

The mobile app flow:
1. Phone login screen — Request OTP
2. OTP verification — Verify and create session
3. Mood picker — Select mood and interests, join matching queue
4. Chat interface — Send/receive messages with matched partner, report/block functionality
5. Profile — Edit username, avatar, and bio; log out

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

`avatarUrl` is validated as a URL when present — omit the field entirely rather than sending an empty string, since an empty string fails URL validation.

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

The WebSocket server authenticates during the upgrade handshake using the access token. Missing or invalid tokens are rejected before the connection opens. Every authenticated connection is registered in the socket registry immediately (not only when joining the queue), so any connected user — queuing, matched, or mid-conversation — stays reachable across reconnects.

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

**Status**: Implemented and live.

---

#### Server: Message

```json
{
  "type": "MESSAGE",
  "message": {
    "id": "uuid",
    "roomId": "uuid",
    "senderId": "uuid",
    "content": "Hello!",
    "messageType": "text",
    "imageUrl": null,
    "sentAt": "2026-01-01T12:34:56Z",
    "flaggedAt": null
  }
}
```

Received when the partner sends a message. Note that the message fields are nested under `message`, not flat on the event. `flaggedAt` is set if AI moderation flagged the content as policy-violating.

**Status**: Implemented and live.

---

#### Server: Support Resource

```json
{
  "type": "SUPPORT_RESOURCE",
  "content": "If you're struggling, here are some resources: ..."
}
```

Sent to both users when a message is flagged with moderation category `self_harm`. Note the field is `content`, not `message`.

**Status**: Implemented.

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

**Status**: Implemented. Creates a persistent report record via `createReport`.

---

#### Server: Report Received

```json
{
  "type": "REPORT_RECEIVED"
}
```

Acknowledgment that the report was logged.

**Status**: Implemented. Sent immediately after a report is logged.

---

#### Client: Block

```json
{
  "type": "BLOCK",
  "roomId": "uuid"
}
```

Block the current partner. The user will not be matched with this person again. The room is closed for both participants.

**Status**: Implemented. Calls `createBlock`, ends the room, and notifies the partner via `PARTNER_LEFT`.

---

#### Server: Partner Left

```json
{
  "type": "PARTNER_LEFT"
}
```

Sent when the partner leaves the room, blocks you, or is disconnected.

**Status**: Implemented. Sent to the remaining participant when their partner blocks them or leaves the room.

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

**Status**: Implemented in the mobile chat flow and active in the socket layer.

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

**Status**: Implemented and surfaced in the chat UI as a partner typing indicator.

---

### Silence Management

#### Server: Icebreaker

```json
{
  "type": "ICEBREAKER",
  "suggestion": "What's your favorite music genre and why?"
}
```

Sent when the system detects a conversation silence (configurable timer, default 30 seconds, checked every 10 seconds). Provides an AI-generated conversation starter to help re-engage users. The last suggestion sent in a room is tracked and passed back into the prompt so the model avoids repeating or closely rephrasing it. Falls back to a static prompt ("What's been on your mind today?") if the AI call fails or times out.

**Status**: Implemented.

---

### Connection Heartbeat

#### Client: Ping

```json
{ "type": "PING" }
```

Sent by the client every 15 seconds while connected.

---

#### Server: Pong

```json
{ "type": "PONG" }
```

Acknowledgment reply. Purely keeps the connection active on networks that close idle sockets (observed on mobile hotspots); carries no other meaning and is discarded by the client on receipt.

**Status**: Implemented.

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

### In-Memory State (server process)

Some transient state lives only in the running server process (not Valkey or Postgres), and is lost on restart:

- **Socket registry** — `Map<userId, WebSocket>` tracking every connected user, keyed by user ID. Populated on every authenticated connection, cleared on disconnect.
- **Icebreaker silence tracking** — `Map<roomId, timestamp>` and `Map<roomId, boolean>` tracking last activity and whether an icebreaker has already fired for the current silence period.
- **Icebreaker history** — `Map<roomId, string>` tracking the last icebreaker suggestion sent per room, used to avoid repeats.

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

### Icebreaker Generation

**Service layer** ([modules/ai/icebreaker.ts](apps/server/src/modules/ai/icebreaker.ts)):
- Calls the same OpenAI-compatible endpoint as moderation, at a higher temperature (1.0) for variety
- Prompts for a single casual conversation starter based on the shared mood
- Tracks the most recently sent suggestion per room and instructs the model not to repeat or closely rephrase it
- Falls back to a static prompt ("What's been on your mind today?") if the call fails or returns no content

### Configuration

Moderation and icebreaker generation are configured via environment variables:

```dotenv
AI_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=your-api-key
MODERATION_MODEL=meta/muse-glimmer-30b
ICEBREAKER_MODEL=meta/muse-glimmer-30b
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
- Each screen (mood picker, chat room) opens its own WebSocket connection independently rather than sharing one app-wide connection; this can cause brief connection churn during navigation or Fast Refresh in development, and is a candidate for a shared-context refactor
- No message resync after a genuine reconnect — messages sent while a client was disconnected are not automatically backfilled on reconnect

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
- [WebSocket connection resilience](docs/adr/0005-websocket-connection-resilience.md)
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

### Testing Matching & Chat With Two Users

Since matching requires two connected clients, a few practical options for local testing:

- **Two Android emulators**, or one emulator plus a physical device on the same network — set `EXPO_PUBLIC_BASE_URL`/`EXPO_PUBLIC_WS_URL` to your machine's LAN IP (not `10.0.2.2`, which is emulator-only) so a physical device can reach the backend
- **A lightweight `ws` script** acting as a fake second user — connects with a real access token, sends `JOIN_QUEUE`, and logs incoming events, without needing a second UI
- Two `wscat` sessions authenticated as different users

### Debugging

- **Database queries**: Open Drizzle Studio with `npm run db:studio` to inspect tables in real time
- **Redis state**: Use `redis-cli` to inspect Valkey queues and ban denylist
- **Server logs**: Run `npm run dev` to see console logs (includes OTP codes in stub mode)
- **Socket registry state**: Since it's in-memory, restarting the server clears it — any client that doesn't reconnect afterward will appear unreachable until it does

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
| **Physical device can't reach the backend, but the emulator can** | `10.0.2.2` only resolves from an Android emulator. Point `EXPO_PUBLIC_BASE_URL`/`EXPO_PUBLIC_WS_URL` at your machine's actual LAN IP instead, and confirm your OS firewall allows inbound connections on the backend's port |
| **`PATCH /api/users/me` returns "Invalid URL"** | `avatarUrl` is validated as a URL when present. Omit the field entirely if it's empty rather than sending `""` |
| **Messages/icebreakers render as empty bubbles on the client** | Check the client is reading the correct field: `MESSAGE` events nest content under `message.content`, and `ICEBREAKER` events use `suggestion`, not `content` |
| **WebSocket disconnects repeatedly on an idle connection** | Some networks (mobile hotspots especially) close idle sockets. Confirm the heartbeat (`PING`/`PONG` every 15s) is running on the client |

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
- **Socket registration** — Register new authenticated sockets in the shared registry as soon as the connection is established, not only in response to a specific event, so any connected user stays reachable regardless of what they're currently doing

### Database

- **Keys** — Use builder functions in [common/redis/keys.ts](apps/server/src/common/redis/keys.ts) for Redis/Valkey keys; never hardcode key strings
- **Migrations** — Store in [drizzle/](apps/server/drizzle/); generate with `npx drizzle-kit generate` after schema changes
- **Schema** — Define in [common/db/schema.ts](apps/server/src/common/db/schema.ts); use Drizzle column types for consistency

### Logging

- Use `console.log()`, `console.error()`, and `console.warn()` for now
- Structured logging (JSON-formatted logs with levels and context) is a planned enhancement
- Sensitive data (API keys, full phone numbers, full JWTs) must never be logged
- Remove temporary debug logs (e.g. `console.log("DEBUG ...")`) once an issue is confirmed fixed, rather than leaving them in permanently

### Mobile Conventions

- **Design tokens** — Use `colors`, `typography`, `spacing`, `radii`, and `fontFamily` from [lib/theme.ts](apps/mobile/lib/theme.ts) rather than hardcoded values
- **Voice** — Copy is lowercase and intimate where it's user-facing emotional content (screen headlines, empty states), matching the app's tone; standard UI chrome (buttons, labels) can stay more conventional
- **WebSocket payload shapes** — Always check the actual server-side `.send()` call for an event's exact field names before wiring a client handler; several past bugs came from assuming a flat shape when the payload was nested, or guessing a field name that didn't match

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
2. Register it with `registerMessageHandler("EVENT_NAME", handler)`
3. Update the [WebSocket API](#websocket-api) section of this README, including a concrete payload example matching exactly what the handler sends

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

### Phase 2: Chat & Conversation (Live)

- [x] Wire `SEND_MESSAGE` event to the chat gateway and service layer
- [x] Implement typing indicators (`TYPING`, `STOP_TYPING` events)
- [x] Add room-level actions such as leave, block, and report from the chat screen
- [x] Surface partner state updates such as typing, left-room, and session revocations in the app UI
- [x] Add conversation starter and support-resource event handling in the chat flow
- [x] Fix icebreaker and message payload mismatches between client and server
- [x] Prevent icebreakers from repeating the same suggestion within a room
- [ ] Add support for message image uploads and URLs
- [x] Add a connection heartbeat (PING/PONG) to prevent idle disconnects on unstable networks
- [ ] Add message resync after a genuine reconnect (fetch messages sent while disconnected)

### Phase 3: Moderation & Safety (In Progress)

- [x] Wire `REPORT` event to the chat flow
- [x] Wire `BLOCK` event and enforce partner-level restrictions
- [ ] Implement stricter message-level ban enforcement during live sessions
- [x] Add `SUPPORT_RESOURCE` handling with an actual supportive message
- [ ] Build admin reporting dashboard (future)

### Phase 4: Mobile App (Live)

- [x] Scaffold React Native project with Expo
- [x] Phone number input screen
- [x] OTP verification screen
- [x] Mood selection screen with interest tagging
- [x] Matching queue and room transition flow
- [x] Chat interface screen with live message updates and typing state
- [x] Typing indicator implementation in the mobile chat UI
- [x] Profile screen for editing username, avatar, and bio
- [x] Redesign mood picker and chat screens to match the app's visual and voice identity
- [ ] Add push notifications (optional)
- [ ] Implement avatar upload from device

### Phase 5: Scaling & Polish (Planned)

- [ ] Refactor to a single shared WebSocket connection (context/provider) instead of per-screen connections
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
- [ ] Read receipts and delivery status
- [ ] End-to-end encryption (E2EE) for messages
- [ ] Web app companion (browser-based chat)

## Contributing

The project follows TypeScript strict mode and the development conventions outlined in this README. Before starting a new feature:

1. Check the [Roadmap & Next Steps](#-roadmap--next-steps) section
2. Review the [Architecture Decisions](docs/adr/) directory
3. Follow the [Development Conventions](#-development-conventions) section
4. Test manually against live infrastructure (Docker Postgres/Valkey)

## License

MIT © 2026 Unsaid

*Built from a feeling that stayed too long.*