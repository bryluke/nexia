#!/usr/bin/env bash
set -euo pipefail

echo "Nexia Setup"
echo "==========="
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

echo
echo "Setup complete! Run 'bun run dev' to start."
