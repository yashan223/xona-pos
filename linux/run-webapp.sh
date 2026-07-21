#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting Xona POS Admin Web Application..."
cd "$ROOT_DIR/webapp" || exit 1
npm run dev
