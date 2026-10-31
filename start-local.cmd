@echo off
setlocal
cd /d "%~dp0"

set API_UP=0
set WEB_UP=0
netstat -ano | findstr /C:":1337 " | findstr /C:"LISTENING" >nul && set API_UP=1
netstat -ano | findstr /C:":5173 " | findstr /C:"LISTENING" >nul && set WEB_UP=1

if "%API_UP%%WEB_UP%"=="11" (
  echo Kaneo is already running. Opening http://localhost:5173 ...
  start "" http://localhost:5173
  exit /b 0
)
if "%API_UP%%WEB_UP%"=="10" (
  echo Port 1337 is already in use. Run stop-local.cmd first.
  pause
  exit /b 1
)
if "%API_UP%%WEB_UP%"=="01" (
  echo Port 5173 is already in use. Run stop-local.cmd first.
  pause
  exit /b 1
)

echo [1/2] Starting PostgreSQL (existing data volume)...
docker compose -f compose.db.yml up -d
if errorlevel 1 (
  echo Failed to start PostgreSQL. Is Docker Desktop running?
  pause
  exit /b 1
)

echo [2/2] Starting API + Web with hot reload...
echo   Web: http://localhost:5173
echo   API: http://localhost:1337/api/health
echo Press Ctrl+C or close this window to stop.
echo.
node scripts\dev-local.mjs
endlocal
