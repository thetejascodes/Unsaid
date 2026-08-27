# ADR-0004: AI Provider Strategy — OpenAI-Compatible Endpoint, Fail-Open Moderation

## Context

Phase 4 requires two AI-backed features: content moderation on every chat
message, and icebreaker suggestions after a period of silence. Both need
an LLM call from the backend. Two decisions were needed: which provider
to call, and how the system should behave if that call fails.

**Provider:** Anthropic's Claude API was the original default assumption
(referenced throughout earlier planning and ADR-0002/0003), but it has
no free tier for direct API access — usage is metered per token from the
first call. NVIDIA's NIM catalog offers an OpenAI-compatible endpoint
with free access to a range of open models, removing billing setup as a
blocker during development.

**Failure behavior:** every message send now depends on a third-party
network call completing successfully before the message can be
evaluated for safety. That call can fail for reasons entirely outside
the app's control (provider outage, rate limiting, network issues). The
system needs a defined, deliberate behavior for that case, not an
accident of whatever a bare `try/catch` happens to do.

## Decision

### 1. Call the AI provider through the OpenAI SDK against a configurable base URL, not the Anthropic SDK directly

`modules/ai/moderation.ts` uses the `openai` npm package's client,
pointed at `config.ai.baseUrl` (defaulting to NVIDIA's NIM endpoint),
authenticated with `config.ai.apiKey`, calling whatever model is set in
`config.ai.moderationModel`.

Rationale: the OpenAI-compatible chat completions shape is supported by
a wide range of providers (NVIDIA NIM, Anthropic via compatible
endpoints, OpenAI itself, many self-hosted/open-weight serving
frameworks). By coding against that shape and keeping the provider,
base URL, and model name in `config` rather than hardcoded, switching
providers later — including moving to Anthropic's Claude API directly,
which remains a reasonable option once the product has real usage and a
billing plan — requires changing environment variables, not application
code. This mirrors the same principle applied to Twilio (isolating the
SMS-sending call in its own file) and to the database layer (choosing a
model deliberately rather than defaulting to whatever was most
familiar).

### 2. Moderation fails open, not closed

If the AI call throws for any reason (network failure, non-2xx
response, malformed output, missing content in the response), or if the
model's response isn't valid JSON, `checkModeration` returns `{
flagged: false, category: null }` rather than throwing an error up to
the caller. The chat message is still sent and persisted; the failure
is logged server-side for visibility, but never blocks the user's
ability to communicate.

Rationale: Unsaid's core product is a real-time conversation between two
people, often in an emotionally vulnerable moment. Making that
conversation depend on a third-party API's uptime — such that an outage
or transient error silently prevents someone from being able to send a
message at all — would undermine the product more than an occasional
unflagged message would. Moderation is treated as a safety *layer*, not
the sole safety mechanism; reporting and blocking (Phase 4, same scope)
remain available regardless of whether automated moderation succeeded
on any given message.

### 3. Low temperature, small max token budget for moderation calls

`temperature: 0`, `max_tokens: 200`. Rationale: moderation is a
classification task where consistency matters — the same message should
receive the same verdict on repeated evaluation, which a low temperature
supports. A verdict is a small JSON object; a large token budget serves
no purpose here and is set deliberately rather than left at a
default meant for longer, more open-ended generation tasks (as
distinguished from the icebreaker feature, which is generative and may
warrant different settings when built).

## Consequences

**Positive:**
- No billing setup required to begin building and testing Phase 4's AI
  features.
- Provider is swappable via configuration alone — including to
  Anthropic directly, or to a different open model — without touching
  `moderation.ts`'s logic.
- The app's core chat functionality is resilient to AI provider outages;
  a failure degrades safety coverage for that message rather than
  degrading the product's core function.

**Negative / trade-offs:**
- Fail-open means a message that Claude or a similarly capable model
  would have flagged could pass through unflagged if the call fails at
  exactly the wrong moment. This is an accepted, deliberate trade-off
  given the reasoning above, not an oversight — but it means moderation
  coverage is not a hard guarantee, and reporting/blocking must be
  treated as equally important safety mechanisms, not secondary ones.
- Open, free-tier models accessed via NIM may be less reliable than
  Claude at strictly following a "respond with only JSON" instruction;
  `checkModeration`'s `JSON.parse` failure path (falling into the same
  fail-open behavior) is the current mitigation. If this proves to be a
  frequent failure mode in practice, add response post-processing (e.g.
  stripping markdown code fences) or reconsider the model/provider
  before it undermines moderation coverage meaningfully.
- No cost visibility work has been done for a future move to a paid,
  metered provider (Anthropic or otherwise) — revisit token volume and
  expected cost once real usage exists, per the original Phase 4 plan's
  note on this.

**Follow-up:**
- Reassess provider choice once the product has real traffic and a
  billing plan — free-tier reliability and rate limits are not
  representative of production requirements.
- Monitor how often `checkModeration`'s catch/fail-open path actually
  fires in practice (via the `console.error` logging) to judge whether
  the current model's JSON-following reliability is acceptable.