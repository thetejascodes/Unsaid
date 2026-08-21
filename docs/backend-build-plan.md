# Unsaid Backend — Master Build Plan

This is the full plan, in pseudocode, for the entire backend — what to build, where it lives, and why. Follow it top to bottom. Each phase depends on the one before it being real (not mocked).

**Rule while building:** write the real code yourself from this pseudocode. Don't skip ahead to a later phase before finishing the current one — later phases assume earlier ones actually work.

---

## Current Status

| File | Status |
|---|---|
| `common/config/index.ts` | ✅ Done |
| `common/utils/jwt.utils.ts` | ✅ Done |
| `common/dto/BaseDto.ts` | ✅ Done |
| `common/middlewares/validate.middleware.ts` | ✅ Done (rename from `vaidate.middleware.ts` — typo) |
| `common/utils/api-error.ts` | ✅ Assumed done (referenced throughout) |
| `common/utils/api-response.ts` | ✅ Done |
| `common/middlewares/error-handler.ts` | ✅ Done |
| All Drizzle schemas (`auth`, `chat`, `moderation`) | ✅ Done |
| `common/db/index.ts` (Drizzle client) | ✅ Done |
| Docker, Postgres, Redis, Expo scaffold | ✅ Done |
| `modules/auth/otp.ts` | ⏳ In progress (stub version) |
| Everything else below | ❌ Not started |

---

## PHASE 1 — Auth

**Why first:** nothing else can be tested meaningfully without real users and real tokens. Matching needs real user IDs. Chat needs a real sender. Moderation needs a real account to ban.

### 1.1 — Twilio config

**Where:** `common/config/index.ts` (add to existing file)

```
ADD to config object:
    twilio: {
        accountSid: optional("TWILIO_ACCOUNT_SID", ""),
        authToken: optional("TWILIO_AUTH_TOKEN", ""),
        fromNumber: optional("TWILIO_FROM_NUMBER", ""),
    }
```

**Why optional, not required:** sending is stubbed for now (console.log instead of real SMS), so the server shouldn't refuse to boot just because Twilio isn't configured yet. Switch to `required()` once you're ready to rely on real SMS in every environment.

### 1.2 — OTP sending

**Where:** `modules/auth/otp.ts`
**Why this file, not `common/`:** this is auth-specific integration logic, not a generic reusable utility. Nothing else in the app will ever call "send an OTP via SMS."

```
IMPORT Twilio SDK
IMPORT config from common/config

CREATE twilio client using config.twilio.accountSid, config.twilio.authToken

FUNCTION sendOtpSms(phone, code):
    // STUBBED — swap for real client.messages.create(...) once Twilio account is verified
    LOG "[DEV] OTP for " + phone + ": " + code
    RETURN
```

### 1.3 — DTOs (request validation)

**Where:** `modules/auth/dto.ts`
**Why:** validate request bodies before they ever reach business logic — reject garbage input early, with clear error messages.

```
IMPORT BaseDto from common/dto/BaseDto
IMPORT z from zod

EXPORT requestOtpDto = new BaseDto(z.object({
    phone: z.string().min(10).max(15)
}))

EXPORT verifyOtpDto = new BaseDto(z.object({
    phone: z.string().min(10).max(15),
    code: z.string().length(6)
}))
```

### 1.4 — Auth service (the real logic)

**Where:** `modules/auth/service.ts`
**Why this is the core of the whole module:** all business rules live here — routes/controllers are thin wrappers around this.

