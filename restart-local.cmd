@echo off
setlocal
cd /d "%~dp0"
call "%~dp0stop-local.cmd"
ping 127.0.0.1 -n 3 >nul
call "%~dp0start-local.cmd"
endlocal
