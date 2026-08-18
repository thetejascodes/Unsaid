# ADR-001: Database Selection — SQL vs NoSQL

## Context

Unsaid is a mood-based chat app where authenticated users (phone-verified,
via OTP) are matched with strangers for conversation. The system now
persists chat history and needs to support accounts, profiles, and — most
importantly — reporting, blocking, and banning to keep the platform safe,
since matching pairs vulnerable, often emotionally distressed users.

The data the system needs to store falls into two categories:

1. **Relational, integrity-critical data**: users, auth sessions, OTP
   codes, reports, blocks, and bans. This data has real foreign-key
   relationships that must stay consistent — e.g. a `Report` references a
   `reporter`, a `reportedUser`, and optionally a `message`; a `Ban` must
   reliably and immediately prevent a user from being matched again.
   Inconsistency here is a **safety bug**, not just a data-quality issue —
   a dangling reference could let a banned or blocked user continue
   matching with people.

2. **High-volume, append-only, simple-shape data**: chat messages. Written
   at high frequency, read mostly by `room_id`, and rarely require complex
   joins on message content itself.

Two broad options were considered:

- **SQL (PostgreSQL)** — relational, enforces schema and referential
  integrity at the database layer, supports transactions across related
  tables (e.g. user + ban + session revocation in one atomic operation).
- **NoSQL (MongoDB)** — document-oriented, flexible schema, relations
  handled by convention in application code rather than enforced by the
  database.

It's worth noting that some large-scale chat platforms (e.g. Discord) are
often cited as evidence that chat apps require NoSQL. Discord's actual
history is: MongoDB → Apache Cassandra → ScyllaDB. They moved away from
MongoDB in 2017 specifically because it could not sustain the write
throughput they needed at growing scale, and later moved from Cassandra to
ScyllaDB for unrelated operational reasons (GC pauses, hot partitions) at
a scale of trillions of messages across hundreds of millions of users.
Cassandra/ScyllaDB are wide-column stores optimized for extreme write
throughput — a different category of NoSQL from MongoDB, and a different
scale of problem than Unsaid currently has.

## Decision

**Use PostgreSQL as the single primary datastore**, for both the
relational domain data (users, sessions, OTP codes, reports, blocks, bans)
and the chat messages themselves. Redis remains in use separately, but
only for genuinely ephemeral state (matching queue, active session/ban
denylist checks) — not as a system of record.

MongoDB is explicitly not adopted for this system.

Rationale:

- **Referential integrity where it matters most.** Postgres foreign keys
  and transactions guarantee that a ban, block, or report cannot exist in
  an inconsistent state relative to the user it references. This is
  enforced by the database itself, not by application-level discipline.
- **Messages fit a relational shape.** A message is
  `{id, room_id, sender_id, content, sent_at, type}` — a normal row, not a
  deeply nested or schema-variable document. Postgres handles high
  insert-rate, append-only tables (indexed on `room_id, sent_at`) well at
  the scale Unsaid currently operates at or is likely to reach in the
  near term.
- **JSONB gives schema flexibility where actually needed** (e.g.
  moderation metadata, AI flags) without giving up transactions and joins
  for the rest of the schema — avoiding the need to split the data layer
  across two databases to get flexibility in a few fields.
- **Operational simplicity.** One system of record (Postgres) plus Redis
  for ephemeral state is less infrastructure surface to secure, back up,
  and operate than a Postgres + MongoDB split, which matters more than
  usual here given the sensitivity of the data being stored (phone
  numbers, private message content).
- **Scale does not currently justify NoSQL.** Discord's own move away from
  MongoDB, and their later move to a wide-column store, was driven by
  write throughput at a scale (trillions of messages, hundreds of millions
  of users) that is not representative of Unsaid's current or near-term
  scale. Adopting that architecture now would be optimizing for a problem
  the system does not yet have, at the cost of relational guarantees the
  system needs today.

## Consequences

**Positive:**
- Ban, block, and report enforcement can rely on database-level
  consistency guarantees rather than application-level checks alone,
  reducing the risk of a safety-critical bug.
- Single query language and single ORM (Prisma) across the whole domain
  model simplifies development and onboarding.
- JSONB columns provide an escape hatch for evolving/flexible fields
  without a second database.
- Lower operational overhead: one primary datastore to provision, secure,
  back up, and monitor.

**Negative / trade-offs:**
- If message write volume grows to a scale where a single Postgres
  instance becomes a bottleneck (not currently anticipated), a future
  migration of the `messages` table to a dedicated store (e.g. a
  wide-column database) may be required. This ADR does not preclude that;
  it defers that decision until there is measured evidence of need.
- Horizontal write scaling is less native to Postgres than to some NoSQL
  systems; this is accepted as a reasonable trade-off given current scale.
- Schema changes to relational tables require migrations (via Prisma),
  which is a minor process overhead compared to MongoDB's schema-less
  writes — considered acceptable given the stability this enforces on
  safety-critical tables.

**Follow-up:**
- Revisit this decision if/when message write throughput or storage
  volume is measured to approach limits of a single well-tuned Postgres
  instance, rather than pre-emptively.