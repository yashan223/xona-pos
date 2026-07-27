@echo off
title Xona POS Admin Web Application
set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set ROOT_DIR=%%~fI
cd /d "%ROOT_DIR%\webapp"
echo Starting Xona POS Admin Web Application...
npm run dev
pause
