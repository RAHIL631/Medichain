@echo off
title MediChain Dev Launcher
color 0B

echo.
echo  =====================================================================
echo     MediChain ^| Blockchain EHR Platform ^| Full Dev Launcher
echo  =====================================================================
echo.

REM ── Step 1: Install backend packages (if needed) ─────────────────────────────
echo [1/4] Checking backend dependencies...
cd /d "%~dp0backend"
call npm install --prefer-offline --silent 2>nul
echo       Done.
echo.

REM ── Step 2: Start Backend on port 5000 ───────────────────────────────────────
echo [2/4] Starting Backend API (port 5000)...
start "MediChain BACKEND" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 /nobreak >nul
echo       BACKEND window opened.
echo.

REM ── Step 3: Start AI Microservice on port 5001 ───────────────────────────────
echo [3/4] Starting AI Microservice (port 5001)...
REM Check if venv exists inside ai/ directory
if exist "%~dp0ai\venv\Scripts\activate.bat" (
    start "MediChain AI" cmd /k "cd /d "%~dp0ai" && call venv\Scripts\activate && python app.py"
    echo       AI window opened using ai\venv.
) else if exist "%~dp0venv\Scripts\activate.bat" (
    REM Fallback: root-level venv
    start "MediChain AI" cmd /k "cd /d "%~dp0ai" && call "%~dp0venv\Scripts\activate" && python app.py"
    echo       AI window opened using root venv.
) else (
    echo       [WARN] No Python venv found. Run: cd ai && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python train_model.py
    echo       Attempting to start AI with system Python...
    start "MediChain AI" cmd /k "cd /d "%~dp0ai" && python app.py"
)
timeout /t 2 /nobreak >nul
echo.

REM ── Step 4: Start Frontend React App on port 3000 ────────────────────────────
echo [4/4] Starting Frontend (port 3000)...
start "MediChain FRONTEND" cmd /k "cd /d "%~dp0frontend" && npm start"
echo       FRONTEND window opened.
echo.

echo  =====================================================================
echo    All services are starting up in separate windows!
echo.
echo    Backend API  → http://localhost:5000
echo    AI Service   → http://localhost:5001
echo    Frontend     → http://localhost:3000
echo    Health Check → http://localhost:5000/health
echo    AI Health    → http://localhost:5001/health
echo  =====================================================================
echo.
echo  Close this window when done, or press any key to exit.
pause >nul
