import type { Conversation } from "../types.ts";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  open,
  onClose,
}: Props) {
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
          {conversations.length === 0 && (
            <p class="sidebar-empty">No conversations yet</p>
          )}
          {conversations.map((conv) => {
            const isArchived = conv.status === "archived";
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
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  class="conv-delete"
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
