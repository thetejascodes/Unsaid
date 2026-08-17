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
        ├──► Messages flow via WebSocket → persisted (encrypted at rest)
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
| Mobile App | React Native (Expo) |
| Backend | Node.js + Express + TypeScript |
| Real-time | WebSockets (ws) |
| Auth | Phone OTP (Twilio/MSG91) + JWT (access + refresh) |
| Matching & State | Redis |
| Persistence | PostgreSQL (users, messages, reports, bans) |
| Event Logging | Structured logs → (Kafka only if/when scale needs it) |
| AI | Claude API — icebreaker + moderation |
| Images | Cloudinary |
| Monorepo | npm workspaces |

---

## 📁 Project Structure

```
unsaid/
├── apps/
│   ├── server/                  # Node.js backend
│   │   └── src/
│   │       ├── modules/         # Feature modules
│   │       │   ├── auth/        # OTP, JWT issuance/refresh, session revocation
│   │       │   ├── users/       # Profiles, username, avatar, bio
│   │       │   ├── matching/    # Queue + matching algorithm
│   │       │   ├── chat/        # WebSocket gateway + messaging + history
│   │       │   ├── moderation/  # AI moderation, reports, blocks, bans
│   │       │   ├── ai/          # Icebreaker
│   │       │   └── upload/      # Image uploads
│   │       ├── shared/          # Redis, Postgres, config
│   │       └── index.ts
│   │
│   └── mobile/                  # React Native (Expo) — coming soon
│
└── packages/
    └── shared/                  # Shared TypeScript types
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
docker-compose up -d
# starts Redis + Postgres
```

### 3. Configure env

```bash
cp apps/server/.env.example apps/server/.env
# fill in ANTHROPIC_API_KEY, TWILIO_* (or MSG91_*), JWT_SECRET, DATABASE_URL
```

### 4. Run

```bash
npm run dev
# Server: http://localhost:4000
```

### 5. Test auth + WebSocket

```bash
# Request OTP
curl -X POST localhost:4000/auth/otp/request -d '{"phone":"+91XXXXXXXXXX"}'

# Verify OTP → returns access + refresh token
curl -X POST localhost:4000/auth/otp/verify -d '{"phone":"+91XXXXXXXXXX","code":"123456"}'

# Connect authenticated WebSocket
npx wscat -c "ws://localhost:4000/ws?token=<access_token>"

# Join queue
{"type":"JOIN_QUEUE","mood":"lonely","interests":["music","gaming"]}

# Send message (after match)
{"type":"SEND_MESSAGE","content":"hey","messageType":"text"}
```

---

## 🔐 Auth Endpoints

| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/auth/otp/request` | POST | `phone` | Sends OTP, rate-limited per phone + IP |
| `/auth/otp/verify` | POST | `phone, code` | Verifies OTP, returns access + refresh JWT |
| `/auth/refresh` | POST | `refreshToken` | Rotates and returns new access token |
| `/auth/logout` | POST | `refreshToken` | Revokes refresh token |
| `/users/me` | GET/PATCH | — | View/update profile (username, avatar, bio) |

Access tokens are short-lived (~15 min). Refresh tokens are rotated and stored server-side so they can be revoked immediately on ban. WebSocket connections must present a valid access token at handshake — unauthenticated sockets are rejected.

---

## 🌐 WebSocket Events

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

## 🛡️ Safety & Data

- Messages are **persisted** (this is new — history is a core feature now) and **encrypted at rest**.
- Phone numbers are stored hashed/encrypted, never in plaintext beyond the OTP send step.
- Every message is AI-moderated; content indicating self-harm or crisis surfaces a resource prompt to the sender, not just a content block.
- Reports and blocks are tied to verified accounts and persist across reinstalls.
- Bans are enforced at the WebSocket layer via a Redis denylist checked on every message, so an active session is cut immediately, not just future logins.
- Data retention and account/message deletion policy: **TBD — required before public launch**, not a v2 item.

---

## 🗺️ Roadmap

### V1 — Backend + Auth (in progress)
- [x] Monorepo setup
- [x] Shared TypeScript types
- [x] Redis matching queue + scoring
- [x] WebSocket server + event handling
- [x] AI icebreaker + moderation
- [ ] Phone OTP auth (request/verify, JWT issuance)
- [ ] Profiles (username, avatar, bio)
- [ ] Message persistence (Postgres, encrypted)
- [ ] Reporting + blocking
- [ ] Ban enforcement (denylist at WS layer)
- [ ] Data retention / deletion policy

### V2 — Mobile
- [ ] React Native (Expo) app
- [ ] OTP login flow
- [ ] Mood + interest selector
- [ ] Chat UI + saved history
- [ ] Push notifications

### V3 — Launch
- [ ] Better matching algorithm
- [ ] Admin review queue for reports
- [ ] App Store + Play Store

---

## 📄 License

MIT © 2026 Unsaid

---

*Built from a feeling that stayed too long.*
*For everyone whose words never made it out.*