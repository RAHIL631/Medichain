@echo off
cd /d "%~dp0frontend"
echo =================================== > frontend_debug.log
echo Running npm install... >> frontend_debug.log
call npm install >> frontend_debug.log 2>&1
echo =================================== >> frontend_debug.log
echo Running npm start... >> frontend_debug.log
set BROWSER=none
call npm start >> frontend_debug.log 2>&1
echo =================================== >> frontend_debug.log
echo Finished. >> frontend_debug.log
