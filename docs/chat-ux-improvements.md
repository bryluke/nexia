# Chat UX Improvements

Tracking polish work to bring Nexia's chat experience closer to Claude Code parity.

## High Impact / Quick Wins

- [x] **Copy button on code blocks** — click-to-copy for syntax-highlighted code blocks
- [x] **Copy button on messages** — copy full assistant message text
- [x] **Cost/duration display** — show cost and duration from ResultMessage on the last assistant bubble
- [x] **Textarea auto-grow fallback** — JS-based resize fallback for browsers without `field-sizing: content`

## Medium Effort / Big UX Lift

- [ ] **Input history** — up/down arrow to cycle through previous messages
- [ ] **Flat message layout** — replace bubble style with full-width linear layout for assistant messages (better for code blocks and tool output)
- [ ] **Conversation title auto-generation** — auto-title from first message if not already implemented

## Polish

- [x] **Message timestamps** — relative time on all messages, extracted from DB or set at creation
- [ ] **Keyboard shortcuts** — Ctrl+N new conversation, Ctrl+L clear, etc.
- [ ] **Better empty state** — starter prompts or suggestions
