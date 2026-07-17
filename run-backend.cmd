@echo off
title Recall Backend Server
cd /d "%~dp0\backend"
echo Starting Recall Backend Server in Development Mode...
npm run dev
pause
