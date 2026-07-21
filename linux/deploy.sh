#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "      DEPLOYING XONA POS APPLICATION"
echo "=========================================="
echo ""

echo "[1/3] Building Backend Server..."
cd "$ROOT_DIR/backend" || exit 1
echo "Installing backend dependencies..."
npm install || { echo "ERROR: Backend install failed!"; exit 1; }
echo "Compiling backend TypeScript..."
npm run build || { echo "ERROR: Backend build failed!"; exit 1; }
echo ""

echo "[2/3] Building Desktop Client..."
cd "$ROOT_DIR/desktop" || exit 1
echo "Installing frontend dependencies..."
npm install --allow-git=all || { echo "ERROR: Desktop install failed!"; exit 1; }
echo "Packaging/Making desktop installers..."
npm run make || { echo "ERROR: Desktop build failed!"; exit 1; }
echo ""

echo "[3/3] Finalizing Deploy..."
echo ""
echo "=========================================="
echo "      DEPLOY COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Backend build location:"
echo "  $ROOT_DIR/backend/dist"
echo ""
echo "Frontend installer locations:"
echo "  $ROOT_DIR/desktop/out/make"
echo ""
