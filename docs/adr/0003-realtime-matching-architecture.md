# ADR-0003: Real-Time Matching Architecture — WebSocket Hosting and Queue Concurrency

## Context

Phase 3 introduces the first stateful, real-time component of Unsaid:
matching two users by mood via WebSocket connections and a shared
waiting queue. This is architecturally different from Phases 1–2, which
were entirely stateless HTTP request/response.

Two decisions needed to be made before implementation:

1. **How the WebSocket server is hosted** relative to the existing
   Express HTTP server — as a separate process/port, or attached to the
   same server.
2. **How to prevent the matching queue's race condition** — two
   `JOIN_QUEUE` events arriving close together must not be able to match
   the same waiting user to two different partners simultaneously. This
   is the same class of problem already solved twice in Phase 1 (OTP
   double-consumption, refresh-token double-rotation), now occurring
   against Redis instead of Postgres, where Postgres's `SELECT ... FOR
   UPDATE` row-locking mechanism does not apply.

## Decision

### 1. WebSocket server attached to the existing HTTP server, not separate

The WebSocket server is created with `noServer: true` and wired into the
existing Express `http.Server`'s `upgrade` event, rather than run as an
independent process on its own port.

Rationale: at current scale, a separate WebSocket service would add
deployment and operational complexity (a second process to run, monitor,
and scale) without a concrete benefit yet. Running on the same server
process keeps local development and deployment simple — one process,
one port — while still cleanly separating WebSocket-specific logic into
its own module (`modules/matching/`). This can be split into a separate
service later if connection volume genuinely requires independent
scaling of the WebSocket layer from the HTTP API layer; that decision is
deferred until there's measured evidence of need, not made pre-emptively.

Authentication happens at the `upgrade` event, before the WebSocket
handshake completes — an invalid or missing access token results in the
connection being rejected outright (`socket.destroy()`), rather than
accepted and closed immediately after. This mirrors the same
fail-fast-and-early principle used by `isAuthenticated` for HTTP routes.

### 2. Redis atomic commands (`LPOP`) for queue concurrency, not application-level locking

The matching queue is implemented as one Redis list per mood
(`queue:{mood}`). Matching a waiting candidate uses Redis's `LPOP`
command — an atomic "read and remove" operation — rather than a
"read the list, then separately remove an entry" sequence.

Rationale: Redis executes commands single-threadedly, so a single atomic
command like `LPOP` cannot be interleaved by a concurrent request the
way a multi-step read-then-write sequence could be. This achieves the
same safety guarantee as Postgres's `SELECT ... FOR UPDATE` transactions
used in Phase 1, but through Redis's native atomicity rather than an
explicit lock — there is no direct equivalent of Postgres row-locking in
Redis, so the queue design was chosen specifically to avoid ever needing
one, by structuring operations so a single atomic command is always
sufficient.

An in-memory `Map<userId, WebSocket>` tracks live socket connections per
server process. This is explicitly a single-instance design; it does not
generalize correctly to multiple server instances, since one instance
has no way to reach a socket registered on another. Redis Pub/Sub is the
standard fix for that (each instance subscribes and republishes events
meant for sockets it doesn't own), but is not implemented now — it is
deferred until horizontal scaling of the server is actually needed.

## Consequences

**Positive:**
- Single process to run and deploy for the current scale; no added
  infrastructure or operational surface beyond what Docker Compose
  already provisions (Postgres, Redis, server).
- The queue's core race condition is prevented by Redis's native
  atomicity, without needing to hand-build a distributed locking
  mechanism.
- Authentication is rejected at the earliest possible point in the
  WebSocket handshake, consistent with the fail-fast pattern already
  used throughout the HTTP API.

**Negative / trade-offs:**
- The in-memory socket registry does not survive a server restart (all
  connections drop, as expected for WebSockets generally) and does not
  work correctly across multiple server instances. Horizontal scaling of
  the WebSocket layer will require a follow-up change (Redis Pub/Sub or
  equivalent) before it can be deployed with more than one server
  process.
- Queue operations that don't map cleanly onto a single atomic Redis
  command (e.g. removing a specific user from the middle of a list on
  explicit `LEAVE_QUEUE`) still require a read-then-write sequence
  (`LRANGE` + `LREM`); this is accepted because it is not on the hot,
  contested path — it manipulates one user's own entry, not a shared
  "which candidate wins" decision.
- A popped candidate that turns out to be invalid (e.g. blocked by the
  requesting user) is currently handled by discarding the match attempt
  for this round rather than re-queuing the popped candidate, favoring
  correctness and simplicity over optimal queue fairness in that edge
  case. This may be revisited once basic matching is proven in
  production use.

**Follow-up:**
- Revisit WebSocket hosting (same-process vs. separate service) once
  concurrent connection volume is measured, not speculated.
- Implement Redis Pub/Sub for cross-instance socket delivery only when
  horizontal scaling of the server is actually planned.
- Revisit the discarded-candidate-on-block edge case if queue wait times
  become a measured problem.