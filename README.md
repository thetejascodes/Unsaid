# 🌙 Unsaid

> *The wound that ages, aches deeper.*
> *The fruit that ripens, tastes sweeter.*
> *The pickle that marinates, hits different.*
>
> *Some things need time to become what they were always meant to be.*
> *This app is for everything you let marinate too long.*

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
- 🚫 **Blocking** — never matched with someone you've blocked, ever again
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
   Redis Queue (mood + interest based, excludes blocked/banned)
        │
        ▼
   Matching Service (score-based algorithm)
        │
        ▼
   Room Created → both users notified (MATCHED)
        │
        ├──► Messages flow via WebSocket → persisted (Postgres, encrypted at rest)
        │
        ├──► AI moderation on every message (Claude API)
        │        │
        │        └──► flagged content → review queue / crisis resource surfaced
        │
        ├──► 30s silence → AI icebreaker generated
        │
        ├──► Report / Block → immediate re-match exclusion + review queue
        │
        └──► Ban issued → denylist check on every WS message, active sockets dropped
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Mobile App | React Native (Expo, SDK 57) |
| Backend | Node.js + Express + TypeScript |
| Real-time | WebSockets (ws) — pending (Phase 3) |
| Auth | Phone OTP (Twilio, Restricted API Key) + JWT (access + refresh) |
| Validation | Zod, via a shared `BaseDto` (static-class pattern) + `validate` middleware |
| Matching & State | Redis 7 — pending (Phase 3) |
| Persistence | PostgreSQL 17 |
| ORM | Drizzle ORM + Drizzle Kit |
| Event Logging | Structured logs → (Kafka only if/when scale needs it) |
| AI | Claude API — icebreaker + moderation (Phase 4) |
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
│   │   │   │   ├── matching/      # ⏳ Phase 3 — queue + matching algorithm
│   │   │   │   ├── chat/          # ⏳ Phase 4 — WebSocket gateway + messaging + history
│   │   │   │   ├── moderation/    # ⏳ Phase 4 — reports, blocks, bans
│   │   │   │   ├── ai/            # ⏳ Phase 4 — icebreaker + moderation calls
│   │   │   │   └── upload/        # ⏳ Phase 4 — image uploads
│   │   │   ├── common/
│   │   │   │   ├── db/            # Drizzle client + merged schema (redis.ts pending — Phase 3)
│   │   │   │   ├── config/        # Env loading + validation (fail-fast)
│   │   │   │   ├── dto/           # BaseDto — static-class Zod wrapper
│   │   │   │   ├── utils/         # jwt.utils, api-error, api-response
│   │   │   │   └── middlewares/   # error-handler, validate, auth (isAuthenticated)
│   │   │   ├── types/
│   │   │   │   └── express.d.ts   # Request.userId augmentation
│   │   │   └── app.ts             # mounted routes, health check, error handler
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
│       └── 0002-authentication-strategy.md
│
└── docker-compose.yml             # Postgres + Redis + server, for local dev
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
# starts Postgres 17 + Redis 7
```

### 3. Configure env

```bash
cp apps/server/.env.example apps/server/.env
# fill in DATABASE_URL, REDIS_URL, JWT secrets, ANTHROPIC_API_KEY,
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

### 6. Run the mobile app

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
| `/api/auth/otp/verify` | POST | No | `phone, code` | Verifies OTP, creates user if new, returns access + refresh JWT |
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

