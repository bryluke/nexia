# Chat UX Improvements

Tracking polish work to bring Nexia's chat experience closer to Claude Code parity.

## High Impact / Quick Wins

- [x] **Copy button on code blocks** — click-to-copy for syntax-highlighted code blocks
- [x] **Copy button on messages** — copy full assistant message text
- [x] **Cost/duration display** — show cost and duration from ResultMessage on the last assistant bubble
- [x] **Textarea auto-grow fallback** — JS-based resize fallback for browsers without `field-sizing: content`

## Medium Effort / Big UX Lift

- ~~**Input history** — up/down arrow to cycle through previous messages~~ *(skipped — not useful in a multiline textarea)*
- [x] **Flat message layout** — full-width subtle background strip for assistant messages, user messages stay as bubbles
- [x] **Conversation title auto-generation** — already implemented in `manager.ts:275-281`, sets title from first user message

## Polish

- [x] **Message timestamps** — relative time on all messages, extracted from DB or set at creation
- [ ] **Keyboard shortcuts** — Ctrl+N new conversation, Ctrl+L clear, etc.
- ~~**Better empty state** — starter prompts or suggestions~~ *(skipped — not needed)*
