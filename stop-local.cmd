@echo off
setlocal
set PIDFILE=%~dp0.dev-local.pid

echo Stopping Kaneo dev servers...
if not exist "%PIDFILE%" goto ports
set /p DEVPID=<"%PIDFILE%"
if not "%DEVPID%"=="" taskkill /PID %DEVPID% /T /F >nul 2>&1
del "%PIDFILE%" >nul 2>&1

:ports
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:":1337 " ^| findstr /C:"LISTENING"') do taskkill /PID %%p /T /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:":5173 " ^| findstr /C:"LISTENING"') do taskkill /PID %%p /T /F >nul 2>&1
echo Done. PostgreSQL container is left running; stop it with:
echo   docker compose -f compose.db.yml stop
endlocal
