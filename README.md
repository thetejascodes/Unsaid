# 🌙 Unsaid

> *The wound that ages, aches deeper.*
> *The fruit that ripens, tastes sweeter.*
> *The pickle that marinates, hits different.*
>
> *Some things need time to become what they were always meant to be.*
> *This app is for everything you let marinate too long — alone.*

---

## What is Unsaid?

You know that feeling at 2am when something is sitting heavy on your chest?

Not sad enough to cry. Not okay enough to sleep.
You open WhatsApp. Scroll through contacts. Close it.

Because who do you call? Your friends have their own lives. Your family won't understand. A therapist costs money you don't have right now.

So you just... sit with it.

**Unsaid is for that moment.**

An anonymous space where you connect with a stranger who might be sitting with something heavy too. No names. No profiles. No judgment. Just two people — giving each other permission to finally say the thing they couldn't say anywhere else.

---

## ✨ Features

- 🎭 **Fully Anonymous** — no signup, no account, session only
- 🌊 **Mood Matching** — connect with someone who feels what you feel
- 🎯 **Interest Tags** — so you're not just matched on pain, but on who you are
- ⚡ **Real-time Chat** — WebSocket-powered, instant
- 🖼️ **Image Sharing** — sometimes a picture says what words can't
- 🕯️ **AI Icebreaker** — when silence gets too loud, a gentle nudge
- 🛡️ **AI Moderation** — this is a safe space, kept safe
- 🚫 **No Blocking** — you can leave, but you can't shut someone out

---

## 🏗️ Architecture

```
User selects mood + interests
        │
        ▼
   WebSocket (JOIN_QUEUE)
        │
        ▼
   Redis Queue (mood + interest based)
        │
        ▼
   Matching Service (score-based algorithm)
        │
        ▼
   Room Created → both users notified (MATCHED)
        │
        ├──► Messages flow via WebSocket
        │
        ├──► AI moderation on every message (Claude API)
        │
        ├──► 30s silence → AI icebreaker generated
        │
        └──► Kafka logs match + message events
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Mobile App | React Native (Expo) |
| Backend | Node.js + Express + TypeScript |
| Real-time | WebSockets (ws) |
| Matching & State | Redis |
| Event Logging | Apache Kafka |
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
│   │       │   ├── matching/    # Queue + matching algorithm
│   │       │   ├── chat/        # WebSocket gateway + messaging
│   │       │   ├── ai/          # Icebreaker + moderation
│   │       │   └── upload/      # Image uploads
│   │       ├── shared/          # Redis, Kafka, config
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
# starts Redis + Kafka
```

### 3. Configure env

```bash
cp apps/server/.env.example apps/server/.env
# fill in your ANTHROPIC_API_KEY
```

### 4. Run

```bash
npm run dev
# Server: http://localhost:4000
```

### 5. Test WebSocket

```bash
npx wscat -c ws://localhost:4000/ws

# Join queue
{"type":"JOIN_QUEUE","mood":"lonely","interests":["music","gaming"]}

# Send message (after match)
{"type":"SEND_MESSAGE","content":"hey","messageType":"text"}
```

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

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `QUEUED` | `position` | Added to queue |
| `MATCHED` | `roomId, partnerMood` | Match found |
| `MESSAGE` | `message` | New message |
| `ICEBREAKER` | `suggestion` | AI conversation starter |
| `PARTNER_TYPING` | — | Partner is typing |
| `PARTNER_STOP_TYPING` | — | Partner stopped |
| `PARTNER_LEFT` | — | Partner disconnected |
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

## 🗺️ Roadmap

### V1 — Backend (in progress)
- [x] Monorepo setup
- [x] Shared TypeScript types
- [x] Redis matching queue + scoring
- [x] WebSocket server + event handling
- [x] AI icebreaker + moderation
- [x] Kafka event logging
- [ ] Module-based restructure
- [ ] Image upload (Cloudinary)
- [ ] Full WebSocket testing

### V2 — Mobile
- [ ] React Native (Expo) app
- [ ] Mood + interest selector
- [ ] Chat UI
- [ ] Push notifications

### V3 — Launch
- [ ] Better matching algorithm
- [ ] Report system
- [ ] App Store + Play Store

---

## 📄 License

MIT © 2026 Unsaid

---

*Built from a feeling that stayed too long.*
*For everyone whose words never made it out.*# Unsaid
