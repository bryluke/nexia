# Project/Directory Awareness

## Vision

Each Nexia conversation is scoped to a working directory, mirroring how Claude Code operates when launched from a specific project folder. This means the AI agent sees the right project context (CLAUDE.md, directory structure, etc.) and can work on any project from the browser.

## Architecture

### Data Flow

1. **User clicks "+ New"** in sidebar
2. **DirectoryPicker modal** opens, showing the home directory tree
3. User navigates to desired project directory and clicks "Select"
4. **Frontend** calls `POST /api/conversations` with `{ cwd: "/home/bryan/projects/foo" }`
5. **Backend** validates the directory exists, creates conversation with `cwd` column set
6. On first message, **SDK manager** reads `CLAUDE.md` from `conversation.cwd` and injects it into the system prompt
7. The Claude agent runs with `cwd` set to the conversation's working directory

### Key Components

| Component | File | Role |
|-----------|------|------|
| Filesystem API | `src/api/filesystem.ts` | Lists directories within home tree |
| Conversation creation | `src/api/conversations.ts` | Accepts optional `cwd` in JSON body |
| SDK system prompt | `src/sdk/manager.ts` | Reads CLAUDE.md, injects cwd context |
| DirectoryPicker | `src/frontend/components/DirectoryPicker.tsx` | Modal UI for directory selection |
| useFilesystem | `src/frontend/hooks/useFilesystem.ts` | Hook wrapping filesystem API |
| useConversations | `src/frontend/hooks/useConversations.ts` | `createConversation(cwd?)` |

### Security

- Filesystem API restricts listing to the home directory tree (`homedir()`)
- Dotfiles are hidden from listings
- Only directories are shown (no file browsing)
- All endpoints require auth token

### Database

The `conversations` table already has a `cwd TEXT NOT NULL` column with default `homedir()`. No schema migration needed.

### System Prompt Injection

When a conversation has a `cwd`, the SDK manager:

1. Builds a base system prompt with Nexia context (including the working directory path)
2. Checks if `CLAUDE.md` exists at `{cwd}/CLAUDE.md`
3. If found, appends its full contents under a `# Project CLAUDE.md` heading

This means project-specific instructions, conventions, and context are automatically available to the agent.

## UI Surfaces

- **Sidebar**: Each conversation shows its abbreviated cwd (e.g., `~/projects/nexia`)
- **Topbar**: Active conversation shows breadcrumb path below the title
- **DirectoryPicker**: Full modal with breadcrumb navigation, folder icons, and selection

## Future Ideas

- Quick-switch to recently used directories
- Detect git repos and show branch info
- Per-project conversation grouping
- Auto-detect CLAUDE.md changes and re-inject on next message
