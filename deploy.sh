#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$(npm prefix -g)/bin:$PATH"
command -v firebase >/dev/null || npm install -g firebase-tools
firebase login
# Create project if needed (interactive once):
# firebase projects:create birthday-ira-2026 --display-name "Birthday Ira 2026"
firebase use birthday-ira-2026 || firebase use --add
firebase deploy --only hosting
