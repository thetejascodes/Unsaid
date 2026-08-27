# Unsaid

> *The wound that ages, aches deeper.*
> *The fruit that ripens, tastes sweeter.*
> *The pickle that marinates, hits different.*
>
> *Some things need time to become what they were always meant to be.*

Unsaid is a work-in-progress mobile and backend application for connecting people through shared moods. A phone-verified account provides accountability behind the scenes, while a chosen username keeps the first conversation comfortably pseudonymous.

## Project Status

The backend foundation is in place, and chat is partway built:

- Phone OTP authentication with Twilio or local stub mode
- JWT access and refresh tokens with server-side refresh-session rotation
- Authenticated profile read and partial update endpoints
- Authenticated WebSocket connections
- Exact-mood FIFO matching through Valkey queues
- Block-based matching exclusion and ban denylist checks (verified during matching)
- PostgreSQL persistence through Drizzle ORM
- Zod DTO validation and centralized API error handling
- Chat message persistence and room-history/end-room logic (`chat.service.ts`)
- AI moderation call against an OpenAI-compatible endpoint, with a fail-open policy on provider failure (`modules/ai/moderation.ts`)

Not yet wired up: the chat WebSocket gateway (`SEND_MESSAGE`, typing, leave-room events), icebreaker generation, and the moderation module's report/block/ban gateway. All are pseudocoded in the backend build plan and are the immediate next work.

The Expo mobile app is currently a minimal scaffold. Image uploads and the mobile product flows are planned but not implemented yet.

## Repository Structure

```text
.
├── apps/
│   ├── mobile/                    # Expo / React Native client scaffold
│   │   ├── App.tsx
│   │   ├── app.json
│   │   └── package.json
│   └── server/                    # Express, WebSocket, database, and matching backend
│       ├── src/
│       │   ├── common/             # Config, DB, Redis, WebSocket, middleware, utilities
│       │   └── modules/             # Auth, users, matching, chat, moderation, AI, uploads
│       ├── drizzle/                # Generated SQL migrations
│       ├── docker-compose.yml       # Local PostgreSQL and Valkey services
│       └── .env.example
├── docs/                           # Architecture decisions and backend build plan
└── README.md
```

## Tech Stack

| Area | Technology |
| --- | --- |
| Mobile | React Native, Expo SDK 57 |
| API | Node.js, Express 5, TypeScript |
| Realtime | WebSocket via `ws` |
| Database | PostgreSQL 17 |
| ORM and migrations | Drizzle ORM and Drizzle Kit |
| Ephemeral state | Valkey 8, Redis-compatible |
| Validation | Zod |
| Phone OTP | Twilio with local stub mode |
| AI client | OpenAI-compatible client (NVIDIA NIM by default), wired for moderation; icebreaker generation not yet implemented |

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

## HTTP API

