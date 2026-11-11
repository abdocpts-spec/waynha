@echo off
chcp 65001 >nul
title WAYNHA - stop
cd /d "%~dp0"
echo   إيقاف موقع وينها...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
call npm run -s db:stop
echo   تم الإيقاف.
timeout /t 3 >nul