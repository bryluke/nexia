# Nexia v2 — Roadmap

Written: 2026-03-22
Updated: 2026-03-23
Status: Living document.

---

## Completed

### Phase 1: v2 Rebuild (2026-03-22)

Full rewrite from scratch. Old prototype archived to `v1-archive` branch.

- Decomposed architecture (engine, session-store, stream-parser, system-prompt)
- SQLite with conversations, messages, memory tables + migration runner
- Top nav + hash router, vanilla CSS with `--nx-` tokens
- Chat with streaming, tool cards, permission cards, thinking blocks
- Machine dashboard with system info
- Memory system with summarization on archive

### Phase 2A: Chat Polish (2026-03-22)

| # | Item | Status |
|---|------|--------|
| 1 | Tool grouping (collapsible ToolGroup for consecutive tools) | Done |
| 2 | Message queue (up to 20 queued, auto-process on result) | Done |
| 3 | Error recovery (catch in WS handler, global unhandled rejection) | Done |
| 4 | Directory picker for new conversations | Done |
| 5 | Context compaction indicator (scissors divider) | Done |
| 6 | Model badge on responses (Opus/Sonnet/Haiku pill) | Done |

Also done by Nexia-via-Nexia session:
- Mobile responsive sidebar (slide-out with overlay)
- Scroll-to-bottom button
- Topbar tooltip (hover to see full title/cwd)
- Tool result race fix (resolvedToolsRef)
- `user` message type handling for tool_result

### Phase 2B: Conversations & Memory (2026-03-23)

| # | Item | Status |
|---|------|--------|
| 8 | Conversation search (client-side filter by title/cwd) | Done |
| 9 | Conversation rename (double-click inline edit + PATCH API) | Done |
| 10 | Permission mode selector (per-conversation dropdown, DB column) | Done |
| 11 | Memory viewer page (#/memory route, filter/search/delete) | Done |

---

## Up Next

### Phase 2C: Reliability & Polish

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 7 | Turn-based pagination | Medium | Load last 3 turns, paginate backward. Deferred from 2B. |
| 12 | WS reconnection state sync | Medium | Server sends current query state on WS open |
| 13 | DB query tests | Medium | bun:test for queries, migrations, API endpoints |
| 14 | `@bryanluketan/ui` integration | Medium | Replace raw HTML elements with ui components |

### Phase 3: Ideas (from usage)

_Add items here as friction points and ideas emerge from daily use._

- Conversation export (markdown/JSON)
- Memory tagging (add/edit tags from the viewer)
- Conversation pinning (pin important conversations to top)
- Cost tracking dashboard (aggregate spend across conversations)
- Keyboard shortcuts legend in nav

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
