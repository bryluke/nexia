#!/usr/bin/env bash
set -euo pipefail

echo "Nexia v2 Setup"
echo "=============="
echo

# Check for Bun
if ! command -v bun &>/dev/null; then
  echo "Error: Bun is not installed."
  echo "Install it: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
echo "Bun $(bun --version) found."

# Check for Claude Code CLI
if ! command -v claude &>/dev/null; then
  echo "Error: Claude Code CLI is not installed."
  echo "Install it: npm install -g @anthropic-ai/claude-code"
  exit 1
fi
echo "Claude Code CLI found."

# Install dependencies
echo
echo "Installing dependencies..."
bun install

# Setup .env
if [ -f .env ]; then
  echo
  echo ".env already exists, skipping."
else
  echo
  echo "Generating auth token..."
  TOKEN=$(openssl rand -hex 32)
  echo "NEXIA_AUTH_TOKEN=$TOKEN" > .env
  echo ".env created."
  echo
  echo "Your auth token: $TOKEN"
  echo "You'll need this to log in to the web UI."
fi

# Create data directory
mkdir -p data

# Setup systemd service (optional)
echo
read -p "Install systemd service? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  NEXIA_DIR="$(pwd)"
  SERVICE_FILE="/etc/systemd/system/nexia.service"

  sudo tee "$SERVICE_FILE" > /dev/null <<UNIT
[Unit]
Description=Nexia v2 — Dev Machine Management Platform
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$NEXIA_DIR
ExecStart=$(which bun) run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT

  sudo systemctl daemon-reload
  sudo systemctl enable nexia
  echo "Service installed. Start with: sudo systemctl start nexia"
fi

echo
echo "Setup complete! Run 'bun run dev' to start in dev mode."
