interface Props {
  connected: boolean;
  status: string | null;
  isQuerying: boolean;
}

export function StatusIndicator({ connected, status, isQuerying }: Props) {
  if (!connected) {
    return (
      <div class="status-bar warn">
        <span class="status-dot amber" />
        Reconnecting...
      </div>
    );
  }

  if (status) {
    return (
      <div class="status-bar info">
        <span class="status-dot blue" />
        {status}
      </div>
    );
  }

  if (isQuerying) {
    return (
      <div class="status-bar info">
        <span class="status-dot blue" />
        Thinking...
      </div>
    );
  }

  return null;
}
