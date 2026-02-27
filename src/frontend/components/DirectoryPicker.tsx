import { useEffect } from "preact/hooks";
import { useFilesystem } from "../hooks/useFilesystem.ts";

interface Props {
  onSelect: (cwd: string) => void;
  onCancel: () => void;
}

function abbreviatePath(path: string): string {
  const home = path.match(/^\/home\/[^/]+/)?.[0];
  if (home && path.startsWith(home)) {
    return "~" + path.slice(home.length);
  }
  return path;
}

function breadcrumbSegments(path: string): { label: string; path: string }[] {
  const home = path.match(/^\/home\/[^/]+/)?.[0];
  const segments: { label: string; path: string }[] = [];

  if (home && path.startsWith(home)) {
    segments.push({ label: "~", path: home });
    const rest = path.slice(home.length);
    if (rest) {
      const parts = rest.split("/").filter(Boolean);
      let current = home;
      for (const part of parts) {
        current += "/" + part;
        segments.push({ label: part, path: current });
      }
    }
  } else {
    const parts = path.split("/").filter(Boolean);
    segments.push({ label: "/", path: "/" });
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      segments.push({ label: part, path: current });
    }
  }

  return segments;
}

export function DirectoryPicker({ onSelect, onCancel }: Props) {
  const { listing, loading, error, fetchListing } = useFilesystem();

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const segments = listing ? breadcrumbSegments(listing.path) : [];

  return (
    <div class="picker-overlay" onClick={onCancel}>
      <div class="picker-modal" onClick={(e) => e.stopPropagation()}>
        <div class="picker-header">
          <h2>Select working directory</h2>
          <button onClick={onCancel} class="picker-close" title="Cancel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Breadcrumb path */}
        <div class="picker-breadcrumb">
          {listing?.parent && (
            <button
              class="picker-up-btn"
              onClick={() => fetchListing(listing.parent!)}
              title="Go up"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {segments.map((seg, i) => (
            <span key={seg.path}>
              {i > 0 && <span class="picker-sep">/</span>}
              <button
                class="picker-crumb"
                onClick={() => fetchListing(seg.path)}
              >
                {seg.label}
              </button>
            </span>
          ))}
        </div>

        {/* Directory list */}
        <div class="picker-list">
          {loading && (
            <div class="picker-loading">
              <span class="sidebar-spinner" />
              Loading...
            </div>
          )}
          {error && <div class="picker-error">{error}</div>}
          {!loading && !error && listing?.entries.length === 0 && (
            <div class="picker-empty">No subdirectories</div>
          )}
          {!loading && !error && listing?.entries.map((entry) => (
            <button
              key={entry.path}
              class="picker-entry"
              onClick={() => fetchListing(entry.path)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              <span>{entry.name}</span>
            </button>
          ))}
        </div>

        {/* Select button */}
        <div class="picker-footer">
          <span class="picker-selected-path">
            {listing ? abbreviatePath(listing.path) : ""}
          </span>
          <button
            class="btn btn-primary picker-select-btn"
            onClick={() => listing && onSelect(listing.path)}
            disabled={!listing}
          >
            Select this directory
          </button>
        </div>
      </div>
    </div>
  );
}
