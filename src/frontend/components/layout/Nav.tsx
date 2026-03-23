interface Props {
  route: string;
  onNavigate: (to: "chat" | "dashboard" | "memory") => void;
  connected: boolean;
  onLogout: () => void;
}

export function Nav({ route, onNavigate, connected, onLogout }: Props) {
  return (
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="nav-brand">Nexia</span>
        <span class="nav-version">v2</span>
      </div>
      <div class="nav-links">
        <button
          class={`nav-link${route === "chat" ? " active" : ""}`}
          onClick={() => onNavigate("chat")}
        >
          Chat
        </button>
        <button
          class={`nav-link${route === "dashboard" ? " active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </button>
        <button
          class={`nav-link${route === "memory" ? " active" : ""}`}
          onClick={() => onNavigate("memory")}
        >
          Memory
        </button>
      </div>
      <div class="nav-right">
        <span
          class={`nav-status-dot ${connected ? "connected" : "disconnected"}`}
          title={connected ? "Connected" : "Disconnected"}
        />
        <button class="nav-logout" onClick={onLogout} title="Log out">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
