# Unsaid

> *The wound that ages, aches deeper.*
> *The fruit that ripens, tastes sweeter.*
> *The pickle that marinates, hits different.*
>
> *Some things need time to become what they were always meant to be.*

Unsaid is a work-in-progress mobile and backend application for connecting people through shared moods. A phone-verified account provides accountability behind the scenes, while a chosen username keeps the first conversation comfortably pseudonymous.

## Project Status

The backend foundation is in place:

- Phone OTP authentication with Twilio or local stub mode
- JWT access and refresh tokens with server-side refresh-session rotation
- Authenticated profile read and partial update endpoints
- Authenticated WebSocket connections
- Exact-mood FIFO matching through Valkey queues
- PostgreSQL persistence through Drizzle ORM
- Block-based matching exclusion and ban denylist checks
- Zod DTO validation and centralized API error handling

The Expo mobile app is currently a minimal scaffold. Chat messaging, moderation workflows, image uploads, AI behavior, and the mobile product flows are planned but not implemented yet.

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
| AI client | OpenAI-compatible client, integration planned |

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
```

Keep `OTP_STUB_MODE=true` during local development. The OTP is logged instead of sent by SMS. To send real OTPs, set it to `false` and provide the Twilio variables in `apps/server/.env`. Never commit `.env` or real API keys.

`NVIDIA_API_KEY`, `MODERATION_MODEL`, and `baseURL` are present for the planned AI integration and are not currently used by the server configuration layer.

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
| `POST` | `/api/auth/otp/verify` | None | Verify an OTP and create a session |
| `POST` | `/api/auth/refresh` | Refresh token | Rotate the refresh token and issue a new access token |
| `POST` | `/api/auth/logout` | Access token | Revoke a refresh-token session |

### Users

| Method | Endpoint | Credential | Body |
| --- | --- | --- | --- |
| `GET` | `/api/users/me` | Access token | None |
| `PATCH` | `/api/users/me` | Access token | `username?`, `avatarUrl?`, `bio?` |

Profile responses omit the stored `phoneHash` and `banReason` fields.

## WebSocket Matching

The WebSocket server authenticates during the upgrade handshake. Missing or invalid access tokens are rejected before the connection opens:

```text
ws://localhost:8000/ws?accessToken=<ACCESS_TOKEN>
```

### Client events

```json
{"type":"JOIN_QUEUE","mood":"lonely","interests":["music"]}
{"type":"LEAVE_QUEUE"}
```

`JOIN_QUEUE` places the user in the Valkey queue for the selected mood. When a candidate is available, both users receive a `MATCHED` event and a room is persisted in PostgreSQL.

### Server events

| Event | Payload | Status |
| --- | --- | --- |
| `QUEUED` | `position` | Implemented |
| `MATCHED` | `roomId`, `partnerId`, `partnerMood` | Implemented |
| `SESSION_REVOKED` | None | Implemented for ban checks during matching |
| `ERROR` | `message` | Implemented |

The current algorithm is exact-mood FIFO. Chat events such as `SEND_MESSAGE`, typing indicators, reports, and room departure are planned and currently have no handlers.

## Data Model

The current schemas cover seven tables:

- `users`, `otpCodes`, and `sessions` for authentication
- `rooms` and `messages` for chat persistence groundwork
- `reports` and `blocks` for moderation groundwork

PostgreSQL is the system of record. Valkey stores transient matching queues and ban denylist state. Database migrations live in `apps/server/drizzle/` and are managed with Drizzle Kit.

## Security Notes

- Phone numbers, OTP codes, and refresh tokens are hashed before database storage.
- OTP consumption and refresh-token rotation use row-locked transactions.
- Access tokens are short-lived; refresh tokens are rotated and revocable.
- Matching checks the ban denylist and excludes users blocked in either direction.
- Twilio should use restricted credentials scoped to the required SMS operation.
- Message-level ban enforcement, moderation review, retention, and account deletion still need to be designed before public launch.

## Development Commands

Run these from `apps/server`:

```bash
npm run dev             # Compile in watch mode and start the server
npm run db:generate     # Generate a migration from schema changes
npm run db:migrate      # Apply pending migrations
npm run db:studio       # Open Drizzle Studio
```

There is currently no automated test command configured in `apps/server/package.json`; backend verification is manual for the implemented auth, profile, and matching flows.

## Architecture Decisions

- [Database selection](docs/adr/0001-database-selection.md)
- [Authentication strategy](docs/adr/0002-authentication-strategy.md)
- [Realtime matching architecture](docs/adr/0003-realtime-matching-architecture.md)
- [Backend build plan](docs/backend-build-plan.md)

## Roadmap

- Implement chat message WebSocket handlers and history endpoints
- Add moderation actions, reports, bans, and message-level enforcement
- Integrate AI moderation and icebreakers using the configured OpenAI-compatible client
- Add image uploads and saved chat history
- Build the mobile OTP, mood, matching, and chat flows
- Define retention and account-deletion policies
- Improve matching beyond exact-mood FIFO and support multi-instance WebSocket deployment

## License

MIT © 2026 Unsaid

*Built from a feeling that stayed too long.*
