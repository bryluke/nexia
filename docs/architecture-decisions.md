# Nexia v2 — Architecture Decisions

Written: 2026-03-22
Status: Living document, updated as decisions evolve.

---

## 1. Why Nexia Exists (and What It's Not)

**Context:** The v1 prototype was a Claude Code clone — technically functional but purposeless. Bryan kept using ttyd + Claude Code CLI instead, because it was the real thing. The lesson: don't clone — create.

**What Nexia v2 is:** A cockpit around Claude Code. It wraps the Agent SDK as an execution engine, adding persistent memory, machine management, and developer UX that the CLI doesn't provide. It's not trying to replace Claude Code — it's the layer above it.

**What it's not:** A general-purpose chat app. Not a terminal emulator. Not an IDE. The scope is deliberately narrow: manage conversations, manage the machine, remember things across sessions.

---

## 2. Agent SDK `query()` Only

**Options considered:**
1. Direct Claude API calls — full control, but loses all Claude Code tooling (file ops, bash, search, subagents)
2. Agent SDK V2 (`streamMessages`) — more granular control, but unstable API surface
3. Agent SDK `query()` — proven, stable, handles tool use/streaming/permissions

**Decision:** `query()` only. It's the stable interface, it handles the subprocess lifecycle, and every tool works out of the box.

**Tradeoffs:** Each message spawns a subprocess (~1-2s latency). No fine-grained control over the inner agent's behavior. Session resume depends on JSONL files on disk. These are acceptable for a single-user personal tool.

---

## 3. Permission Mode: `acceptEdits`

**Options:**
- `default` — every tool triggers a permission prompt. Safe but noisy.
- `acceptEdits` — file edits auto-approved, bash/others need approval.
- `bypassPermissions` — everything auto-approved. Fast but dangerous.

**Decision:** `acceptEdits`. This is a personal VM, so file edits are low-risk. But bash commands can do real damage (rm -rf, service restarts, etc.), so those still surface for approval.

**Note from tofucode:** They default to `bypassPermissions`. That's bolder — makes sense for a power-user tool where speed matters and you trust the agent. Worth reconsidering if the permission prompts become friction.

---

## 4. Bun + Preact + Vanilla CSS (Not Vue/Vite/Tailwind)

**Context:** v1 used Tailwind via bun-plugin-tailwind. It worked but added build complexity for minimal value in a single-developer project.

**Decision:**
- **Bun** over Node — faster startup, native SQLite, HTML imports, TypeScript without build step. Single runtime for everything.
- **Preact** over Vue/React — 3KB, compatible JSX, sufficient for this UI complexity. No need for Vue's reactivity system or React's ecosystem.
- **Vanilla CSS with `--nx-` tokens** — aligns with `@bryanluketan/ui`, no build deps, full control. Design tokens provide the consistency that a framework would.

**Tofucode comparison:** They use Vue 3 + Vite + Express + Node. Heavier stack, but Vue's SFC pattern (template + script + scoped style in one file) does keep components self-contained. Their ChatView.vue is 2900 lines though — Vue doesn't prevent monoliths.

---

## 5. SQLite for Everything (Not SDK's Native JSONL)

**Options:**
1. Use SDK's JSONL files directly (like tofucode) — zero data layer, but read-only and no cross-session features
2. Own SQLite DB — full control, but duplicates some data

**Decision:** Own SQLite with conversations, messages, and memory tables. The SDK's JSONL files are still used for session resume (`resume: sessionId`), but Nexia maintains its own message history for:
- Cross-session memory search
- Conversation summaries
- Cost/duration tracking per message
- Future features (search, analytics, tagging)

**Tradeoff:** Messages exist in two places (SQLite + JSONL). If they diverge, SQLite is the source of truth for display, JSONL for agent continuity.

---

## 6. Single WebSocket (Not Dual Like Tofucode)

**Context:** Tofucode uses a clever dual-WS pattern: global WS for sidebar state + scoped WS per chat view. This enables true multi-tab support.

**Decision (v2 launch):** Single WebSocket. Nexia is single-user, typically single-tab. The complexity of dual connections isn't justified yet.

**Reconsidering:** If multi-tab becomes needed (e.g., monitoring a long-running conversation in one tab while browsing dashboard in another), the dual-WS pattern is the right approach. Add it when the need is real.

---

## 7. Hash-Based Routing (Not History Mode)

**Decision:** `#/chat` and `#/dashboard`. Three pages don't justify a routing library. Hash routing works without server-side catch-all configuration and survives Caddy proxying without special rules.

**Tofucode comparison:** They use Vue Router with history mode, which requires server-side fallback routing. More "correct" but more infrastructure.

---

## 8. Top Nav + Page Content (Not Sidebar)

**Context:** v1 used a sidebar layout (conversation list always visible). This made sense for a single-page chat app but doesn't scale to multiple pages.

**Decision:** Top nav with page-level routing. Chat page has its own internal conversation list panel. Dashboard is its own page. This is more conventional and more extensible.

---

## 9. Memory System: SQLite LIKE + Tags

**Options:**
1. No memory (like tofucode) — rely on CLAUDE.md and session history
2. SQLite LIKE search + tags — simple, no dependencies
3. SQLite FTS5 — full-text search, more powerful
4. Vector embeddings — semantic search, requires embedding model

**Decision:** Start with LIKE + tags. Single-user scale means the memory table will stay small (hundreds, not millions of rows). LIKE is fast enough and the implementation is trivial.

**Upgrade path:** If search quality becomes a problem, FTS5 is a drop-in upgrade (same SQLite, just add a virtual table). Vector embeddings are overkill unless cross-project semantic search becomes a real need.

---

## 10. Conversation Summarization on Archive

**Decision:** When a conversation is archived, spawn a lightweight `query()` with structured output to generate a summary and extract facts/decisions/todos into the memory table.

**Why not on every message?** Too expensive (each query spawns a subprocess), and most in-progress conversations don't need summarization. Archive is the natural "this is done" signal.

**Tofucode comparison:** They don't do this at all. Their sessions are ephemeral — close the tab and the context is in the JSONL file but never distilled. Nexia's approach means knowledge compounds across sessions.
