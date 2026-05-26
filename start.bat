@echo off
title Wathi9ati - وثيقتي
color 0A
cls

echo.
echo  ============================================================
echo     ^^  وثيقتي  ^^   Wathi9ati - Secure Document Wallet
echo  ============================================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js not found! Please install it from https://nodejs.org
  pause
  exit /b 1
)

echo  [1/4] Checking backend dependencies...
cd /d "%~dp0backend"
if not exist "node_modules" (
  echo  [2/4] Installing backend packages...
  call npm install
  if %errorlevel% neq 0 (
    echo  [ERROR] Backend install failed!
    pause
    exit /b 1
  )
) else (
  echo  [2/4] Backend packages already installed.
)

echo.
echo  [3/4] Checking frontend dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo  [4/4] Installing frontend packages...
  call npm install
  if %errorlevel% neq 0 (
    echo  [ERROR] Frontend install failed!
    pause
    exit /b 1
  )
) else (
  echo  [4/4] Frontend packages already installed.
)

echo.
echo  ============================================================
echo   Starting servers...
echo   Backend  ^>  http://localhost:5000
echo   Frontend ^>  http://localhost:5173
echo  ============================================================
echo.
echo   Press Ctrl+C in each window to stop.
echo.

REM Start backend in new window
start "Wathi9ati Backend :5000" cmd /k "cd /d "%~dp0backend" && node server.js"

REM Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

REM Start frontend in new window
start "Wathi9ati Frontend :5173" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM Open browser after a short delay
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo  Both servers are running!
echo  The app has been opened in your browser.
echo.
echo  Close this window when you want to stop everything,
echo  or close each server window individually.
echo.
pause
