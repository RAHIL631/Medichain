@echo off
setlocal enabledelayedexpansion
title MediChain Launch All-in-One
color 0A

echo ===================================================
echo     MediChain Full-Stack Automated Launcher (All 4)
echo ===================================================
echo.

echo [1/5] Starting Blockchain Node...
start "MediChain BLOCKCHAIN" cmd /k "color 0A && cd /d ""%~dp0blockchain"" && npx hardhat node"

:: Give hardhat node 5 seconds to spin up
echo Waiting for blockchain node to start...
timeout /t 5 /nobreak >nul

echo.
echo [2/5] Deploying Smart Contract to Localhost...
cd /d "%~dp0blockchain"
call npx hardhat run scripts/deploy.js --network localhost
echo       Done.
echo.

echo [3/5] Starting AI Microservice...
start "MediChain AI" cmd /k "color 0E && cd /d ""%~dp0ai"" && call venv\Scripts\activate && python app.py"
echo       Done.
echo.

echo [4/5] Starting Backend...
start "MediChain BACKEND" cmd /k "color 0B && cd /d ""%~dp0backend"" && npm run dev"
echo       Done.
echo.

echo [5/5] Starting Frontend...
start "MediChain FRONTEND" cmd /k "color 0D && cd /d ""%~dp0frontend"" && npm start"
echo       Done.
echo.

echo ===================================================
echo   ALL SERVICES LAUNCHED SUCCESSFULLY!
echo ===================================================
echo   - 4 new windows have opened for the services.
echo   - Blockchain node is running on http://127.0.0.1:8545
echo   - AI microservice is running on http://localhost:5001
echo   - Backend runs on http://localhost:5005 (or 5000)
echo   - Frontend runs on http://localhost:3005 (or 3000)
echo ===================================================
echo You can safely close this window.
pause >nul
