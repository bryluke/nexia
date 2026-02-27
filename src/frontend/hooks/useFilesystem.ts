import { useState, useCallback } from "preact/hooks";

export interface FilesystemEntry {
  name: string;
  path: string;
}

export interface FilesystemListing {
  path: string;
  parent: string | null;
  entries: FilesystemEntry[];
}

export function useFilesystem() {
  const [listing, setListing] = useState<FilesystemListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async (path?: string) => {
    const token = localStorage.getItem("nexia_token");
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/filesystem/list${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to list directory");
        return;
      }
      const data: FilesystemListing = await res.json();
      setListing(data);
    } catch {
      setError("Failed to fetch directory listing");
    } finally {
      setLoading(false);
    }
  }, []);

  return { listing, loading, error, fetchListing };
}