```
IMPORT db from common/db
IMPORT { users, otpCodes, sessions } from own schema
IMPORT { generateAccessToken, generateRefreshToken } from common/utils/jwt.utils
IMPORT { sendOtpSms } from ./otp
IMPORT ApiError from common/utils/api-error
IMPORT crypto (for hashing)

FUNCTION hash(value):
    RETURN crypto.createHash('sha256').update(value).digest('hex')

FUNCTION requestOtp(phone):
    phoneHash = hash(phone)

    recentCount = COUNT rows FROM otpCodes
                  WHERE phoneHash = phoneHash
                  AND createdAt > (now - 1 hour)

    IF recentCount >= MAX_PER_HOUR (e.g. 3):
        THROW ApiError.tooManyRequests("Too many attempts, try again later")

    code = random 6-digit number as string
    codeHash = hash(code)

    INSERT INTO otpCodes {
        phoneHash, codeHash,
        expiresAt: now + 5 minutes,
        consumed: false
    }

    CALL sendOtpSms(phone, code)

    RETURN { success: true }
    // never return the code itself, never reveal if phone is already registered


FUNCTION verifyOtp(phone, submittedCode):
    phoneHash = hash(phone)
    submittedHash = hash(submittedCode)

    row = SELECT * FROM otpCodes
          WHERE phoneHash = phoneHash
          AND codeHash = submittedHash
          AND consumed = false
          AND expiresAt > now
          ORDER BY createdAt DESC LIMIT 1

    IF row is null:
        THROW ApiError.badRequest("Invalid or expired code")

    UPDATE otpCodes SET consumed = true WHERE id = row.id

    user = SELECT * FROM users WHERE phoneHash = phoneHash

    IF user is null:
        generatedUsername = generate random username (e.g. "user_" + random string)
        user = INSERT INTO users { phoneHash, username: generatedUsername }

    IF user.bannedAt is not null:
        THROW ApiError.forbidden("This account has been banned")

    accessToken = generateAccessToken({ userId: user.id })
    refreshToken = generateRefreshToken({ userId: user.id })
    refreshTokenHash = hash(refreshToken)

    INSERT INTO sessions {
        userId: user.id,
        refreshTokenHash,
        expiresAt: now + 30 days
    }

    RETURN { accessToken, refreshToken, user }


FUNCTION refreshAccessToken(refreshToken):
    payload = verifyRefreshToken(refreshToken)   // throws if invalid/expired
    refreshTokenHash = hash(refreshToken)

    session = SELECT * FROM sessions
              WHERE refreshTokenHash = refreshTokenHash
              AND userId = payload.userId

    IF session is null OR session.revokedAt is not null OR session.expiresAt < now:
        THROW ApiError.unauthorized("Session invalid or expired")

    // rotate: kill old session, issue new tokens
    UPDATE sessions SET revokedAt = now WHERE id = session.id

    newAccessToken = generateAccessToken({ userId: payload.userId })
    newRefreshToken = generateRefreshToken({ userId: payload.userId })
    newRefreshTokenHash = hash(newRefreshToken)

    INSERT INTO sessions {
        userId: payload.userId,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: now + 30 days
    }

    RETURN { accessToken: newAccessToken, refreshToken: newRefreshToken }


FUNCTION logout(refreshToken):
    refreshTokenHash = hash(refreshToken)
    UPDATE sessions SET revokedAt = now WHERE refreshTokenHash = refreshTokenHash
```

### 1.5 — Controller

**Where:** `modules/auth/controller.ts`
**Why thin:** controllers only parse the request and call the service — no business logic here, so the logic stays testable/reusable independent of HTTP.

```
IMPORT authService from ./service
IMPORT ApiResponses from common/utils/api-response

FUNCTION requestOtpController(req, res, next):
    TRY:
        { phone } = req.body   // already validated by DTO middleware
        result = authService.requestOtp(phone)
        RETURN ApiResponses.ok(res, "OTP sent", result)
    CATCH err:
        next(err)

FUNCTION verifyOtpController(req, res, next):
    TRY:
        { phone, code } = req.body
        result = authService.verifyOtp(phone, code)
        RETURN ApiResponses.ok(res, "Verified", result)
    CATCH err:
        next(err)

FUNCTION refreshController(req, res, next):
    TRY:
        { refreshToken } = req.body
        result = authService.refreshAccessToken(refreshToken)
        RETURN ApiResponses.ok(res, "Token refreshed", result)
    CATCH err:
        next(err)

FUNCTION logoutController(req, res, next):
    TRY:
        { refreshToken } = req.body
        authService.logout(refreshToken)
        RETURN ApiResponses.noContent(res)
    CATCH err:
        next(err)
```

### 1.6 — Routes

**Where:** `modules/auth/routes.ts`

