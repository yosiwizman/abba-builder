@echo off
setlocal

:: Set application metadata
set "APP_NAME=Abba AI Builder"
set "APP_DIR=C:\Users\yosiw\dyad-enhanced"
set "LOG_DIR=%APP_DIR%\logs"

:: Ensure log directory exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Check if Node.js is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo Node.js/npm not found. Please install Node.js from nodejs.org
    echo Opening browser to download...
    start https://nodejs.org/
    pause
    exit /b 1
)

:: Change to app directory
cd /d "%APP_DIR%"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies. This may take a few minutes...
    call npm install >>"%LOG_DIR%\installer.log" 2>&1
    if errorlevel 1 (
        echo Installation failed. Please check %LOG_DIR%\installer.log for details.
        start notepad "%LOG_DIR%\installer.log"
        pause
        exit /b 1
    )
)

:: Build and run the packaged app
echo Starting %APP_NAME%...
call npm run make -- --platform win32 >>"%LOG_DIR%\build.log" 2>&1
if errorlevel 1 (
    echo Build failed. Attempting development mode...
    call npm start >>"%LOG_DIR%\launcher.log" 2>&1
    if errorlevel 1 (
        echo Failed to start. Please check logs in %LOG_DIR%
        start explorer "%LOG_DIR%"
        pause
        exit /b 1
    )
) else (
    :: Run the packaged executable
    start "" "%APP_DIR%\out\Abba-win32-x64\Abba.exe"
)

exit /b 0
