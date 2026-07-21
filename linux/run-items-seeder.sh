#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting Xona POS Items Seeder..."
cd "$ROOT_DIR/items-backend" || exit 1
npm run seed
echo "Seeding complete!"
