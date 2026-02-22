# Nexia

Personal chat agent for VM control. Wraps Claude Agent SDK with a web UI.

## Running

```sh
bun run dev      # dev mode with HMR
bun run start    # production
```

Runs on `localhost:5101`. For production, put behind a reverse proxy (Caddy, nginx) with TLS.

## Stack

- **Runtime**: Bun (not Node.js)
- **Server**: `Bun.serve()` — routes, WebSocket, HTML imports
- **Frontend**: Preact + Tailwind CSS (via bun-plugin-tailwind)
- **Database**: `bun:sqlite` (conversation metadata + message history)
- **AI**: `@anthropic-ai/claude-agent-sdk` (message history managed by SDK)
- **Auth**: Bearer token from `.env`

## Conventions

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Bun automatically loads `.env`, so don't use dotenv.

### APIs

- `Bun.serve()` for HTTP + WebSocket. Don't use `express` or `elysia`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- Prefer `Bun.file` over `node:fs` readFile/writeFile.
- Use HTML imports with `Bun.serve()`. Don't use `vite`.

## File Structure

```
src/
  server.ts              # Bun.serve() entry point
  db/index.ts            # SQLite init, schema, prepared statements
  api/auth.ts            # Token validation
  api/conversations.ts   # REST route handlers
  ws/types.ts            # WebSocket message types
  ws/handler.ts          # WebSocket message dispatch
  sdk/manager.ts         # Claude Agent SDK bridge, query lifecycle
  shared/content-blocks.ts # Content block types (shared server+frontend)

  frontend/
    main.tsx             # Preact entry
    App.tsx              # Root layout (sidebar + chat)
    types.ts             # Shared frontend types
    styles/global.css    # Tailwind
    components/          # Sidebar, ChatView, MessageBubble, StatusIndicator, ThinkingBlock, ToolUseCard
    hooks/               # useWebSocket, useConversations, useChat

public/
  index.html             # App shell (HTML import)

data/                    # SQLite DB (gitignored)
```

## WebSocket Protocol

Client → Server: `{ type: 'chat' | 'interrupt' | 'archive', conversationId, message? }`
Server → Client: `{ type: 'text_delta' | 'assistant_message' | 'result' | 'status' | 'error' | 'archived' | 'summary_ready' | 'thinking_delta' | 'tool_use_start' | 'tool_use_result', conversationId, ... }`

## REST API

All require `Authorization: Bearer <token>` except health.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |
| GET | `/api/conversations/:id/messages` | Get message history |

## Future Considerations

- **Soft delete / trash** — currently delete is permanent (removes from SQLite, no undo). Low priority since this is a single-user personal app, but worth considering if usage patterns change.
- **Conversation search/rename** — not implemented.
- **Portability script** — ~~setup.sh for deploying to new machines.~~ Done.
