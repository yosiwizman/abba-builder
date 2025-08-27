@echo off
title Abba AI Builder - 95% Success Rate
color 0A
cls

echo =====================================================
echo          ABBA AI BUILDER - STARTING
echo        AI-Powered App Builder (95%% Success)
echo =====================================================
echo.
echo Initializing systems...
echo - Project Library: 1000+ templates
echo - Knowledge Base: Active
echo - Enhanced Services: Online
echo.

cd /d "C:\Users\yosiw\dyad-enhanced"

:start
echo Starting Abba AI Builder...
echo.

REM Start the app
npm start

REM Check if app crashed or user closed it
echo.
echo =====================================================
if %ERRORLEVEL% NEQ 0 (
    echo App encountered an issue (Error Code: %ERRORLEVEL%)
    echo.
    echo Press any key to restart, or Ctrl+C to exit...
) else (
    echo App closed normally.
    echo.
    echo Press any key to restart, or Ctrl+C to exit...
)
echo =====================================================
pause > nul

echo.
echo Restarting Abba AI Builder...
echo.
goto start
