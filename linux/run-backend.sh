#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting Xona POS Backend Server in Development Mode..."
cd "$ROOT_DIR/backend" || exit 1
npm run dev
