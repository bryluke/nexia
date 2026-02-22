# Claude Agent SDK Internals

Working notes from integrating `@anthropic-ai/claude-agent-sdk` (v0.2.50) into Nexia.
The SDK is minified and undocumented beyond its TypeScript declarations, so many of
these findings come from reading the compiled source directly.

## Architecture: SDK ↔ CLI Subprocess

The SDK does **not** call the Anthropic API directly. It spawns a **Claude Code CLI
subprocess** (`cli.js`) and communicates with it over stdin/stdout using newline-
delimited JSON messages.

```
Your app (Bun/Node)
  → sdk.mjs (wrapper)
    → spawns cli.js subprocess
      ← stdout: stream-json messages (stream_event, assistant, tool_progress, result, etc.)
      → stdin:  user messages, control_response messages
```

Key implication: callbacks like `canUseTool` run in **your** process, but their return
values are serialized and sent to the subprocess, which validates them with its own
Zod schemas. Mismatches between the SDK's TypeScript types and the CLI's Zod schemas
cause runtime errors inside the subprocess.

### Message Types on the Wire

The subprocess emits structured JSON messages, one per line. The SDK's `query()` async
iterator parses these and re-emits them as typed SDK messages:

| CLI stdout message      | SDK emitted type     | Notes                            |
|-------------------------|----------------------|----------------------------------|
| `message_start`         | `stream_event`       | Wrapped in stream_event          |
| `content_block_start`   | `stream_event`       | block.type: text/thinking/tool_use |
| `content_block_delta`   | `stream_event`       | delta.type: text_delta/thinking_delta/input_json_delta |
| `content_block_stop`    | `stream_event`       | End of a content block           |
| `message_delta`         | `stream_event`       | Usage info, stop_reason          |
| `message_stop`          | `stream_event`       | End of message                   |
| (full assistant turn)   | `assistant`          | Complete message with all blocks |
| (tool running)          | `tool_progress`      | Has tool_name, tool_use_id       |
| (tool summary)          | `tool_use_summary`   | Has preceding_tool_use_ids       |
| (query done)            | `result`             | subtype: success/error, costs    |
| `control_request`       | (intercepted by SDK) | Permission prompts, hook callbacks |

### Control Protocol

Bidirectional control messages handle permission prompts, hooks, and MCP:

```
CLI → SDK:  { type: "control_request",  request_id: "...", request: { subtype: "can_use_tool", ... } }
SDK → CLI:  { type: "control_response", response: { subtype: "success", request_id: "...", response: { ... } } }
```

The SDK intercepts `control_request` messages before they reach your async iterator.
When a `can_use_tool` request arrives, the SDK calls your `canUseTool` callback,
wraps the result, and writes a `control_response` back to the subprocess's stdin.

## canUseTool Callback

### Signature (from sdk.d.ts)

```ts
type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    suggestions?: PermissionUpdate[];
    blockedPath?: string;
    decisionReason?: string;
    toolUseID: string;
    agentID?: string;
  }
) => Promise<PermissionResult>;
```

### PermissionResult Type (from sdk.d.ts)

```ts
type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown>; updatedPermissions?: PermissionUpdate[]; toolUseID?: string; }
  | { behavior: 'deny';  message: string; interrupt?: boolean; toolUseID?: string; };
```

### How the SDK Processes It

From `sdk.mjs` (deminified):

```js
async processControlRequest(request, signal) {
  if (request.request.subtype === "can_use_tool") {
    return {
      ...await this.canUseTool(
        request.request.tool_name,
        request.request.input,
        {
          signal,
          suggestions: request.request.permission_suggestions,
          blockedPath: request.request.blocked_path,
          decisionReason: request.request.decision_reason,
          toolUseID: request.request.tool_use_id,
          agentID: request.request.agent_id,
        }
      ),
      toolUseID: request.request.tool_use_id,  // always overwritten
    };
  }
  // ... hook_callback, mcp_message handlers
}
```

The SDK spreads your callback result and overwrites `toolUseID`, then wraps it in:

```json
{
  "type": "control_response",
  "response": {
    "subtype": "success",
    "request_id": "...",
    "response": { "behavior": "allow", "updatedInput": {...}, "toolUseID": "..." }
  }
}
```

### CLI-side Validation (the Zod trap)

The subprocess validates the `response` field with a Zod schema. From `cli.js`
(deminified, SDK v0.2.50):

```js
// Schema for "allow" result
const allowSchema = z.object({
  behavior: z.literal("allow"),
  updatedInput: z.record(z.string(), z.unknown()),       // NOT .optional()!
  updatedPermissions: z.array(permissionUpdateSchema).optional(),
  toolUseID: z.string().optional(),
});

// Schema for "deny" result
const denySchema = z.object({
  behavior: z.literal("deny"),
  message: z.string(),
  interrupt: z.boolean().optional(),
  toolUseID: z.string().optional(),
});

const permissionResultSchema = z.union([allowSchema, denySchema]);
```

**Critical finding:** `updatedInput` is **required** in the Zod schema even though the
TypeScript type declares it as optional (`updatedInput?: Record<string, unknown>`).
This is a bug in the SDK — the TS types and runtime validation disagree.

If you return `{ behavior: "allow" }` without `updatedInput`, the CLI's Zod parse
throws:

```
ZodError: Expected record, received undefined
```