```
IMPORT express Router
IMPORT validate middleware from common/middlewares
IMPORT { requestOtpDto, verifyOtpDto } from ./dto
IMPORT controllers from ./controller

router = Router()

router.post('/otp/request', validate(requestOtpDto), requestOtpController)
router.post('/otp/verify', validate(verifyOtpDto), verifyOtpController)
router.post('/refresh', refreshController)
router.post('/logout', logoutController)

EXPORT router
```

### 1.7 — Auth middleware (used by every phase after this)

**Where:** `common/middlewares/auth.middleware.ts`
**Why in `common/`, not `auth/`:** every module needs this to protect its routes — it's genuinely shared, unlike `otp.ts`.

```
IMPORT verifyAccessToken from common/utils/jwt.utils
IMPORT ApiError from common/utils/api-error

FUNCTION authMiddleware(req, res, next):
    header = req.headers.authorization

    IF header missing OR doesn't start with "Bearer ":
        THROW ApiError.unauthorized("No token provided")

    token = header.replace("Bearer ", "")

    TRY:
        payload = verifyAccessToken(token)
        req.userId = payload.userId
        next()
    CATCH:
        THROW ApiError.unauthorized("Invalid or expired token")
```

### 1.8 — Wire into the app

**Where:** `src/index.ts` (or `app.ts`, your actual entry point)

```
app.use('/auth', authRoutes)
```

### Phase 1 done when:
You can `curl`/Postman: request OTP → see code in terminal (stub) → verify with that code → get access + refresh tokens → hit a test protected route with the access token → refresh → logout → confirm old token now fails.

---

## PHASE 2 — Users

**Why now:** simplest phase, builds directly on Phase 1's `authMiddleware` and `users` table. Good confidence builder before the harder real-time phases.

**Where:** `modules/users/{schema-reference, service.ts, controller.ts, routes.ts}`
(no new schema file — this module reads/writes the `users` table that `auth` already owns)

```
FUNCTION getMe(userId):
    user = SELECT * FROM users WHERE id = userId
    RETURN user  // exclude phoneHash from the response — never expose it

FUNCTION updateMe(userId, updates):
    // updates = { username?, avatarUrl?, bio? }
    IF updates.username provided:
        VALIDATE length/characters (DTO handles this)
    UPDATE users SET ...updates WHERE id = userId
    RETURN updated user
    // if username unique constraint fails, let errorHandler's 23505 branch catch it
```

Routes:
```
router.get('/me', authMiddleware, getMeController)
router.patch('/me', authMiddleware, validate(updateUserDto), updateMeController)
```

### Phase 2 done when:
Logged-in user can view and update their profile; duplicate username returns a clean 409, not a raw DB error.

---

## PHASE 3 — Matching

**Why now:** needs real users (Phase 1) to mean anything. This introduces WebSockets and Redis — new infrastructure, isolate it here before mixing in chat logic.

