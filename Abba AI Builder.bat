@echo off
title Abba AI Builder
cd /d "C:\Users\yosiw\dyad-enhanced"

echo =============================================
echo         Abba AI Builder - Starting...
echo =============================================
echo.
echo Initializing desktop app...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Start the Electron app
echo Starting Abba AI Builder...
echo.
npm start

REM If app crashes or exits
echo.
echo =============================================
echo App closed. Press any key to exit...
echo =============================================
pause >nul