The error surfaces inside the subprocess and gets fed back to the Claude agent as a
tool execution error. Your server logs won't show it — the inner Claude just sees
the tools failing and reports it to the user.

### How the CLI Uses updatedInput

```js
if (result.updatedInput !== void 0) {
  toolInput = result.updatedInput;  // replaces original input!
}
```

So `updatedInput: {}` would **wipe the tool's input**. You must pass the original
input back when approving without modification.

### Correct Usage

```ts
canUseTool: async (toolName, input, options) => {
  const approved = await askUser(toolName, input);

  if (approved) {
    // MUST include updatedInput (Zod requires it).
    // Pass original input to keep tool behavior unchanged.
    return { behavior: "allow", updatedInput: input };
  } else {
    return { behavior: "deny", message: "User denied permission" };
  }
}
```

### When canUseTool Fires

The callback fires based on `permissionMode`:

| Mode               | Behavior                                              |
|--------------------|-------------------------------------------------------|
| `default`          | All tool categories go through canUseTool              |
| `acceptEdits`      | File edits auto-approved; Bash/others go through callback |
| `bypassPermissions`| Nothing goes through callback (everything auto-approved) |

Nexia uses `default` so every tool execution shows a permission card in the UI.

## Permission Flow in Nexia

```
1. SDK subprocess wants to run a tool
2. Sends control_request { subtype: "can_use_tool", tool_name, input, tool_use_id }
3. SDK calls our canUseTool callback
4. We send { type: "permission_request", permissionId, toolName, input } via WS to browser
5. Browser renders PermissionCard with Approve/Deny buttons
6. User clicks → browser sends { type: "permission_response", permissionId, approved }
7. WS handler calls resolvePermission() → resolves the Promise
8. SDK wraps result in control_response → writes to subprocess stdin
9. CLI validates with Zod, proceeds or denies the tool
```

State is tracked in `pendingPermissions` (Map keyed by permissionId). On query end,
any unresolved permissions are auto-denied so Promises don't leak.

## Debugging Tips

### Seeing SDK Messages

`manager.ts` logs every SDK message type:
```
[SDK] stream_event → content_block_start
[SDK] stream_event → content_block_delta (text_delta)
[SDK] assistant
[SDK] tool_progress
[SDK] result
```

Check with: `journalctl -u nexia -f`

### Subprocess Errors Are Invisible

Errors inside the CLI subprocess (like Zod validation failures) don't appear in
Nexia's server logs. They get fed back to the inner Claude agent as tool errors.
The agent then tells the user something like "the tool failed with a ZodError."

To debug these, you often need to:
1. Read the inner Claude's response for clues about the error
2. Dig into the minified `cli.js` to find the actual Zod schemas
3. Compare them against the TypeScript declarations in `sdk.d.ts`

### Reading Minified SDK Source

The SDK source is at:
- `node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs` — wrapper (67 lines, minified)
- `node_modules/@anthropic-ai/claude-agent-sdk/cli.js` — subprocess (huge, minified)
- `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` — TypeScript types (trustworthy for signatures, not for optionality)

Use Python to search the minified code:
```python
python3 -c "
with open('node_modules/@anthropic-ai/claude-agent-sdk/cli.js') as f:
    src = f.read()

import re
for m in re.finditer('can_use_tool', src):
    start = max(0, m.start() - 300)
    end = min(len(src), m.end() + 500)
    print(src[start:end])
    print()
"
```

### Key Identifiers in Minified Code (v0.2.50)

| Minified name | What it is                              |
|---------------|-----------------------------------------|
| `H4`          | Query orchestrator class                |
| `al6`         | PermissionResult Zod schema (`z.union([yHz, RHz])`) |
| `yHz`         | Allow variant schema                    |
| `RHz`         | Deny variant schema                     |
| `b4`          | Zod (`z`) import                        |
| `ol6`         | Stdin/stdout transport class            |
| `U0`          | `canUseTool` callback (destructured)    |
| `Nk1`         | PermissionUpdate Zod schema             |

These names change between SDK versions.

## Known SDK Quirks (v0.2.50)

1. **updatedInput is required at runtime, optional in types.** Always pass it for
   `behavior: "allow"`. Use the original input if you don't want to modify it.

2. **toolUseID is overwritten by the SDK.** The SDK's `processControlRequest` always
   sets `toolUseID` from the request, regardless of what your callback returns.

3. **tool_progress fires before content_block_stop.** You may receive `tool_progress`
   events for a tool before the streaming `content_block_stop` that carries the
   parsed input JSON. Build UI to handle both orderings.

4. **tool_use_summary.preceding_tool_use_ids may be absent.** Fall back to resolving
   the most recent pending tool if the array isn't present.

5. **Subprocess stderr goes to your stderr callback** but errors from Zod validation
   inside the permission flow do NOT — they get swallowed and turned into tool errors
   visible only to the inner Claude agent.

## Future Work

- **AskUserQuestion UI** — The SDK handles `AskUserQuestion` as an internal tool.
  Getting user answers back requires hooking into the tool execution layer or providing
  a custom tool implementation. Needs deeper SDK investigation.

- **Permission persistence** — The `updatedPermissions` field in PermissionResult
  allows persisting "always allow" rules for the session. Could add a "Always allow
  this tool" checkbox to PermissionCard.

- **SDK version tracking** — Minified identifiers change between versions. When
  upgrading the SDK, re-verify the Zod schemas haven't changed.
