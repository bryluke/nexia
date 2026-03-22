import { useState, useEffect, useCallback } from "preact/hooks";

interface Props {
  token: string;
  onSelect: (cwd: string) => void;
  onCancel: () => void;
}

interface DirEntry {
  name: string;
  path: string;
}

/*
 * Directory picker modal for setting conversation cwd.
 *
 * Current: Quick-select from ~/projects/ + custom path input.
 *
 * Future improvements:
 * - Breadcrumb-based filesystem browsing (navigate into subdirs)
 * - Recently used directories (stored in localStorage)
 * - Bookmarked directories
 * - Show git status indicator per directory
 * - Validate custom path exists before creating conversation
 */
export function DirectoryPicker({ token, onSelect, onCancel }: Props) {
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [customPath, setCustomPath] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/directories", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject("Failed to load")))
      .then((data) => {
        setDirs(data.directories || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load directories");
        setLoading(false);
      });
  }, [token]);

  const handleCustomSubmit = useCallback(() => {
    const path = customPath.trim();
    if (!path) return;
    // Expand ~ to home dir (server will validate)
    const expanded = path.startsWith("~/")
      ? `/home/bryan${path.slice(1)}`
      : path;
    onSelect(expanded);
  }, [customPath, onSelect]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCustomSubmit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleCustomSubmit, onCancel]
  );

  return (
    <div class="picker-overlay" onClick={onCancel}>
      <div class="picker-modal" onClick={(e) => e.stopPropagation()}>
        <div class="picker-header">
          <h2>New Conversation</h2>
          <button class="picker-close" onClick={onCancel}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="picker-section">
          <div class="picker-section-label">Projects</div>
          <div class="picker-list">
            {loading && (
              <div class="picker-loading">
                <span class="sidebar-spinner" />
                Loading...
              </div>
            )}
            {error && <div class="picker-error">{error}</div>}
            {!loading &&
              !error &&
              dirs.map((dir) => (
                <button
                  key={dir.path}
                  class="picker-entry"
                  onClick={() => onSelect(dir.path)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  <span class="picker-entry-name">{dir.name}</span>
                  <span class="picker-entry-path">{dir.path}</span>
                </button>
              ))}
            {!loading && !error && dirs.length === 0 && (
              <div class="picker-empty">No project directories found</div>
            )}
          </div>
        </div>

        <div class="picker-section">
          <div class="picker-section-label">Custom path</div>
          <div class="picker-custom">
            <input
              type="text"
              value={customPath}
              onInput={(e) =>
                setCustomPath((e.target as HTMLInputElement).value)
              }
              onKeyDown={handleKeyDown}
              placeholder="~/projects/my-project"
              class="picker-input"
            />
            <button
              class="btn btn-primary picker-go"
              onClick={handleCustomSubmit}
              disabled={!customPath.trim()}
            >
              Go
            </button>
          </div>
        </div>

        <div class="picker-footer">
          <button
            class="picker-home-btn"
            onClick={() => onSelect("/home/bryan")}
          >
            Or start in home directory
          </button>
        </div>
      </div>
    </div>
  );
}
