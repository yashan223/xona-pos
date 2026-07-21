#!/usr/bin/env bash

echo "----------------------------------------------------"
echo "      Xona POS - Secure API Key Generator"
echo "----------------------------------------------------"
echo ""
echo "Generating a 256-bit cryptographically secure key..."

API_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)

echo ""
echo "========================================================"
echo "YOUR NEW API KEY:"
echo "$API_KEY"
echo "========================================================"
echo ""

if command -v xclip >/dev/null 2>&1; then
    printf "%s" "$API_KEY" | xclip -selection clipboard
    echo "[SUCCESS] The API Key has been copied to your clipboard!"
elif command -v xsel >/dev/null 2>&1; then
    printf "%s" "$API_KEY" | xsel -b
    echo "[SUCCESS] The API Key has been copied to your clipboard!"
fi

echo ""
echo "You can now paste it directly into your .env files:"
echo " - backend/.env    (as DEVICE_API_KEY)"
echo " - desktop/.env    (as VITE_DEVICE_API_KEY)"
echo " - webapp/.env     (as VITE_DEVICE_API_KEY)"
echo ""
