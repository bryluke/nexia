import { useState, useEffect, useCallback } from "preact/hooks";

interface MemoryItem {
  id: string;
  conversation_id: string | null;
  kind: string;
  content: string;
  tags: string | null;
  created_at: string;
}

interface Props {
  token: string;
}

const KIND_LABELS: Record<string, string> = {
  summary: "Summary",
  fact: "Fact",
  decision: "Decision",
  todo: "Todo",
};

const KIND_COLORS: Record<string, string> = {
  summary: "var(--nx-accent-light)",
  fact: "var(--nx-success)",
  decision: "var(--nx-warning)",
  todo: "#c084fc",
};

export function MemoryPage({ token }: Props) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    else if (kindFilter) params.set("kind", kindFilter);
    else params.set("limit", "100");

    const res = await fetch(`/api/memory?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMemories(await res.json());
    }
    setLoading(false);
  }, [token, search, kindFilter]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/memory/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    },
    [token]
  );

  const handleSearchSubmit = useCallback(
    (e: Event) => {
      e.preventDefault();
      setKindFilter(null);
      fetchMemories();
    },
    [fetchMemories]
  );

  return (
    <div class="memory-page">
      <div class="memory-header">
        <h1>Memory</h1>
        <span class="memory-count">{memories.length} entries</span>
      </div>

      <div class="memory-controls">
        <form class="memory-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            class="memory-search"
            placeholder="Search memories..."
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
        </form>
        <div class="memory-filters">
          <button
            class={`memory-filter${kindFilter === null && !search ? " active" : ""}`}
            onClick={() => { setKindFilter(null); setSearch(""); }}
          >
            All
          </button>
          {Object.entries(KIND_LABELS).map(([kind, label]) => (
            <button
              key={kind}
              class={`memory-filter${kindFilter === kind ? " active" : ""}`}
              onClick={() => { setKindFilter(kind); setSearch(""); }}
              style={{ "--filter-color": KIND_COLORS[kind] } as any}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div class="memory-list">
        {loading && (
          <div class="memory-loading">
            <span class="sidebar-spinner" />
            Loading...
          </div>
        )}
        {!loading && memories.length === 0 && (
          <div class="memory-empty">
            {search ? "No memories match your search" : "No memories yet. Archive a conversation to extract memories."}
          </div>
        )}
        {memories.map((mem) => (
          <div key={mem.id} class="memory-item">
            <div class="memory-item-header">
              <span
                class="memory-kind-badge"
                style={{ background: KIND_COLORS[mem.kind] || "var(--nx-text-dim)" }}
              >
                {KIND_LABELS[mem.kind] || mem.kind}
              </span>
              <span class="memory-item-date">
                {new Date(mem.created_at).toLocaleDateString()}
              </span>
              <button
                class="memory-item-delete"
                onClick={() => handleDelete(mem.id)}
                title="Delete memory"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="memory-item-content">{mem.content}</div>
            {mem.tags && (
              <div class="memory-item-tags">
                {mem.tags.split(",").map((tag) => (
                  <span key={tag} class="memory-tag">{tag.trim()}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