All request bodies are validated with Zod DTOs. Protected endpoints use an access token in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Credential | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/otp/request` | None | Request a phone OTP |
| `POST` | `/api/auth/otp/verify` | None | Verify an OTP and create a session; rejects with 403 if the account is banned |
| `POST` | `/api/auth/refresh` | Refresh token | Rotate the refresh token and issue a new access token |
| `POST` | `/api/auth/logout` | Access token | Revoke a refresh-token session |

### Users

| Method | Endpoint | Credential | Body |
| --- | --- | --- | --- |
| `GET` | `/api/users/me` | Access token | None |
| `PATCH` | `/api/users/me` | Access token | `username?`, `avatarUrl?`, `bio?` |

Profile responses omit the stored `phoneHash` and `banReason` fields.

## WebSocket

The WebSocket server authenticates during the upgrade handshake. Missing or invalid access tokens are rejected before the connection opens:

```text
ws://localhost:8000/ws?accessToken=<ACCESS_TOKEN>
```

### Client events

| Event | Payload | Status |
| --- | --- | --- |
| `JOIN_QUEUE` | `mood`, `interests[]` | Implemented |
| `LEAVE_QUEUE` | None | Implemented |
| `SEND_MESSAGE` | `roomId`, `content`, `messageType`, `imageUrl?` | Not yet wired (service layer ready, gateway pending) |
| `TYPING` / `STOP_TYPING` | `roomId` | Planned |
| `LEAVE_ROOM` | `roomId` | Planned |
| `REPORT` | `roomId`, `messageId?`, `reason` | Planned |
| `BLOCK` | `roomId` | Planned |

`JOIN_QUEUE` places the user in the Valkey queue for the selected mood. When a candidate is available, both users receive a `MATCHED` event and a room is persisted in PostgreSQL. A candidate found to be blocked (in either direction) or banned is excluded; the current exclusion strategy does not requeue a discarded candidate, documented as a known v1 trade-off in [ADR-0003](docs/adr/0003-realtime-matching-architecture.md).

### Server events

| Event | Payload | Status |
| --- | --- | --- |
| `QUEUED` | `position` | Implemented |
| `MATCHED` | `roomId`, `partnerId`, `partnerMood` | Implemented |
| `SESSION_REVOKED` | `reason?` | Implemented for ban checks during matching; message-level (mid-conversation) revocation planned |
| `ERROR` | `message` | Implemented |
| `MESSAGE` | `message` | Planned |
| `SUPPORT_RESOURCE` | `message` | Planned — surfaced when moderation flags a message as a self-harm concern |
| `ICEBREAKER` | `suggestion` | Planned |
| `PARTNER_TYPING` / `PARTNER_STOP_TYPING` | None | Planned |
| `PARTNER_LEFT` | None | Planned |
| `REPORT_RECEIVED` | None | Planned |

The current matching algorithm is exact-mood FIFO.

## Data Model

The current schemas cover seven tables:

- `users`, `otpCodes`, and `sessions` for authentication
- `rooms` and `messages` for chat, with `messages.flaggedAt` set when moderation flags content
- `reports` and `blocks` for moderation

PostgreSQL is the system of record. Valkey stores transient matching queues (`queue:{mood}`) and ban denylist state (`ban:{userId}`), both built through centralized key-builder functions rather than hand-written key strings. Database migrations live in `apps/server/drizzle/` and are managed with Drizzle Kit.

## AI Moderation

Every persisted chat message will be checked once `chat.gateway.ts` is wired up (service-layer support already exists). The check calls an OpenAI-compatible chat completion endpoint, asking for a structured `{ flagged, category }` verdict, at low temperature for consistency. If the AI call fails for any reason — network error, provider outage, malformed response — the system fails open: the message is still sent and persisted, the failure is logged, and moderation coverage for that message is simply absent rather than blocking the user's ability to communicate. See [ADR-0004](docs/adr/0004-ai-provider-strategy.md) for the full reasoning and accepted trade-offs.

## Security Notes

- Phone numbers, OTP codes, and refresh tokens are hashed before database storage.
- OTP consumption and refresh-token rotation use row-locked transactions; the matching queue's equivalent race condition is prevented through Redis/Valkey's atomic `LPOP`, not application-level locking.
- Access tokens are short-lived; refresh tokens are rotated and revocable.
- A banned account cannot re-authenticate (`verifyOtp` rejects with 403) and cannot be matched (`joinQueue` checks the ban denylist) — both verified against live test data. Message-level enforcement (closing an active socket mid-conversation) is planned alongside the moderation gateway.
- Matching checks the ban denylist and excludes users blocked in either direction — verified against live test data.
- Twilio uses a Restricted API Key scoped to the required SMS operation, not the full account credential.
- AI moderation calls are isolated behind a swappable client configuration (provider, base URL, and model are all environment-driven) and fail open on error by design, not by omission.
- Retention and account-deletion policy still needs to be designed before public launch.

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

## Roadmap

- Wire the chat WebSocket gateway (`SEND_MESSAGE`, typing, leave-room) to the already-built service layer
- Implement icebreaker generation and the 30-second silence timer
- Add the moderation gateway (report, block) and message-level ban enforcement (active-socket revocation)
- Add image uploads and saved chat history retrieval
- Build the mobile OTP, mood, matching, and chat flows
- Define retention and account-deletion policies
- Improve matching beyond exact-mood FIFO and support multi-instance WebSocket deployment (Redis Pub/Sub)

## License

MIT © 2026 Unsaid

*Built from a feeling that stayed too long.*