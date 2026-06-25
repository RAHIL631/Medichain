@echo off
setlocal enabledelayedexpansion
title MediChain Launch Assistant
color 0A

echo ===================================================
echo     MediChain Full-Stack Automated Launcher
echo ===================================================
echo.

echo [1/4] Cleaning up orphaned Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo       Done.
echo.

echo [2/4] Installing / Verifying Backend Dependencies...
cd /d "%~dp0backend"
call npm install
echo       Done.
echo.

echo [3/4] Installing / Verifying Frontend Dependencies...
cd /d "%~dp0frontend"
call npm install
echo       Done.
echo.

echo [4/4] Starting the servers in separate windows...

:: Start the backend
start "MediChain BACKEND (Port 5005)" cmd /k "color 0B && cd /d ""%~dp0backend"" && npm run dev"

:: Give backend 3 seconds to spin up
timeout /t 3 /nobreak >nul

:: Start the frontend
start "MediChain FRONTEND (Port 3005)" cmd /k "color 0D && cd /d ""%~dp0frontend"" && npm start"

echo ===================================================
echo   LAUNCH SUCCESSFUL!
echo.
echo   - Two new windows should have popped up.
echo   - The browser will open automatically.
echo   - Backend runs on http://localhost:5005
echo   - Frontend runs on http://localhost:3005
echo ===================================================
echo.
echo You can safely close this window.
pause >nul
