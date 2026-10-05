@echo off
setlocal
cd /d "%~dp0web"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 24 LTS from https://nodejs.org/ then try again.
 pause
 exit /b 1
)
node setup-admin.mjs
if errorlevel 1 (
 pause
 exit /b 1
)
echo App: http://localhost:4173 - Admin: http://localhost:4173/admin
echo Login details: web\server-data\ADMIN-LOGIN.txt - Keep this file private.
node server.mjs
pause
