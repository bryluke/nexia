export function HelpPage() {
  return (
    <div class="help-page">
      <h1>Nexia v2</h1>
      <p class="help-subtitle">
        Dev machine management platform. Wraps Claude Code via the Agent SDK.
      </p>

      <section class="help-section">
        <h2>Chat</h2>
        <p>
          The primary interface. Each conversation runs a Claude Code instance
          scoped to a working directory.
        </p>
        <dl class="help-list">
          <dt>New conversation</dt>
          <dd>
            Click <strong>+ New</strong> or press <kbd>Ctrl+N</kbd>. Pick a
            project directory — this sets the working directory for Claude Code,
            so it sees the project's CLAUDE.md and runs commands in the right
            place.
          </dd>

          <dt>Sending messages</dt>
          <dd>
            Type in the input and press <kbd>Enter</kbd> to send.{" "}
            <kbd>Shift+Enter</kbd> for newlines.
          </dd>

          <dt>Queueing follow-ups</dt>
          <dd>
            While a query is running, you can still type and send. Messages get
            queued (up to 20) and auto-process sequentially. Queued messages
            show with a dashed border. Use the <strong>+</strong> button or
            press Enter to queue.
          </dd>

          <dt>Stopping a query</dt>
          <dd>
            Click the stop button or press <kbd>Esc</kbd> to interrupt.
          </dd>

          <dt>Permission prompts</dt>
          <dd>
            When Claude wants to run a bash command or other restricted tool,
            a permission card appears. Click <strong>Approve</strong> or{" "}
            <strong>Deny</strong>. The permission mode (top bar dropdown)
            controls what needs approval:
          </dd>
          <dd class="help-indent">
            <strong>Accept Edits</strong> (default) — file edits auto-approved,
            bash needs approval.
          </dd>
          <dd class="help-indent">
            <strong>Ask All</strong> — every tool needs approval.
          </dd>
          <dd class="help-indent">
            <strong>Bypass All</strong> — everything auto-approved. Use with
            care.
          </dd>

          <dt>Tool cards</dt>
          <dd>
            Tool uses (Read, Edit, Bash, etc.) appear as cards in the message.
            Consecutive tools are grouped into a collapsible summary. Click to
            expand and see individual tool inputs/results.
          </dd>

          <dt>Renaming conversations</dt>
          <dd>
            Double-click a conversation title in the sidebar to rename it.
          </dd>

          <dt>Searching conversations</dt>
          <dd>
            Use the search box at the top of the conversation list. Filters by
            title and working directory.
          </dd>

          <dt>Archiving</dt>
          <dd>
            Click <strong>Archive</strong> in the top bar when a conversation is
            done. This cleans up the Claude session files and generates a
            summary. Archived conversations also extract facts, decisions, and
            todos into the memory system.
          </dd>
        </dl>
      </section>

      <section class="help-section">
        <h2>Dashboard</h2>
        <p>
          Shows machine state: hostname, uptime, memory/disk usage, load
          average, and service status (Caddy, Nexia, Docker, SSH). Click
          refresh to update.
        </p>
      </section>

      <section class="help-section">
        <h2>Memory</h2>
        <p>
          Nexia extracts knowledge from archived conversations into a
          searchable memory system. Memories are categorized as:
        </p>
        <ul class="help-kinds">
          <li><span class="help-kind-dot" style="background: var(--nx-success)" />
            <strong>Facts</strong> — concrete things learned (file paths, configs, patterns)</li>
          <li><span class="help-kind-dot" style="background: var(--nx-warning)" />
            <strong>Decisions</strong> — choices made with reasoning</li>
          <li><span class="help-kind-dot" style="background: #c084fc" />
            <strong>Todos</strong> — action items mentioned but not completed</li>
          <li><span class="help-kind-dot" style="background: var(--nx-accent-light)" />
            <strong>Summaries</strong> — conversation overviews</li>
        </ul>
        <p>
          Memories are automatically recalled and injected into the system
          prompt when you start a new message, based on keyword matching.
          You can search, filter by kind, and delete entries from the Memory
          page.
        </p>
      </section>

      <section class="help-section">
        <h2>Keyboard Shortcuts</h2>
        <table class="help-shortcuts">
          <tbody>
            <tr><td><kbd>Ctrl+N</kbd></td><td>New conversation</td></tr>
            <tr><td><kbd>Enter</kbd></td><td>Send message / queue follow-up</td></tr>
            <tr><td><kbd>Shift+Enter</kbd></td><td>Newline in input</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Stop query / close picker</td></tr>
          </tbody>
        </table>
      </section>

      <section class="help-section">
        <h2>How It Works</h2>
        <p>
          Nexia wraps the <strong>Claude Agent SDK</strong> — each message
          spawns a Claude Code subprocess with full tool access (file ops, bash,
          search, subagents). Sessions persist via JSONL files, and conversations
          resume where they left off.
        </p>
        <p>
          The connection status dot in the nav bar shows WebSocket state.
          Green = connected, red = reconnecting (auto-retries with backoff).
        </p>
      </section>

      <section class="help-section help-meta">
        <p>
          Built by Bryan Luke Tan.
          Source at <code>~/projects/nexia/</code>.
          Old prototype on the <code>v1-archive</code> branch.
        </p>
      </section>
    </div>
  );
}
