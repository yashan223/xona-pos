@echo off
title Deploying Xona POS Application
echo ==========================================
echo       DEPLOYING XONA POS APPLICATION
echo ==========================================
echo.

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set ROOT_DIR=%%~fI

echo [1/2] Building Backend Server...
cd /d "%ROOT_DIR%\backend"
echo Installing backend dependencies...
call npm install
echo Compiling backend TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Backend build failed!
    goto error
)
echo.

echo [2/2] Building Desktop Client Installer...
cd /d "%ROOT_DIR%\desktop"
taskkill /f /im "Xona POS.exe" 2>nul
echo Installing desktop dependencies...
call npm install
echo Packaging app and generating NSIS installer...
call npm run build:installer
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Desktop installer build failed!
    goto error
)
echo.

echo ==========================================
echo       DEPLOY COMPLETED SUCCESSFULLY!
echo ==========================================
echo.
echo Backend build location:
echo   %ROOT_DIR%\backend\dist
echo.
echo Frontend installer location:
echo   %ROOT_DIR%\desktop\dist\Xona-POS-Desktop-Setup-v1.0.0.exe
echo.
goto end

:error
echo.
echo ==========================================
echo       DEPLOY FAILED!
echo ==========================================
echo.

:end
cd /d "%ROOT_DIR%"
pause

