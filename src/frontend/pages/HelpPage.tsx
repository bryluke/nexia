import { Page } from "../components/ui/Page.tsx";
import { Section } from "../components/ui/Section.tsx";
import { StatusDot } from "../components/ui/StatusDot.tsx";

export function HelpPage() {
  return (
    <Page title="Nexia v2" subtitle="Dev machine management platform. Wraps Claude Code via the Agent SDK.">
      <Section title="Chat">
        <div class="ui-prose">
          <p>
            The primary interface. Each conversation runs a Claude Code instance
            scoped to a working directory.
          </p>
        </div>
        <dl class="ui-dl">
          <dt>New conversation</dt>
          <dd>
            Click <strong>+ New</strong> or press <kbd>Ctrl+N</kbd>. Pick a
            project directory — this sets the working directory for Claude Code,
            so it sees the project's CLAUDE.md and runs commands in the right place.
          </dd>

          <dt>Sending messages</dt>
          <dd>
            Type in the input and press <kbd>Enter</kbd> to send.{" "}
            <kbd>Shift+Enter</kbd> for newlines.
          </dd>

          <dt>Queueing follow-ups</dt>
          <dd>
            While a query is running, you can still type and send. Messages get
            queued (up to 20) and auto-process sequentially. Queued messages show
            with a dashed border. Use the <strong>+</strong> button or press Enter.
          </dd>

          <dt>Stopping a query</dt>
          <dd>
            Click the stop button or press <kbd>Esc</kbd> to interrupt.
          </dd>

          <dt>Permission prompts</dt>
          <dd>
            When Claude wants to run a bash command or other restricted tool, a
            permission card appears. Click <strong>Approve</strong> or{" "}
            <strong>Deny</strong>. The permission mode (top bar dropdown) controls
            what needs approval:
          </dd>
          <dd class="indent">
            <strong>Accept Edits</strong> (default) — file edits auto-approved,
            bash needs approval.
          </dd>
          <dd class="indent">
            <strong>Ask All</strong> — every tool needs approval.
          </dd>
          <dd class="indent">
            <strong>Bypass All</strong> — everything auto-approved. Use with care.
          </dd>

          <dt>Tool cards</dt>
          <dd>
            Tool uses (Read, Edit, Bash, etc.) appear as cards in the message.
            Consecutive tools are grouped into a collapsible summary. Click to
            expand and see individual tool inputs/results.
          </dd>

          <dt>Renaming conversations</dt>
          <dd>Double-click a conversation title in the sidebar to rename it.</dd>

          <dt>Searching conversations</dt>
          <dd>
            Use the search box at the top of the conversation list. Filters by
            title and working directory.
          </dd>

          <dt>Archiving</dt>
          <dd>
            Click <strong>Archive</strong> in the top bar when a conversation is
            done. This generates a summary and extracts facts, decisions, and
            todos into the memory system.
          </dd>
        </dl>
      </Section>

      <Section title="Dashboard">
        <div class="ui-prose">
          <p>
            Shows machine state: hostname, uptime, memory/disk usage, load average,
            and service status (Caddy, Nexia, Docker, SSH). Click refresh to update.
          </p>
        </div>
      </Section>

      <Section title="Memory">
        <div class="ui-prose">
          <p>
            Nexia extracts knowledge from archived conversations into a searchable
            memory system. Memories are categorized as:
          </p>
        </div>
        <ul class="ui-dot-list">
          <li><StatusDot color="var(--nx-success)" /> <strong>Facts</strong> — concrete things learned (file paths, configs, patterns)</li>
          <li><StatusDot color="var(--nx-warning)" /> <strong>Decisions</strong> — choices made with reasoning</li>
          <li><StatusDot color="#c084fc" /> <strong>Todos</strong> — action items mentioned but not completed</li>
          <li><StatusDot color="var(--nx-accent-light)" /> <strong>Summaries</strong> — conversation overviews</li>
        </ul>
        <div class="ui-prose">
          <p>
            Memories are automatically recalled and injected into the system prompt
            when you start a new message, based on keyword matching. You can search,
            filter by kind, and delete entries from the Memory page.
          </p>
        </div>
      </Section>

      <Section title="Keyboard Shortcuts">
        <table class="ui-table">
          <tbody>
            <tr><td><kbd>Ctrl+N</kbd></td><td>New conversation</td></tr>
            <tr><td><kbd>Enter</kbd></td><td>Send message / queue follow-up</td></tr>
            <tr><td><kbd>Shift+Enter</kbd></td><td>Newline in input</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Stop query / close picker</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="How It Works">
        <div class="ui-prose">
          <p>
            Nexia wraps the <strong>Claude Agent SDK</strong> — each message spawns
            a Claude Code subprocess with full tool access (file ops, bash, search,
            subagents). Sessions persist via JSONL files, and conversations resume
            where they left off.
          </p>
          <p>
            The connection status dot in the nav bar shows WebSocket state.{" "}
            <StatusDot color="var(--nx-success)" /> connected,{" "}
            <StatusDot color="var(--nx-error)" pulse /> reconnecting (auto-retries
            with backoff).
          </p>
        </div>
      </Section>

      <div class="ui-section" style="border-top: 1px solid var(--nx-border); padding-top: 1rem;">
        <div class="ui-prose">
          <p style="font-size: 0.75rem; color: var(--nx-text-dim)">
            Built by Bryan Luke Tan. Source at <code>~/projects/nexia/</code>.
            Old prototype on the <code>v1-archive</code> branch.
          </p>
        </div>
      </div>
    </Page>
  );
}
