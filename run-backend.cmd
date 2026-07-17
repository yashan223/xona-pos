@echo off
title Xona POS Backend Server
cd /d "%~dp0\backend"
echo Starting Xona POS Backend Server in Development Mode...
npm run dev
pause