**Where:** `modules/matching/{service.ts, gateway.ts}` + Redis (via `common/db` — you'll need a Redis client, similar pattern to your Drizzle client)

```
// WebSocket connection handshake
ON new WS connection:
    token = extract from query string or headers
    TRY:
        payload = verifyAccessToken(token)
        socket.userId = payload.userId
    CATCH:
        CLOSE socket with error
        RETURN

ON message "JOIN_QUEUE" { mood, interests }:
    // check exclusions first
    IF socket.userId is banned (check users.bannedAt or Redis denylist):
        SEND "SESSION_REVOKED", CLOSE socket
        RETURN

    candidate = SEARCH Redis queue for a compatible waiting user
                (same mood, or overlapping interests — your scoring rule)
                EXCLUDING users blocked by/blocking socket.userId

    IF candidate found:
        REMOVE candidate from Redis queue
        room = INSERT INTO rooms { userAId: socket.userId, userBId: candidate.userId, mood }
        SEND "MATCHED" to both sockets with roomId, partner info
    ELSE:
        ADD socket.userId + mood + interests to Redis queue
        SEND "QUEUED" { position } to socket

ON message "LEAVE_QUEUE":
    REMOVE socket.userId from Redis queue
```

### Phase 3 done when:
Two separate WebSocket connections (test with `wscat`, two terminals, two different logged-in users) with the same mood get matched into a room.

---

## PHASE 4 — Chat + Moderation

**Why together:** moderation must run inline with every message, not bolted on after — this is the phase where the app's core safety requirement gets implemented for real.

**Where:** `modules/chat/{service.ts, gateway.ts}`, `modules/moderation/{service.ts, gateway.ts}`, `modules/ai/{moderation.ts, icebreaker.ts}`

```
ON message "SEND_MESSAGE" { content, messageType, imageUrl }:
    IF socket.userId in Redis ban denylist:
        SEND "SESSION_REVOKED", CLOSE socket
        RETURN

    moderationResult = CALL ai.checkModeration(content)
    // ai/moderation.ts calls Claude API, returns { flagged: bool, reason? }

    message = INSERT INTO messages {
        roomId: socket.roomId,
        senderId: socket.userId,
        content,
        messageType,
        imageUrl,
        flaggedAt: moderationResult.flagged ? now : null
    }

    IF moderationResult.flagged AND indicates crisis/self-harm:
        SEND supportive resource message to sender (not just a block)

    BROADCAST "MESSAGE" to the other user's socket in the same room


ON message "REPORT" { messageId?, reason }:
    INSERT INTO reports { reporterId: socket.userId, reportedUserId: partner.userId, messageId, reason }
    SEND "REPORT_RECEIVED" to socket

ON message "BLOCK":
    INSERT INTO blocks { blockerId: socket.userId, blockedUserId: partner.userId }
    END the room (set endedAt)
    NOTIFY both sockets, close room

// Ban enforcement (triggered from an admin action, future admin panel)
FUNCTION banUser(userId, reason):
    UPDATE users SET bannedAt = now, banReason = reason WHERE id = userId
    UPDATE sessions SET revokedAt = now WHERE userId = userId
    ADD userId to Redis ban denylist
    IF userId has an active socket connection:
        SEND "SESSION_REVOKED", CLOSE that socket immediately

// Icebreaker — triggered by a 30s inactivity timer per room
ON 30s silence in a room:
    suggestion = CALL ai.generateIcebreaker(room context)
    SEND "ICEBREAKER" { suggestion } to both sockets
```

### Phase 4 done when:
Two matched users can chat in real time, messages are moderated and persisted, reporting/blocking work, and a banned user's socket is cut immediately — test this by manually setting `bannedAt` on a test user mid-conversation and confirming they're disconnected.

---

## PHASE 5 — Mobile (frontend, consumes everything above)

**Where:** `apps/mobile/`

```
Screen: PhoneLogin
    input phone → POST /auth/otp/request → navigate to OtpVerify

Screen: OtpVerify
    input code → POST /auth/otp/verify → store tokens in Expo SecureStore → navigate to MoodPicker

Screen: MoodPicker
    select mood + interests → open WebSocket with access token → send JOIN_QUEUE → wait for MATCHED

Screen: Chat
    connected to room via WebSocket
    render messages as they arrive (MESSAGE event)
    send button → SEND_MESSAGE event
    report/block buttons → REPORT / BLOCK events

Screen: Profile
    GET /users/me on load → display + edit form → PATCH /users/me on save

Token refresh logic (app-wide):
    ON any API call returning 401:
        TRY POST /auth/refresh with stored refresh token
        IF success: retry original request with new access token
        IF failure: clear stored tokens, navigate to PhoneLogin
```

### Phase 5 done when:
Full flow works end-to-end on your phone/emulator against your real backend: login → match → chat → report — no mocked data anywhere.

---

## Ground rules while executing this plan

1. **Write the code yourself from this pseudocode.** Bring back real attempts, not blank questions.
2. **Don't start a phase until the previous one's "done when" condition is actually verified**, not assumed.
3. **When something breaks, read the actual error message first** — most of what you've hit so far (casing mismatches, wrong destructured field names, unused imports) was solvable just by reading the compiler output carefully before asking.
4. **Every new util/service you write, ask:** does this belong in `common/` (truly generic, no domain knowledge) or in a specific `modules/x/` (owns domain logic)? Getting this boundary right is what keeps the codebase navigable as it grows.