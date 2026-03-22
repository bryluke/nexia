import { useSystemInfo } from "../hooks/useSystemInfo.ts";

interface Props {
  token: string;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "running"
      ? "var(--nx-success)"
      : status === "inactive"
        ? "var(--nx-text-muted)"
        : "var(--nx-warning)";
  return (
    <span
      class="dash-status-dot"
      style={{ background: color }}
    />
  );
}

export function DashboardPage({ token }: Props) {
  const { info, loading, error, refresh } = useSystemInfo(token);

  if (loading && !info) {
    return (
      <div class="dash-loading">
        <span class="sidebar-spinner" />
        Loading system info...
      </div>
    );
  }

  if (error) {
    return (
      <div class="dash-error">
        <p>Failed to load system info: {error}</p>
        <button class="btn btn-primary" onClick={refresh} style="width:auto;margin-top:0.5rem">
          Retry
        </button>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div class="dash-page">
      <div class="dash-header">
        <h1>{info.hostname}</h1>
        <button class="btn-refresh" onClick={refresh} title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>
      <p class="dash-uptime">{info.uptime}</p>

      <div class="dash-grid">
        {/* Memory */}
        <div class="dash-card">
          <div class="dash-card-title">Memory</div>
          <div class="dash-card-value">{info.memory.percent}%</div>
          <div class="dash-card-sub">
            {info.memory.usedMb} MB / {info.memory.totalMb} MB
          </div>
          <div class="dash-bar">
            <div
              class="dash-bar-fill"
              style={{ width: `${info.memory.percent}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div class="dash-card">
          <div class="dash-card-title">Disk</div>
          <div class="dash-card-value">{info.disk.percent}</div>
          <div class="dash-card-sub">
            {info.disk.used} / {info.disk.total} ({info.disk.available} free)
          </div>
          <div class="dash-bar">
            <div
              class="dash-bar-fill"
              style={{
                width: info.disk.percent || "0%",
              }}
            />
          </div>
        </div>

        {/* Load */}
        <div class="dash-card">
          <div class="dash-card-title">Load Average</div>
          <div class="dash-card-value" style="font-size:1.25rem">
            {info.loadAvg}
          </div>
        </div>
      </div>

      {/* Services */}
      <div class="dash-section">
        <h2>Services</h2>
        <div class="dash-services">
          {info.services.map((svc) => (
            <div key={svc.name} class="dash-service">
              <StatusDot status={svc.status} />
              <span class="dash-service-name">{svc.name}</span>
              <span class="dash-service-status">{svc.status}</span>
              <span class="dash-service-desc">{svc.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
