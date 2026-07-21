@echo off
setlocal

echo ----------------------------------------------------
echo       Xona POS - Secure API Key Generator
echo ----------------------------------------------------
echo.
echo Generating a 256-bit cryptographically secure key...

:: Generate a 64-character hex string (32 bytes) using PowerShell
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$bytes = New-Object Byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [BitConverter]::ToString($bytes) -replace '-',''"`) do set API_KEY=%%a

echo.
echo ========================================================
echo YOUR NEW API KEY: 
echo %API_KEY%
echo ========================================================
echo.

:: Copy to clipboard without a trailing newline
echo | set /p dummy="%API_KEY%" | clip

echo [SUCCESS] The API Key has been copied to your clipboard!
echo.
echo You can now paste it directly into your .env files:
echo  - backend/.env    (as DEVICE_API_KEY)
echo  - desktop/.env    (as VITE_DEVICE_API_KEY)
echo  - webapp/.env     (as VITE_DEVICE_API_KEY)
echo.
pause