## 🌐 WebSocket Events — ⏳ Phase 3/4, not yet built

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `JOIN_QUEUE` | `mood, interests[]` | Join matching queue |
| `LEAVE_QUEUE` | — | Leave before match |
| `SEND_MESSAGE` | `content, messageType, imageUrl?` | Send a message |
| `TYPING` | — | Typing indicator |
| `STOP_TYPING` | — | Stop typing |
| `LEAVE_ROOM` | — | Leave current chat |
| `REPORT` | `messageId?, reason` | Report current partner/message |
| `BLOCK` | — | Block current partner, end chat |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `QUEUED` | `position` | Added to queue |
| `MATCHED` | `roomId, partnerUsername, partnerMood` | Match found |
| `MESSAGE` | `message` | New message |
| `ICEBREAKER` | `suggestion` | AI conversation starter |
| `PARTNER_TYPING` | — | Partner is typing |
| `PARTNER_STOP_TYPING` | — | Partner stopped |
| `PARTNER_LEFT` | — | Partner disconnected |
| `REPORT_RECEIVED` | — | Confirms report was logged |
| `SESSION_REVOKED` | `reason` | Account banned/suspended, socket closing |
| `ERROR` | `message` | Something went wrong |

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

## 🗄️ Database

- **PostgreSQL 17**, single primary datastore for all relational and message data. See [ADR-0001](./docs/adr/0001-database-selection.md).
- **Drizzle ORM**, schema defined module-wise — each module owns the tables it's responsible for, re-exported through `common/db/schema.ts` for Drizzle Kit to discover.
- **Redis 7** — ephemeral state only: matching queue, active ban denylist (Phase 3, not yet wired up). Not a system of record.
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

## 🛡️ Safety & Data

- Messages will be **persisted** and **encrypted at rest** (Phase 4).
- Phone numbers are stored hashed, never in plaintext beyond the OTP send step.
- OTP codes and refresh tokens are hashed before storage — never kept in plaintext.
- OTP consumption and session rotation both use row-locked transactions to prevent replay/race conditions.
- Bans will be enforced at the WebSocket layer via a Redis denylist checked on every message (Phase 4).
- Twilio uses a Restricted API Key scoped to SMS-sending only, not the full account Auth Token. See [ADR-0002](./docs/adr/0002-authentication-strategy.md).
- `OTP_STUB_MODE` toggles between logging the code (dev) and sending real SMS via Twilio — defaults to stub, flip to `false` deliberately per environment.
- Data retention and account/message deletion policy: **TBD — required before public launch**.

---

## 📓 Architecture Decisions

- [ADR-0001: Database Selection — SQL vs NoSQL](./docs/adr/0001-database-selection.md)
- [ADR-0002: Authentication Strategy — Phone OTP, Sessions, Twilio](./docs/adr/0002-authentication-strategy.md)
- [ADR-0003: Real-Time Matching Architecture](./docs/adr/0003-realtime-matching-architecture.md)

---

## 🐳 Docker

```bash
docker compose up -d --build
```

---

## 🗺️ Roadmap

### V1 — Backend
- [x] Monorepo, Docker, Postgres 17, Redis 7 infra
- [x] Config layer, JWT utils, DTO/validation layer, error handling
- [x] All 7 tables schemad (`auth`, `chat`, `moderation`)
- [x] **Phase 1 — Auth: complete.** OTP request/verify, session rotation, logout, `isAuthenticated` middleware — all tested via Postman including failure paths
- [x] **Phase 2 — Users: complete.** Profile get/update with partial-update support, sanitized responses
- [ ] **Phase 3 — Matching.** Redis client, WebSocket gateway, mood/interest queue
- [ ] **Phase 4 — Chat + Moderation.** Message persistence, AI moderation, icebreaker, reports/blocks, ban enforcement
- [ ] Data retention / deletion policy

### V2 — Mobile
- [x] Expo project scaffolded
- [ ] OTP login flow (Phase 5)
- [ ] Mood + interest selector
- [ ] Chat UI + saved history
- [ ] Push notifications

### V3 — Launch
- [ ] Better matching algorithm
- [ ] Admin review queue for reports
- [ ] App Store + Play Store
- [ ] Upgrade Twilio to paid (lift trial verified-number restriction)

---

## 📄 License

MIT © 2026 Unsaid

---

*Built from a feeling that stayed too long.*
*For everyone whose words never made it out.*