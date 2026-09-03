# ADR-0005: WebSocket Connection Resilience — Registry Scope and Heartbeat

## Context

Multi-device testing (an Android emulator alongside a physical device,
both connecting through a mobile hotspot) surfaced two distinct
connection-reliability problems, both of which manifested the same way
from a user's perspective — an event or message that should have
arrived silently didn't — which made them easy to conflate while
debugging, even though their root causes and fixes are unrelated.

**Stale registry entries:** The socket registry
(`Map<userId, WebSocket>` in `matching/socket-registry.ts`), used by
`getSocket()` to look up a connected user's active socket when routing
chat messages and other partner-directed events, was only populated
inside the `JOIN_QUEUE` handler. A user who was already matched and
actively chatting had no reason to send `JOIN_QUEUE` again — they were
not queuing. If that user's connection dropped and reconnected (a
server restart during development, an app reload, a transient network
blip), they never re-registered, so `getSocket(partnerId)` silently
returned `undefined` and messages addressed to them were dropped with
no error surfaced to either participant.

**Idle connection drops:** Independently of the above, WebSocket
connections were observed closing with code `1006` ("unexpected end of
stream") after roughly 20-30 seconds of no traffic, specifically when
both devices were on the same mobile hotspot. This is consistent with a
hotspot or NAT idle-connection timeout closing connections that carry
no data for some interval — a network-layer behavior unrelated to
anything the application does or doesn't send.

## Decision

### 1. Register every authenticated connection immediately, not on a feature-specific event

Socket registration now happens in `attachWebSocketServer`'s
`handleUpgrade` callback, immediately after the access token is
verified and `userId` is attached to the socket — before any
application-level event is ever received on that connection.
Unregistration happens symmetrically, in the same file's `close`
handler.

Rationale: this makes the registry a property of *authentication*,
not of any single feature's workflow. Any connected, authenticated user
is reachable via `getSocket()` regardless of what they're currently
doing — queuing, mid-conversation, or simply connected and idle.
Feature-specific handlers (`JOIN_QUEUE` and any future event type) no
longer need to know about, or remember to perform, registry
bookkeeping; correctness no longer depends on every code path that
might reconnect a client also remembering to re-announce itself.

### 2. Add a client-initiated application-level heartbeat

The mobile client sends `{ type: "PING" }` every 15 seconds while
connected; the server replies `{ type: "PONG" }` via the same
`registerMessageHandler` mechanism used for every other event type.
Neither side attaches meaning to the payload beyond "the connection is
alive" — the client discards `PONG` on receipt without rendering
anything.

Rationale: keeping a small, constant trickle of traffic flowing is
sufficient to prevent the idle-connection timeout observed on the
tested hotspot from triggering. An application-level message was chosen
over the `ws` library's lower-level ping/pong control frames because
React Native's WebSocket implementation does not reliably surface those
frames, and an application-level event is visible in the same logs and
event-routing path as everything else, which matters for a young
codebase where every other event type is already debugged this way. The
15-second interval was chosen empirically, comfortably under the
observed ~20-30 second timeout window; it is not derived from any
documented spec, since hotspot idle-timeout behavior is undocumented
and appears to vary by carrier and device.

## Consequences

**Positive:**
- Any connected user is reliably reachable regardless of their current
  activity, closing off a class of "message silently disappeared" bugs
  that were previously indistinguishable from a real delivery failure.
- Idle connections now survive on unstable networks (hotspots, weak
  Wi-Fi) that would otherwise kill them, at the cost of a small,
  constant amount of extra traffic per connected client — one small
  frame every 15 seconds in each direction.
- Both fixes are localized: the registry change touches only
  `attachWebSocketServer`, and the heartbeat is isolated to
  `ws-client.ts` and one new handler, without requiring changes to
  `JOIN_QUEUE`, `SEND_MESSAGE`, or any other existing event.

**Negative / trade-offs:**
- The registry remains in-memory and per-process. A server restart
  still clears it entirely regardless of this change; every client must
  reconnect afterward to become reachable again. Surviving a restart
  without requiring reconnection is out of scope here and would require
  a durable or shared registry (relevant to the "Multi-Instance
  Deployment" item already on the README roadmap).
- The heartbeat interval (15s) is a value tuned to one observed
  network, not a general guarantee. A network with a shorter idle
  timeout than the one tested could still disconnect; there is no
  adaptive or configurable interval yet.
- Neither fix addresses message resync: a client that was genuinely
  disconnected (not just idle) does not currently receive messages sent
  during the gap once it reconnects. This remains a known gap, tracked
  separately in the README's Known Limitations.

**Follow-up:**
- If a network with a materially shorter idle timeout than ~20 seconds
  is encountered in practice, lower the heartbeat interval accordingly
  rather than assuming 15 seconds is universally sufficient.
- Revisit the in-memory, per-process registry design if or when
  multi-instance deployment is implemented — a registry that only knows
  about sockets on its own process cannot route messages to a user
  connected to a different instance.
- Consider adding message resync (fetching messages sent while
  disconnected, on reconnect) as a distinct piece of follow-up work; it
  is a related but separate problem from either fix in this ADR.