import { useState, useEffect, useCallback } from "preact/hooks";
import { Page } from "../components/ui/Page.tsx";
import { Card } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { SearchInput } from "../components/ui/SearchInput.tsx";
import { IconButton } from "../components/ui/IconButton.tsx";

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

  return (
    <Page title="Memory" meta={`${memories.length} entries`}>
      <div style="margin-bottom: 1rem">
        <SearchInput
          value={search}
          onInput={(v) => { setSearch(v); setKindFilter(null); }}
          onSubmit={fetchMemories}
          placeholder="Search memories..."
        />
      </div>

      <div class="ui-filters" style="margin-bottom: 1.25rem">
        <button
          class={`ui-filter-btn${kindFilter === null && !search ? " active" : ""}`}
          onClick={() => { setKindFilter(null); setSearch(""); }}
        >
          All
        </button>
        {Object.entries(KIND_LABELS).map(([kind, label]) => (
          <button
            key={kind}
            class={`ui-filter-btn${kindFilter === kind ? " active" : ""}`}
            onClick={() => { setKindFilter(kind); setSearch(""); }}
            style={{ "--filter-color": KIND_COLORS[kind] } as any}
          >
            {label}
          </button>
        ))}
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem">
        {loading && (
          <div class="memory-loading">
            <span class="sidebar-spinner" />
            Loading...
          </div>
        )}
        {!loading && memories.length === 0 && (
          <div class="memory-empty">
            {search
              ? "No memories match your search"
              : "No memories yet. Archive a conversation to extract memories."}
          </div>
        )}
        {memories.map((mem) => (
          <Card key={mem.id}>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem">
              <Badge
                label={KIND_LABELS[mem.kind] || mem.kind}
                color={KIND_COLORS[mem.kind]}
              />
              <span class="memory-item-date">
                {new Date(mem.created_at).toLocaleDateString()}
              </span>
              <span style="margin-left: auto">
                <IconButton
                  onClick={() => handleDelete(mem.id)}
                  title="Delete memory"
                  class="memory-item-delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </IconButton>
              </span>
            </div>
            <div class="memory-item-content">{mem.content}</div>
            {mem.tags && (
              <div class="memory-item-tags">
                {mem.tags.split(",").map((tag) => (
                  <Badge key={tag} label={tag.trim()} variant="outline" />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Page>
  );
}
