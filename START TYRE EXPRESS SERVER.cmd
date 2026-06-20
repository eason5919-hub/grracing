@echo off
cd /d "%~dp0"
start "TYRE EXPRESS Shared Server" cmd /k "cd /d ""%~dp0"" && node server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8787"
