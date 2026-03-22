import { useState, useCallback, useEffect } from "preact/hooks";

interface SystemInfo {
  hostname: string;
  uptime: string;
  loadAvg: string;
  memory: { totalMb: number; usedMb: number; percent: number };
  disk: { total: string; used: string; available: string; percent: string };
  services: Array<{ name: string; status: string; description: string }>;
}

export function useSystemInfo(token: string | null) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      setInfo(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return { info, loading, error, refresh: fetchInfo };
}
