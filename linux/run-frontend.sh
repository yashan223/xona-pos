#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting Xona POS Desktop Frontend..."
cd "$ROOT_DIR/desktop" || exit 1
npm start
