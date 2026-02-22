# Nexia

A self-hosted web UI for Claude that gives you full Claude Code capabilities in the browser.

Nexia wraps the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk) to let you interact with Claude through a chat interface while it has access to your machine — file operations, bash commands, code search, subagents, and everything else Claude Code can do. Think of it as a browser-based Claude Code with persistent conversation history.

## Why

Claude Code is powerful but terminal-bound. Nexia puts the same capabilities behind a web interface you can access from anywhere — a browser tab on your laptop, your phone, a tablet. Point it at a dev VM and you have a remote AI-powered development environment you can talk to.

It's built for single-user, self-hosted use. Deploy it on your own machine, your own VM, your own terms.

## How It Works

Nexia runs as a local server on your machine — like any other dev tool (a database, a local API, etc.). When you start it, it listens on `localhost:5101`, which means only your machine can access it by default. You open it in your browser, but it's not "on the internet" — it's a process on your computer serving a web page to yourself.

The agent has access to your filesystem and can run commands, so **only run Nexia on machines you trust it to operate on**. It uses Claude Code's `acceptEdits` permission mode, meaning it can read/write files and run commands without asking for confirmation on each one.

If you want to access Nexia remotely (e.g. from your phone to a VM), you'd need to set up a reverse proxy with authentication and TLS — that's a separate infrastructure step and not something Nexia handles for you.

## Features

- **Full Claude Code tools** — file read/write/edit, bash, glob, grep, subagents, web search — all available through the chat UI
- **Tool call visibility** — see what Claude is doing with expandable cards showing tool inputs and results, not just status text
- **Thinking blocks** — collapsible reasoning trace when extended thinking is active
- **Streaming responses** — real-time text and tool output via WebSocket
- **Persistent conversations** — message history stored in SQLite, resumable sessions via the SDK
- **Auto-archival** — archive conversations with AI-generated summaries
- **Self-modifying** — the agent knows it's running inside Nexia and can edit its own source code

## Prerequisites

- [Bun](https://bun.sh/) — JavaScript runtime (like Node.js, but faster). Install: `curl -fsSL https://bun.sh/install | bash`
- [Claude Code CLI](https://github.com/anthropics/claude-code) — Anthropic's CLI tool. Install: `npm install -g @anthropic-ai/claude-code`. You'll need an Anthropic API key configured (`claude` should work in your terminal before Nexia will work).

## Quick Start

```sh
git clone <repo-url> && cd nexia
./setup.sh
bun run dev
```

The setup script:
1. Checks that Bun and Claude Code CLI are installed
2. Installs dependencies (`bun install`)
3. Generates a `.env` file with a random auth token

It prints the token at the end — save it, you need it to log in.

Then open `http://localhost:5101` in your browser, paste your token, and start chatting.

## Usage

```sh
bun run dev      # development (auto-reloads on code changes)
bun run start    # production (no auto-reload)
```

To stop it, hit `Ctrl+C` in the terminal where it's running.

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Bun |
| Server | `Bun.serve()` (HTTP + WebSocket) |
| Frontend | Preact |
| Database | `bun:sqlite` (SQLite) |
| AI | `@anthropic-ai/claude-agent-sdk` |
| Auth | Bearer token from `.env` |

## Project Structure

```
src/
  server.ts                 # Entry point
  db/index.ts               # SQLite schema + prepared statements
  api/                      # REST route handlers + auth
  ws/                       # WebSocket message types + dispatch
  sdk/manager.ts            # Claude Agent SDK bridge
  shared/content-blocks.ts  # Content block types (shared server+frontend)
  frontend/
    components/             # MessageBubble, ThinkingBlock, ToolUseCard, etc.
    hooks/                  # useChat, useWebSocket, useConversations
    styles/global.css       # Styles

public/index.html           # App shell
data/                       # SQLite DB (gitignored)
```

## License

MIT
