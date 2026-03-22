# Nexia v2

Modular web-based dev machine management platform. Wraps Claude Code via the Agent SDK as its execution engine, adding persistent memory, machine management, and developer-focused UX.

## Running

```sh
bun run dev      # dev mode with HMR
bun run start    # production
```

Runs on `localhost:5101`. Proxied by Caddy at `/` on the public URL.

## Stack

- **Runtime**: Bun (not Node.js)
- **Server**: `Bun.serve()` — HTTP routes, WebSocket, HTML imports
- **Frontend**: Preact + vanilla CSS with `--nx-` design tokens
- **Database**: `bun:sqlite` (WAL mode) — conversations, messages, memory
- **AI**: `@anthropic-ai/claude-agent-sdk` with `acceptEdits` permission mode
- **Auth**: Bearer token from `.env` (`NEXIA_AUTH_TOKEN`)

## Conventions

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Bun automatically loads `.env`, so don't use dotenv.

### APIs

- `Bun.serve()` for HTTP + WebSocket. Don't use `express` or `elysia`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- Prefer `Bun.file` over `node:fs` readFile/writeFile.
- Use HTML imports with `Bun.serve()`. Don't use `vite`.

## Architecture

```
src/
  server.ts              # Bun.serve() entry point
  db/
    connection.ts        # DB singleton, WAL, pragmas
    schema.ts            # CREATE TABLE IF NOT EXISTS
    migrations.ts        # Ordered migration runner
    queries/             # Prepared statements per table
  agent/
    engine.ts            # Query lifecycle (startQuery)
    session-store.ts     # Active queries, pending permissions
    stream-parser.ts     # SDK message → Nexia WS events
    system-prompt.ts     # Context injection
  api/
    auth.ts              # Token validation
    conversations.ts     # REST handlers
    messages.ts          # REST handlers
    system.ts            # Machine info
  ws/
    protocol.ts          # Client/Server message types
    handler.ts           # WS dispatch
  memory/
    recall.ts            # Search past context
    summarizer.ts        # Generate summaries + extract memories
  shared/
    types.ts             # Shared types
  frontend/
    main.tsx
    styles/global.css    # --nx- design tokens, dark theme
    app/
      App.tsx            # Root layout
      Router.tsx         # Hash-based router
    pages/
      ChatPage.tsx
      DashboardPage.tsx
    components/
      chat/              # ChatView, MessageBubble, ToolUseCard, PermissionCard, ChatInput
      layout/            # Nav, StatusBar, Shell
      dashboard/         # SystemInfo, ServiceList
    hooks/               # useWebSocket, useChat, useRouter, useSystemInfo
    lib/                 # markdown rendering, formatters
```

## WebSocket Protocol

Client → Server: `chat`, `interrupt`, `archive`, `permission_response`, `user_input_response`
Server → Client: `text_delta`, `assistant_message`, `result`, `status`, `error`, `archived`, `summary_ready`, `thinking_delta`, `tool_use_start`, `tool_use_result`, `tool_use_progress`, `permission_request`, `user_input_request`, `active_queries`

## SDK Notes

See old `docs/sdk-internals.md` (on `v1-archive` branch) for deep-dive notes. Key quirks:
- `updatedInput` is required at runtime despite TS marking it optional
- `tool_progress` fires before `content_block_stop`
- Subprocess errors can be swallowed — need explicit error handling
- Permission mode is `acceptEdits` (file edits auto-approved, bash requires approval)
