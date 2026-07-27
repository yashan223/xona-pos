@echo off
title Xona POS Desktop Frontend
set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set ROOT_DIR=%%~fI
cd /d "%ROOT_DIR%\desktop"
echo Starting Xona POS Desktop Frontend...
npm start
pause
