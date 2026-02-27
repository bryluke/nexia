import { useState } from "preact/hooks";
import type { Conversation } from "../types.ts";

function abbreviateCwd(cwd: string | undefined): string | null {
  if (!cwd) return null;
  const match = cwd.match(/^\/home\/[^/]+/);
  if (match) return "~" + cwd.slice(match[0].length);
  return cwd;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
  loading?: boolean;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onLogout,
  loading,
  open,
  onClose,
}: Props) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div class="sidebar-overlay" onClick={onClose} />
      )}

      <aside class={`sidebar${open ? " open" : ""}`}>
        {/* Header */}
        <div class="sidebar-header">
          <h1>Nexia</h1>
          <button onClick={onCreate} class="btn btn-new">
            + New
          </button>
        </div>

        {/* Conversation list */}
        <div class="sidebar-list">
          {loading && conversations.length === 0 && (
            <div class="sidebar-loading">
              <span class="sidebar-spinner" />
              Loading...
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <p class="sidebar-empty">No conversations yet</p>
          )}
          {conversations.map((conv) => {
            const isArchived = conv.status === "archived";
            const isDeleting = pendingDeleteId === conv.id;
            return (
              <div
                key={conv.id}
                class={`conv-item${conv.id === activeId ? " active" : ""}`}
                onClick={() => {
                  onSelect(conv.id);
                  onClose();
                }}
              >
                <div class="conv-item-content">
                  <div class="conv-item-title-row">
                    {isArchived && (
                      <span class="conv-archive-icon" title="Archived">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                        </svg>
                      </span>
                    )}
                    <p class={`conv-title${isArchived ? " archived" : ""}`}>
                      {conv.title}
                    </p>
                  </div>
                  <p class="conv-date">
                    {new Date(conv.updated_at + "Z").toLocaleDateString()}
                  </p>
                  {conv.cwd && (
                    <p class="conv-cwd">{abbreviateCwd(conv.cwd)}</p>
                  )}
                </div>
                {isDeleting ? (
                  <div class="conv-delete-confirm" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setPendingDeleteId(null);
                        onDelete(conv.id);
                      }}
                      class="conv-confirm-btn conv-confirm-delete"
                      title="Confirm delete"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(null)}
                      class="conv-confirm-btn conv-confirm-cancel"
                      title="Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteId(conv.id);
                    }}
                    class="conv-delete"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div class="sidebar-footer">
          <button onClick={onLogout} class="btn-logout" title="Log out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
