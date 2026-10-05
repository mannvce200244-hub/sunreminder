@echo off
setlocal
cd /d "%~dp0"
where dotnet >nul 2>nul
if errorlevel 1 (
 echo Install the .NET 10 SDK from https://dotnet.microsoft.com/download/dotnet/10.0
 pause
 exit /b 1
)
dotnet run --project tests\SunReminder.Tests -c Release
if errorlevel 1 (
 pause
 exit /b 1
)
dotnet publish src\SunReminder.App\SunReminder.App.csproj -c Release -r win-x64 --self-contained true -o App-v3 -p:EnableCompressionInSingleFile=true
if errorlevel 1 (
 pause
 exit /b 1
)
echo Ready: App-v3\SunReminder.exe
pause

