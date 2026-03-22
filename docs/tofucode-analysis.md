# Tofucode Analysis

Written: 2026-03-22
Source: https://github.com/picotofu/tofucode (v1.2.1)

Analysis of picotofu's tofucode — a similar Claude Agent SDK wrapper with a web UI, but with a much broader feature set (terminal, files, Discord, Slack, MCP).

---

## Stack Comparison

| Dimension | tofucode | Nexia v2 |
|-----------|----------|----------|
| Runtime | Node.js 18+ | Bun |
| Server | Express 5 + `ws` | Bun.serve() |
| Frontend | Vue 3 + Vite | Preact + Bun bundler |
| Styling | Scoped SFC styles + CSS vars | Vanilla CSS + `--nx-` tokens |
| AI | Agent SDK + direct Anthropic SDK | Agent SDK only |
| Auth | Argon2 + cookie sessions | Bearer token |
| Session storage | SDK's native JSONL (no own DB) | Own SQLite DB |
| PWA | Yes (Workbox service worker) | No |
| Test coverage | Manual only | None yet |
| Maturity | Published on npm, Docker support | Freshly built |

---

## Patterns Worth Adopting

### 1. Message Queue (High Impact)

**What:** If a prompt arrives while a task is running, it queues (up to 50) and auto-processes sequentially. Queue is visible in the UI.

**Why it matters:** Currently Nexia blocks — you can't queue a follow-up while waiting. This is friction. The queue lets you fire-and-forget multiple instructions.

**Implementation complexity:** Low. Add an in-memory queue per conversation in session-store.ts, process on `result` event.

### 2. Tool Grouping (High Impact)

**What:** Consecutive tool_use + tool_result messages are collapsed into a summary card ("Read x2, Edit, Bash x3") with expandable details per tool. Standalone tools (plan mode, ask user) render individually.

**Why it matters:** A typical Claude response might use 5-10 tools. Individual cards for each one clutters the chat and pushes the actual text response off screen. Grouping keeps the conversation readable.

**Implementation complexity:** Medium. Needs a grouping pass over contentBlocks in MessageBubble, plus a new ToolGroup component.

### 3. Turn-Based Pagination (Medium Impact)

**What:** Initial load shows last 3 turns (user message + all responses until next user). "Load older" adds 5 turns. Not individual messages.

**Why it matters:** Long conversations can have hundreds of messages. Loading them all is slow and unnecessary. Turn-based pagination matches how humans think about conversations — "what did I ask and what was the answer."

**Implementation complexity:** Medium. Requires grouping messages into turns on the backend, adding a pagination API, and a "load more" UI.

### 4. Dual WebSocket (Low Priority Now)

**What:** Global WS for app-wide state (sidebar, project list) + scoped WS per chat view. Enables multi-tab support with session watchers that detect conflicts.

**Why it matters for later:** If Nexia grows to support multiple simultaneous conversations or monitoring, this prevents state corruption between tabs. Not needed for single-tab use.

### 5. Context Compaction Visualization (Low Effort)

**What:** When Claude compresses context (summary messages), tofucode shows a visual separator with scissors icon. Makes it clear that earlier context was summarized.

**Why it matters:** Without this, users don't know why Claude "forgot" something from earlier in the conversation. The visual cue sets expectations.

**Implementation complexity:** Low. Detect summary-type messages in the stream, render a divider component.

### 6. Model Badge per Response (Low Effort)

**What:** Each assistant message shows which model (Haiku/Sonnet/Opus) generated it.

**Why it matters:** When the agent delegates to sub-agents or when you switch models mid-conversation, knowing which model generated a response helps calibrate trust and debugging.

**Implementation complexity:** Low. The SDK stream includes model info in assistant messages. Surface it in the UI.

### 7. AskUserQuestion as Modal (Already Have, Different UX)

**What:** Tofucode shows a full modal for AskUserQuestion with radio/checkbox options. The answer becomes a natural language follow-up prompt.

**Nexia's approach:** Inline card within the message stream. Both work — the inline approach is less disruptive, the modal is more prominent. Keep inline but consider making it more visually prominent.

---

## Patterns to NOT Adopt

### Terminal Mode

Tofucode has a built-in terminal (command-at-a-time executor). Bryan already has ttyd providing a full terminal at `/terminal`. No need to build a worse version.

### File Browser/Editor

Same reasoning — Claude Code already has file tools, and the VM has full editor access via terminal. A built-in file browser would be scope creep.

### Discord/Slack Integration

Cool but not needed for Bryan's use case. The event bus architecture is worth noting though (Node EventEmitter decoupling transport from logic) if Nexia ever needs multi-transport.

### PWA

Not needed when the app is always accessed through the same URL on the same device.

### Argon2 Auth

Bearer token is fine for a single-user personal tool behind Cloudflare. The auth complexity of Argon2 + cookie sessions is overkill.

---

## Architecture Observations

### Their Session Storage Trade-off

Tofucode stores NOTHING of its own for messages — it reads directly from the SDK's JSONL files. This means:
- Zero data duplication
- No sync issues between their DB and SDK state
- But also: no cross-session search, no memory extraction, no cost tracking

Nexia's approach (own SQLite + SDK JSONL) is more complex but enables the memory system, which is Nexia's differentiator.

### Their 2900-Line ChatView

Their main chat component is a monolith. Nexia already has better separation (ChatView + MessageBubble + ToolUseCard + PermissionCard + ChatInput). This validates the decomposed component approach.

### Their Slug-to-Path Problem

Claude's project slugs are lossy (both `/` and `.` become `-`). Tofucode uses recursive filesystem probing to resolve paths. Nexia avoids this entirely by storing the full `cwd` path in the database.

---

## Key Takeaway

Tofucode is a more feature-complete product (terminal, files, Discord, Slack, multi-model, PWA). But Nexia's differentiators are:
1. **Memory system** — knowledge compounds across sessions
2. **Machine awareness** — dashboard, system info
3. **Lighter stack** — Bun + Preact is dramatically simpler than Node + Express + Vue + Vite
4. **Better component architecture** — decomposed from day one

The highest-value things to port from tofucode are **tool grouping** and **message queue** — both directly improve the chat UX without expanding scope.
