@echo off
title Deploying Xona POS Application
echo ==========================================
echo       DEPLOYING XONA POS APPLICATION
echo ==========================================
echo.

set ROOT_DIR=%~dp0

echo [1/3] Building Backend Server...
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

echo [2/3] Building Desktop Client...
cd /d "%ROOT_DIR%\xona-pos-desktop"
echo Installing frontend dependencies...
call npm install
echo Packaging/Making desktop installers...
call npm run make
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Desktop build failed!
    goto error
)
echo.

echo [3/3] Finalizing Deploy...
echo.
echo ==========================================
echo       DEPLOY COMPLETED SUCCESSFULLY!
echo ==========================================
echo.
echo Backend build location:
echo   %ROOT_DIR%\backend\dist
echo.
echo Frontend installer locations:
echo   %ROOT_DIR%\xona-pos-desktop\out\make
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
