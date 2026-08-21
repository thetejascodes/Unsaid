# ADR-002: Authentication Strategy — Phone OTP, Server-Tracked JWT Sessions, and Restricted Twilio API Keys

## Context

Unsaid pairs users for pseudonymous conversation by mood. The original
concept was fully anonymous with no accounts at all. That model made it
impossible to enforce bans or blocks reliably — a user removed for abusive
behavior could simply reconnect and appear as a new stranger. Some form of
persistent identity was required to make moderation actually work, without
turning the product into a conventional social app where users perform an
identity to each other.

Several related decisions needed to be made together, since they affect
the same auth module:

1. **What credential proves a real, distinct person**, cheaply enough to
   use at signup, but strong enough to meaningfully deter ban evasion.
2. **How sessions and tokens are managed**, specifically whether a ban or
   logout can revoke access immediately, or only once a token naturally
   expires.
3. **How the backend authenticates to Twilio** (the SMS provider used to
   deliver OTP codes) — using the account's full Auth Token, or a scoped
   API Key.

## Decision

### 1. Phone number + OTP, not email or bare device ID

Users verify a phone number via a one-time SMS code before an account is
created. No password is ever stored. The match itself remains
pseudonymous — a partner only ever sees a chosen username and mood, never
the phone number.

Rationale: email addresses are nearly free to generate in bulk, making
them weak against ban evasion — a banned user can create a new email in
seconds. A phone number is a meaningfully higher barrier, and most people
already have one, so it doesn't add friction beyond entering a code.
Device-only identifiers were rejected because they don't survive a
reinstall or a new device, which would let a banned user return trivially.

### 2. Server-tracked sessions with rotating refresh tokens, not stateless JWTs alone

A short-lived JWT (~15 min) authorizes each request. A separate,
longer-lived refresh token is issued alongside it, and its hash is stored
in a `sessions` table with a `revokedAt` column. Refreshing rotates the
token (the old session row is marked revoked, a new one is created).

Rationale: a purely stateless JWT cannot be revoked before it naturally
expires. That is unacceptable here — the app's core safety requirement is
that a ban must cut off access immediately, not up to 15 minutes later.
Tracking sessions server-side, and checking `revokedAt` on refresh (plus a
Redis denylist checked on every WebSocket message for active connections),
makes a ban an immediate, real event rather than a delayed one.

### 3. OTP codes are never stored in plaintext

Both the OTP code and the refresh token are hashed before being written to
the database, following the same reasoning as password storage: if the
database is ever read by an unauthorized party, stored codes/tokens should
not be directly usable.

### 4. Twilio: Restricted API Key, not the Account Auth Token

The backend authenticates to Twilio using a Restricted API Key (an SID +
secret pair scoped to SMS-sending permissions only), combined with the
Account SID, rather than using the Account SID + Auth Token pair directly
in application code.

Rationale: the Account SID + Auth Token combination has full control over
the entire Twilio account — including the ability to create or delete
other API keys, manage billing, and access every product on the account.
That credential lives in application config (`.env`, environment
variables in deployment) and is therefore the credential most exposed to
accidental leakage. A Restricted API Key scoped to only SMS-sending
permissions limits the damage of a leak to "an attacker can send SMS
through this account," rather than full account takeover. Standard API
Keys (broad access, excluding account/key management) were considered a
fallback for regions where Restricted keys are unavailable, but Restricted
was chosen as the default given availability in the account's region.

## Consequences

**Positive:**
- A ban is enforceable immediately, not just on next login — directly
  supports the product's core safety requirement.
- Ban evasion via disposable credentials (e.g. throwaway email) is
  meaningfully harder than with email-based auth.
- A leaked Twilio credential in application config has a bounded blast
  radius (SMS-sending only) rather than full account compromise.
- No password storage at all — removes an entire class of credential
  -stuffing and weak-password risk.

**Negative / trade-offs:**
- Requires an SMS provider (cost per message, delivery reliability
  dependent on a third party) rather than free email delivery.
- Server-tracked sessions add a `sessions` table and a lookup on every
  refresh, versus a purely stateless JWT design — a deliberate trade of
  simplicity for revocability.
- Phone numbers are more sensitive PII than a username; they are stored
  hashed and never exposed to a user's match, but the hashing itself adds
  implementation surface (must be applied consistently everywhere a phone
  number is looked up).
- Twilio trial-account restrictions (SMS only to verified numbers) limit
  realistic multi-user testing until the account is upgraded to paid.

**Follow-up:**
- Revisit OTP delivery rate limits and Twilio spend once real user volume
  exists.
- Consider adding an optional secondary recovery method (e.g. email) only
  if phone-only recovery proves to be a real support burden — not
  pre-emptively.