@echo off
title LingYun Attendance
color 0A

echo ========================================
echo   LingYun Attendance v1.1.0
echo ========================================
echo.

cd /d "%~dp0"

:: Clear NODE_ENV to ensure devDependencies can install
set NODE_ENV=

echo [1/3] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo [2/3] Checking dependencies...
if not exist "node_modules\@vitejs\plugin-vue" (
    echo Installing dependencies...
    call npm install --include=dev --no-audit --no-fund
)

echo [3/3] Starting application...
echo.

taskkill /F /IM electron.exe >nul 2>&1
npm run start

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start.
)

pause
