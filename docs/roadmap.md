# Nexia v2 — Roadmap

Written: 2026-03-22
Status: Living document.

---

## Where We Can Do Better (from tofucode analysis + pilot testing)

### UX Gaps (High Impact)

1. **Tool grouping** — Individual tool cards clutter the chat. Need collapsible groups with summary headers.
2. **Message queue** — Can't send follow-up messages while a query is running. Need a queue with visible status.
3. **Turn-based pagination** — Loading all messages for a long conversation is slow. Load last 3 turns, paginate backward.
4. **Context compaction indicator** — Users don't know when/why Claude "forgot" earlier context.
5. **Model badge** — Show which model generated each response.

### Robustness Gaps

6. **Error recovery** — Unhandled errors in the agent engine crash the entire server process. Need try/catch at the query iteration level that sends error to the client without killing the server.
7. **Reconnection state** — When the WS reconnects, the client doesn't know the current state of an in-progress query. Need a state sync mechanism.
8. **Stale tool cards** — Race condition where tool_use_result arrives before the tool card is rendered (state batching). The Nexia-via-Nexia session already patched this with `resolvedToolsRef`.

### Feature Gaps

9. **Per-conversation cwd picker** — v2 creates conversations with `homedir()` default. Need a directory picker like v1 had.
10. **Conversation search/rename** — Can't find old conversations or rename them.
11. **Permission mode selector** — Currently hardcoded to `acceptEdits`. Should be selectable per conversation.

### Architecture Gaps

12. **No tests** — Zero test coverage. At minimum, need DB query tests and WS protocol tests.
13. **Frontend build optimization** — Bun's HTML imports work but don't tree-shake or minify. Fine for now, but may matter at scale.

---

## Execution Plan

### Phase 2A: Chat Polish (Next)

Priority: Fix the UX issues that make daily use frustrating.

| # | Item | Effort | Files |
|---|------|--------|-------|
| 1 | Tool grouping | Medium | New `ToolGroup.tsx`, update `MessageBubble.tsx` |
| 2 | Message queue | Low | `session-store.ts`, `engine.ts`, `handler.ts`, new queue UI component |
| 3 | Error recovery (don't crash server) | Low | `engine.ts` — wrap query iteration in try/catch |
| 4 | Directory picker for new conversations | Medium | New `DirectoryPicker.tsx` (port from v1), update `ChatPage.tsx` |
| 5 | Context compaction indicator | Low | `stream-parser.ts`, new `CompactionDivider.tsx` |
| 6 | Model badge on responses | Low | `stream-parser.ts`, `MessageBubble.tsx` |

### Phase 2B: Conversations & Memory

Priority: Make the conversation and memory systems actually useful.

| # | Item | Effort | Files |
|---|------|--------|-------|
| 7 | Turn-based pagination | Medium | New API endpoint, `useChat.ts`, `ChatView.tsx` |
| 8 | Conversation search | Low | New search input in `ConversationList.tsx`, filter client-side |
| 9 | Conversation rename | Low | New API endpoint, inline edit in `ConversationList.tsx` |
| 10 | Permission mode selector | Low | UI dropdown per conversation, pass to `engine.ts` |
| 11 | Memory viewer page | Medium | New `#/memory` route and page to browse/search/delete memories |

### Phase 2C: Reliability & Polish

| # | Item | Effort | Files |
|---|------|--------|-------|
| 12 | WS reconnection state sync | Medium | Server sends current query state on WS open |
| 13 | DB query tests | Medium | New test files with bun:test |
| 14 | `@bryanluketan/ui` integration | Medium | Replace raw HTML elements with ui components |

### Not Planned (Deliberately)

- Terminal mode — ttyd already exists at `/terminal`
- File browser — Claude Code has file tools
- Discord/Slack — not needed for single-user
- PWA — always same URL, same device
- Multi-user auth — personal VM
- V2 SDK migration — wait for it to stabilize

---

## Principles

1. **Ship what's useful, skip what's cool.** Every feature must solve a real problem Bryan has encountered.
2. **Don't duplicate what exists.** ttyd, Claude Code CLI, and Caddy already handle terminal, AI tools, and TLS.
3. **Memory is the moat.** The thing that makes Nexia worth using over raw Claude Code is that it remembers. Invest here.
4. **Self-host development ASAP.** The sooner Nexia can reliably develop itself, the faster the feedback loop.
