@echo off
title Xona POS Backend Server
set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set ROOT_DIR=%%~fI
cd /d "%ROOT_DIR%\backend"
echo Starting Xona POS Backend Server in Development Mode...
npm run dev
pause
