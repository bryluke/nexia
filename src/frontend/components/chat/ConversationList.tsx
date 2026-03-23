import { useState, useMemo } from "preact/hooks";
import type { Conversation } from "../../../shared/types.ts";
import { abbreviateCwd } from "../../lib/formatters.ts";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  loading: boolean;
  open?: boolean;
  onClose?: () => void;
}

function ConvItem({
  conv,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);
  const isArchived = conv.status === "archived";

  const handleRenameSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conv.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      class={`conv-item${active ? " active" : ""}`}
      onClick={onSelect}
    >
      <div class="conv-item-content">
        <div class="conv-item-title-row">
          {isArchived && (
            <span class="conv-archive-icon" title="Archived">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
              </svg>
            </span>
          )}
          {editing ? (
            <input
              class="conv-rename-input"
              value={editTitle}
              onInput={(e) => setEditTitle((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setEditing(false);
              }}
              onBlur={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
              autofocus
            />
          ) : (
            <span
              class={`conv-title${isArchived ? " archived" : ""}`}
              onDblClick={(e) => {
                e.stopPropagation();
                setEditTitle(conv.title);
                setEditing(true);
              }}
              title="Double-click to rename"
            >
              {conv.title}
            </span>
          )}
        </div>
        {conv.cwd && (
          <div class="conv-cwd">{abbreviateCwd(conv.cwd)}</div>
        )}
        <div class="conv-date">
          {new Date(conv.updated_at).toLocaleDateString()}
        </div>
      </div>
      {confirmDelete ? (
        <div class="conv-delete-confirm" onClick={(e) => e.stopPropagation()}>
          <button
            class="conv-confirm-btn conv-confirm-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            Delete
          </button>
          <button
            class="conv-confirm-btn conv-confirm-cancel"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          class="conv-delete"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  loading,
  open,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.cwd.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  return (
    <div class={`conv-list${open ? " open" : ""}`}>
      <div class="conv-list-header">
        <span class="conv-list-title">Conversations</span>
        <button class="btn-new" onClick={onCreate}>
          + New
        </button>
      </div>
      <div class="conv-search-wrap">
        <input
          type="text"
          class="conv-search"
          placeholder="Search..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        {search && (
          <button class="conv-search-clear" onClick={() => setSearch("")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div class="conv-list-items">
        {loading && conversations.length === 0 && (
          <div class="conv-list-loading">
            <span class="sidebar-spinner" />
            Loading...
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <div class="conv-list-empty">No conversations yet</div>
        )}
        {!loading && conversations.length > 0 && filtered.length === 0 && (
          <div class="conv-list-empty">No matches</div>
        )}
        {filtered.map((conv) => (
          <ConvItem
            key={conv.id}
            conv={conv}
            active={conv.id === activeId}
            onSelect={() => onSelect(conv.id)}
            onDelete={() => onDelete(conv.id)}
            onRename={(title) => onRename(conv.id, title)}
          />
        ))}
      </div>
    </div>
  );
}
