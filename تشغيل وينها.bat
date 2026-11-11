@echo off
chcp 65001 >nul
title WAYNHA
cd /d "%~dp0"

echo.
echo   WAYNHA - تشغيل موقع وينها
echo   ------------------------------

rem 1) الموقع شغال أصلاً؟ نفتح المتصفح فقط
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient('127.0.0.1',3000);$c.Close();exit 0}catch{exit 1}"
if %errorlevel%==0 goto open

rem 2) قاعدة البيانات
echo   [1/2] تشغيل قاعدة البيانات...
start "WAYNHA - database" /min cmd /c "npm run db:start"
set /a tries=0
:waitdb
timeout /t 1 /nobreak >nul
set /a tries+=1
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient('127.0.0.1',5433);$c.Close();exit 0}catch{exit 1}"
if %errorlevel%==0 goto server
if %tries% geq 90 goto dbfail
goto waitdb

:server
rem 3) خادم الموقع (نافذة مصغّرة، أغلقها أو شغّل "إيقاف وينها" للإيقاف)
echo   [2/2] تشغيل الموقع... (أول مرة قد تأخذ دقيقة)
start "WAYNHA - server (لا تغلق هذه النافذة)" /min cmd /c "npm run dev"
set /a tries=0
:waitweb
timeout /t 1 /nobreak >nul
set /a tries+=1
powershell -NoProfile -Command "try{(Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 60).StatusCode|Out-Null;exit 0}catch{exit 1}"
if %errorlevel%==0 goto open
if %tries% geq 120 goto webfail
goto waitweb

:open
echo   جاهز: http://localhost:3000
start "" "http://localhost:3000"
timeout /t 3 >nul
exit /b 0

:dbfail
echo.
echo   تعذّر تشغيل قاعدة البيانات. شغّل "npm run db:start" من الطرفية لرؤية الخطأ.
pause
exit /b 1

:webfail
echo.
echo   الموقع لم يستجب. افتح نافذة "WAYNHA - server" المصغّرة لرؤية الخطأ.
pause
exit /b 1