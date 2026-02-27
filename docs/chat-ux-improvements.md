# Chat UX Improvements

Tracking polish work to bring Nexia's chat experience closer to Claude Code parity.

## Phase 1: Rough Edges (Completed)

- [x] **Extract shared `summarizeToolInput`** — deduplicated from ToolUseCard and PermissionCard into `utils/summarize-tool-input.ts`
- [x] **Error message styling** — error messages now render with red border/background and an error icon
- [x] **Add logout button** — sidebar footer with log out action
- [x] **Sidebar collapsible on desktop** — sidebar toggles open/closed on all screen sizes; hamburger visible on desktop
- [x] **Sidebar loading state** — spinner shown when conversations are loading
- [x] **Delete confirmation** — inline "Delete / Cancel" buttons instead of immediate deletion
- [x] **Clear activeQuery on disconnect** — stop button resets when WebSocket connection drops

### Previously completed

- [x] Copy button on code blocks
- [x] Copy button on messages
- [x] Cost/duration display
- [x] Textarea auto-grow fallback
- [x] Flat message layout
- [x] Conversation title auto-generation
- [x] Message timestamps
- [x] Keyboard shortcuts

## Phase 2: Project/Directory Awareness (Completed)

- [x] **Backend: Accept `cwd` in conversation creation** — `POST /api/conversations` accepts optional `{ cwd }` JSON body
- [x] **Backend: Filesystem listing API** — `GET /api/filesystem/list?path=` returns directory entries (directories only, no dotfiles, restricted to home dir)
- [x] **Backend: Inject CLAUDE.md from project directory** — reads `CLAUDE.md` from conversation's `cwd` and appends to system prompt
- [x] **Frontend: `createConversation` accepts cwd** — sends JSON body with cwd to backend
- [x] **Frontend: DirectoryPicker component** — modal with breadcrumb navigation, folder list, select button
- [x] **Frontend: Wire picker into conversation creation** — "New" button opens picker; selection creates conversation with chosen directory
- [x] **Frontend: Breadcrumbs in topbar** — shows abbreviated cwd path under conversation title
- [x] **Frontend: Directory in sidebar items** — shows abbreviated cwd path under each conversation's date
