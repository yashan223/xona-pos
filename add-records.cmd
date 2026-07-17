@echo off
title Add Debugging Records
cd /d "%~dp0\backend"
echo Seeding/adding debugging records...
call npm run seed -- %*
pause
