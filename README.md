# 🌙 Unsaid

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Node](https://img.shields.io/badge/node-20%2B-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Backend](https://img.shields.io/badge/backend-Phase%203%20complete-success)

> *The wound that ages, aches deeper.*
> *The fruit that ripens, tastes sweeter.*
> *The pickle that marinates, hits different.*
>
> *Some things need time to become what they were always meant to be.*
> *This app is for everything you let marinate too long.*

---

## 📖 Table of Contents

- [What is Unsaid?](#what-is-unsaid)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Auth Endpoints](#-auth-endpoints--complete-tested)
- [User Endpoints](#-user-endpoints--complete-tested)
- [WebSocket](#-websocket--matching-events-live-and-tested-chat-events-pending-phase-4)
- [Moods](#-moods)
- [Blocking](#-blocking)
- [Database](#️-database)
- [Request Validation](#-request-validation)
- [Testing](#-testing)
- [Safety & Data](#️-safety--data)
- [Architecture Decisions](#-architecture-decisions)
- [Docker](#-docker)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## What is Unsaid?

You know that feeling at 2am when something is sitting heavy on your chest?

Not sad enough to cry. Not okay enough to sleep.
You open WhatsApp. Scroll through contacts. Close it.

Because who do you call? Your friends have their own lives. Your family won't understand. A therapist costs money you don't have right now.

So you just... sit with it.

**Unsaid is for that moment.**

A space where you connect with a stranger who might be sitting with something heavy too — matched by mood, not by who you know. You keep a real profile and a saved history, so the people you talk to are accountable and your conversations aren't lost the moment you close the app. But your match sees your chosen username and mood first, not your full identity — the comfort of talking to a stranger, backed by the safety of a real account.

---

## ✨ Features

- 📱 **Phone-verified accounts** — real identity behind the scenes, pseudonymous in chat
- 👤 **Profiles** — username, avatar, bio, saved chat history
- 🌊 **Mood Matching** — connect with someone who feels what you feel
- 🎯 **Interest Tags** — so you're not just matched on pain, but on who you are
- ⚡ **Real-time Chat** — WebSocket-powered, instant
- 🖼️ **Image Sharing** — sometimes a picture says what words can't
- 🕯️ **AI Icebreaker** — when silence gets too loud, a gentle nudge
- 🛡️ **AI Moderation** — every message screened, safety net for hard moments
- 🚩 **Reporting** — flag a conversation, message, or user
- 🚫 **[Blocking](#-blocking)** — never matched with someone you've blocked, ever again
- ⛔ **Bans that stick** — tied to your verified account, not just a session

---

## 🏗️ Architecture

```
Phone number ──► OTP verify ──► JWT (access + refresh)
                                     │
                                     ▼
                        Authenticated WebSocket connection
                                     │
                                     ▼
User selects mood + interests
        │
        ▼
   WebSocket (JOIN_QUEUE)
        │
        ▼
   Redis Queue (mood-based, excludes blocked/banned) ✅
        │
        ▼
   Matching Service (exact mood match, FIFO — v1) ✅
        │
        ▼
   Room Created → both users notified (MATCHED) ✅
        │
        ├──► Messages flow via WebSocket → persisted (Postgres, encrypted at rest) — Phase 4
        │
        ├──► AI moderation on every message (NVIDIA-hosted LLM, OpenAI-compatible API) — Phase 4
        │        │
        │        └──► flagged content → review queue / crisis resource surfaced
        │
        ├──► 30s silence → AI icebreaker generated — Phase 4
        │
        ├──► Report / Block → immediate re-match exclusion + review queue — Phase 4
        │
        └──► Ban issued → denylist check on every WS message, active sockets dropped ✅ (matching), Phase 4 (chat)
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Mobile App | React Native (Expo, SDK 57) |
| Backend | Node.js + Express + TypeScript |
| Real-time | WebSockets (`ws`) — ✅ built and tested |
| Auth | Phone OTP (Twilio, Restricted API Key) + JWT (access + refresh) |
| Validation | Zod, via a shared `BaseDto` (static-class pattern) + `validate` middleware |
| Matching & State | Redis 7 (Valkey) — ✅ built and tested |
| Persistence | PostgreSQL 17 |
| ORM | Drizzle ORM + Drizzle Kit |
| Event Logging | Structured logs → (Kafka only if/when scale needs it) |
| AI | NVIDIA NIM (OpenAI SDK, `integrate.api.nvidia.com`) — icebreaker + moderation (Phase 4) |
| Images | Cloudinary (Phase 4) |
| Containerization | Docker + Docker Compose |
| Monorepo | npm workspaces |
| Docs Site | Docusaurus |

---

## 📁 Project Structure

```
unsaid/
├── apps/
│   ├── server/                    # Node.js backend
│   │   ├── src/
│   │   │   ├── modules/           # Feature modules — each owns its own schema
│   │   │   │   ├── auth/          # ✅ done — OTP, JWT, sessions
│   │   │   │   │   ├── auth.schema.ts        # users, otpCodes, sessions
│   │   │   │   │   ├── dto/                   # RequestOtpDto, VerifyOtpDto, RefreshAccessTokenDto
│   │   │   │   │   ├── otp.ts                 # Twilio client, stub-mode toggle
│   │   │   │   │   ├── auth.service.ts        # requestOtp, verifyOtp, refreshAccessToken, logout
│   │   │   │   │   ├── auth.controllers.ts
│   │   │   │   │   └── auth.routes.ts
│   │   │   │   ├── users/         # ✅ done — profile read/update
│   │   │   │   │   ├── dto/UpdateUserDto.ts
│   │   │   │   │   ├── users.service.ts        # getMe, updateMe (partial updates)
│   │   │   │   │   ├── users.controllers.ts
│   │   │   │   │   └── users.routes.ts
│   │   │   │   ├── matching/      # ✅ done — real-time queue + matching, fully tested
│   │   │   │   │   ├── socket-registry.ts      # Map<userId, WebSocket>
│   │   │   │   │   ├── matching.queue.ts        # joinQueue, leaveQueue, findAndRemoveCandidate
│   │   │   │   │   └── matching.gateway.ts       # registers JOIN_QUEUE/LEAVE_QUEUE handlers
│   │   │   │   ├── chat/          # ⏳ Phase 4 — WebSocket gateway + messaging + history
│   │   │   │   ├── moderation/    # ⏳ Phase 4 — reports, blocks, bans
│   │   │   │   ├── ai/            # ⏳ Phase 4 — icebreaker + moderation calls (NVIDIA NIM, OpenAI SDK)
│   │   │   │   └── upload/        # ⏳ Phase 4 — image uploads
│   │   │   ├── common/
│   │   │   │   ├── db/            # Drizzle client + merged schema
│   │   │   │   ├── redis/         # ✅ Redis client singleton + centralized key builders (keys.ts)
│   │   │   │   ├── ws/            # ✅ server.ts — shared WebSocket transport (auth at handshake,
│   │   │   │   │                    registerMessageHandler/onDisconnect API, used by matching now,
│   │   │   │   │                    chat later)
│   │   │   │   ├── config/        # Env loading + validation (fail-fast)
│   │   │   │   ├── dto/           # BaseDto — static-class Zod wrapper
│   │   │   │   ├── utils/         # jwt.utils, api-error, api-response
│   │   │   │   └── middlewares/   # error-handler, validate, auth (isAuthenticated)
│   │   │   ├── types/
│   │   │   │   └── express.d.ts   # Request.userId augmentation
│   │   │   ├── app.ts             # mounted routes, health check, error handler
│   │   │   └── server.ts          # createServer, attachWebSocketServer, connectRedis, registerMatchingHandlers
│   │   ├── drizzle/                # Generated SQL migrations
│   │   ├── drizzle.config.ts
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── mobile/                    # React Native (Expo) — scaffolded, Phase 5
│   └── docs/                      # Docusaurus documentation site
│
├── packages/
│   └── shared/                    # Shared TypeScript types
│
├── docs/                          # Raw docs content (ADRs, build plan) — rendered by apps/docs
│   ├── backend-build-plan.md      # (gitignored — private working notes, full pseudocode per phase)
│   └── adr/
│       ├── 0001-database-selection.md
│       ├── 0002-authentication-strategy.md
│       └── 0003-realtime-matching-architecture.md
│
└── docker-compose.yml             # Postgres 17 + Valkey (Redis-compatible) + server, for local dev
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- npm

### 1. Clone & install

```bash
git clone https://github.com/yourusername/unsaid.git
cd unsaid
npm install
```

### 2. Start infrastructure

```bash
docker compose up -d
# starts Postgres 17 + Valkey (Redis-compatible)
```

### 3. Configure env

```bash
cp apps/server/.env.example apps/server/.env
# fill in DATABASE_URL, REDIS_URL, JWT secrets, AI_API_KEY (NVIDIA NIM),
# TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_FROM_NUMBER,
# OTP_STUB_MODE=true (keep true during dev — logs the code instead of sending real SMS)
```

### 4. Run migrations

```bash
cd apps/server
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5. Run the server

```bash
npm run dev
# Server: http://localhost:8000
```

### 6. Test a live match (two terminals/Postman WebSocket tabs)

```bash
# get two real accessTokens via /api/auth/otp/request + /verify for two different phone numbers, then:
ws://localhost:8000/ws?accessToken=<TOKEN_1>
ws://localhost:8000/ws?accessToken=<TOKEN_2>

# send from both, same mood:
{"type":"JOIN_QUEUE","mood":"lonely","interests":["music"]}
# both sockets receive MATCHED with a shared roomId
```

### 7. Run the mobile app

```bash
cd apps/mobile
npx expo start
# scan the QR with Expo Go, or press 'a' for Android emulator / 'w' for web
```

---

## 🔐 Auth Endpoints — ✅ complete, tested

| Endpoint | Method | Auth required | Payload | Description |
|---|---|---|---|---|
| `/api/auth/otp/request` | POST | No | `phone` | Sends OTP, rate-limited (3/hr per phone) |
| `/api/auth/otp/verify` | POST | No | `phone, code` | Verifies OTP, creates user if new, returns access + refresh JWT — rejects with 403 if banned |
| `/api/auth/refresh` | POST | No* | `refreshToken` | Rotates session, returns new token pair |
| `/api/auth/logout` | POST | Yes (Bearer) | `refreshToken` | Revokes the session |

*`/refresh` doesn't use `isAuthenticated` — the refresh token itself is the credential.

Access tokens are short-lived (~15 min). Refresh tokens are rotated on every use and stored server-side (`sessions` table, `revokedAt` column) so they can be revoked immediately on ban or logout — not just on next login. OTP codes and refresh tokens are hashed before storage; consumption of an OTP and rotation of a session both run inside a row-locked transaction (`SELECT ... FOR UPDATE`) to prevent replay/race conditions. See [ADR-0002](./docs/adr/0002-authentication-strategy.md).

## 👤 User Endpoints — ✅ complete, tested

| Endpoint | Method | Auth required | Payload | Description |
|---|---|---|---|---|
| `/api/users/me` | GET | Yes (Bearer) | — | Returns the logged-in user's profile |
| `/api/users/me` | PATCH | Yes (Bearer) | `username?, avatarUrl?, bio?` | Partial update — only sent fields change |

`phoneHash` and `banReason` are never included in any response.

---

## 🌐 WebSocket — ✅ matching events live and tested, chat events pending Phase 4

Auth happens at the connection handshake (`ws://host/ws?accessToken=...`) — an invalid or missing token gets the connection destroyed before it ever opens, not accepted and closed after. See [ADR-0003](./docs/adr/0003-realtime-matching-architecture.md).

### Client → Server

| Event | Payload | Status |
|---|---|---|
| `JOIN_QUEUE` | `mood, interests[]` | ✅ Live |
| `LEAVE_QUEUE` | — | ✅ Live (explicit) |
| `SEND_MESSAGE` | `content, messageType, imageUrl?` | ⏳ Phase 4 |
| `TYPING` / `STOP_TYPING` | — | ⏳ Phase 4 |
| `LEAVE_ROOM` | — | ⏳ Phase 4 |
| `REPORT` | `messageId?, reason` | ⏳ Phase 4 |
| `BLOCK` | — | ⏳ Phase 4 |

### Server → Client

| Event | Payload | Status |
|---|---|---|
| `QUEUED` | `position` | ✅ Live |
| `MATCHED` | `roomId, partnerId, partnerMood` | ✅ Live |
| `SESSION_REVOKED` | — | ✅ Live (ban denylist check in matching) |
| `MESSAGE` | `message` | ⏳ Phase 4 |
| `ICEBREAKER` | `suggestion` | ⏳ Phase 4 |
| `PARTNER_TYPING` / `PARTNER_STOP_TYPING` | — | ⏳ Phase 4 |
| `PARTNER_LEFT` | — | ⏳ Phase 4 |
| `REPORT_RECEIVED` | — | ⏳ Phase 4 |
| `ERROR` | `message` | ✅ Live (malformed/unknown message types) |

**Known v1 limitation, documented not accidental:** if a popped queue candidate turns out to be blocked, they are currently discarded rather than re-queued — the requesting user gets no match that round rather than the blocked user losing their place unfairly to a third party. Verified live; see [ADR-0003](./docs/adr/0003-realtime-matching-architecture.md) for the reasoning and the Redis Pub/Sub caveat for horizontal scaling (single-instance only for now).

---

## 😶 Moods

| Value | Label | Emoji |
|---|---|---|
| `lonely` | Lonely | 🌙 |
| `heartbroken` | Heartbroken | 💔 |
| `anxious` | Anxious | 🌀 |
| `overwhelmed` | Overwhelmed | 🌊 |
| `just_venting` | Just venting | 💭 |
| `need_advice` | Need advice | 🕯️ |
| `bored` | Bored | ☁️ |
| `okay` | Just okay | 🍃 |

---

## 🚫 Blocking

Blocking is enforced at the **matching layer**, not just as a client-side filter — a blocked user is structurally unable to be matched with the user who blocked them, in either direction.

| Aspect | Behavior | Status |
|---|---|---|
| Who can block | Any authenticated user, against any other user they've chatted with | ⏳ Phase 4 (WS `BLOCK` event) |
| Effect on matching | Blocked user is excluded from candidate selection for both parties, immediately and permanently | ✅ Enforced in `matching.queue.ts`, verified against live data |
| Effect on an active match | If already in a room together, the room is not auto-ended by blocking alone — that's paired with `LEAVE_ROOM` / `REPORT` in Phase 4 | ⏳ Phase 4 |
| Symmetry | Blocking is one-directional to set (only the blocker needs to act), but exclusion is checked from both sides during matching, so a blocked pair never re-matches regardless of who queues first | ✅ Verified live |
| Un-blocking | Not yet supported — blocks are currently permanent | ⏳ Not yet designed |

**How it fits into matching:** when a user calls `joinQueue`, their blocked-ids list is fetched and passed into the atomic candidate-selection step (see [Safety & Data](#️-safety--data)) — a popped candidate who is on the requester's blocked list is skipped over entirely rather than matched and immediately kicked out, so no one is shown a match that then silently disappears.

This is distinct from **banning**: a ban is a moderation action tied to the account itself and blocks *all* matching and login; blocking is a per-user preference that only affects matching between those two specific people.

---

## 🗄️ Database

- **PostgreSQL 17**, single primary datastore for all relational and message data. See [ADR-0001](./docs/adr/0001-database-selection.md).
- **Drizzle ORM**, schema defined module-wise — each module owns the tables it's responsible for, re-exported through `common/db/schema.ts` for Drizzle Kit to discover.
- **Redis (Valkey)** — ephemeral state only: matching queue (`queue:{mood}`), active ban denylist (`ban:{userId}`), both via centralized key builders in `common/redis/keys.ts`. Not a system of record.
- Migrations generated via `drizzle-kit generate`, applied via `drizzle-kit migrate`.

---

## 🧱 Request Validation

`BaseDto` (`common/dto/BaseDto.ts`) is a static-class Zod wrapper — each DTO extends it with its own `static schema`. The `validate(DtoClass)` middleware calls it statically and rejects bad input with a `400` before the controller runs.

```ts
class RequestOtpDto extends BaseDto {
  static schema = z.object({ phone: z.string().min(10).max(15) })
}
router.post('/otp/request', validate(RequestOtpDto), authController.requestOtp)
```

---

## 🧪 Testing

- **Unit tests** — `vitest`, run per-module (e.g. `socket-registry.test.ts` covers register/unregister/lookup, including overwrite-on-duplicate-userId and independence between users).
- **Live-data integration checks** — matching, blocking, and ban enforcement have all been verified against a running Redis + Postgres instance, not just unit-mocked, per the checkmarks in the Roadmap below.
- Run the suite from `apps/server`:

```bash
npm run test
```

- CI wiring and coverage thresholds: not yet set up — tracked for Phase 4.

---

## 🛡️ Safety & Data

- Phone numbers are stored hashed, never in plaintext beyond the OTP send step.
- OTP codes and refresh tokens are hashed before storage — never kept in plaintext.
- OTP consumption and session rotation both use row-locked transactions (`FOR UPDATE`) to prevent replay/race conditions.
- The matching queue's equivalent race — two users grabbing the same waiting candidate at once — is prevented by running the "find an eligible candidate and remove it" step as a single **atomic Lua script** on Redis (`EVAL`), rather than separate read-then-write calls. See [ADR-0003](./docs/adr/0003-realtime-matching-architecture.md).
- **Bans are enforced immediately, verified live in two places:** login itself is rejected with a 403 for a banned account (`verifyOtp`), and matching is rejected via a Redis denylist check (`joinQueue`) — a banned user cannot obtain fresh credentials *or* queue for a match. Message-level enforcement (closing an active socket mid-conversation) lands in Phase 4.
- **Blocking is enforced and verified live** — see the dedicated [Blocking](#-blocking) section for how exclusion works during matching.
- Messages will be **persisted** and **encrypted at rest** (Phase 4).
- Twilio uses a Restricted API Key scoped to SMS-sending only, not the full account Auth Token. See [ADR-0002](./docs/adr/0002-authentication-strategy.md).
- `OTP_STUB_MODE` toggles between logging the code (dev) and sending real SMS via Twilio — defaults to stub, flip to `false` deliberately per environment.
- Data retention and account/message deletion policy: **TBD — required before public launch**.

---

## 📓 Architecture Decisions

- [ADR-0001: Database Selection — SQL vs NoSQL](./docs/adr/0001-database-selection.md)
- [ADR-0002: Authentication Strategy — Phone OTP, Sessions, Twilio](./docs/adr/0002-authentication-strategy.md)
- [ADR-0003: Real-Time Matching Architecture — WebSocket hosting, Redis concurrency](./docs/adr/0003-realtime-matching-architecture.md)

---

## 🐳 Docker

```bash
docker compose up -d --build
```

Postgres 17 + Valkey (Redis-compatible), both with healthchecks.

---

## 🗺️ Roadmap

### V1 — Backend
- [x] Monorepo, Docker, Postgres 17, Valkey infra
- [x] Config layer, JWT utils, DTO/validation layer, error handling
- [x] All 7 tables schemad (`auth`, `chat`, `moderation`)
- [x] **Phase 1 — Auth: complete.** OTP request/verify, session rotation, logout, `isAuthenticated` middleware — tested including failure paths
- [x] **Phase 2 — Users: complete.** Profile get/update with partial-update support, sanitized responses
- [x] **Phase 3 — Matching: complete.** Redis client, shared WebSocket transport (`common/ws`), mood-based queue, atomic candidate matching, block exclusion, ban enforcement, disconnect cleanup — all 5 acceptance tests verified against live data
- [ ] **Phase 4 — Chat + Moderation.** Message persistence, AI moderation, icebreaker, reports/blocks, message-level ban enforcement
- [ ] Data retention / deletion policy

### V2 — Mobile
- [x] Expo project scaffolded
- [ ] OTP login flow (Phase 5)
- [ ] Mood + interest selector
- [ ] Chat UI + saved history
- [ ] Push notifications

### V3 — Launch
- [ ] Better matching algorithm (interest-weighted scoring, currently exact-mood FIFO)
- [ ] Admin review queue for reports
- [ ] Redis Pub/Sub for multi-instance WebSocket scaling
- [ ] App Store + Play Store
- [ ] Upgrade Twilio to paid (lift trial verified-number restriction)

---

## 🤝 Contributing

This project is currently in active early development and not yet accepting external contributions. That said, if you're reading the code and something looks off — architecture, a bug, a naming inconsistency — issues are welcome. Once Phase 4 lands and the API stabilizes, a proper `CONTRIBUTING.md` with setup/testing/PR conventions will follow.

---

## 📄 License

MIT © 2026 Unsaid

---

*Built from a feeling that stayed too long.*
*For everyone whose words never made it out.*