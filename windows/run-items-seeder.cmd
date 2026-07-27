@echo off
title Xona POS Items Seeder
set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set ROOT_DIR=%%~fI
cd /d "%ROOT_DIR%\items-backend"
echo Starting Xona POS Items Seeder...
npm run seed
echo Seeding complete!
pause
