@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Starfarers Online - Set Worker URL

echo ========================================
echo  Set Cloudflare Worker URL
echo ========================================
echo.
echo Example: https://starfarers-online.example.workers.dev
echo.
set /p "WORKER_URL=Worker URL: "
if not defined WORKER_URL goto NO_URL

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$u=$env:WORKER_URL.Trim().TrimEnd('/'); [System.IO.File]::WriteAllText((Join-Path (Get-Location) 'config.js'), ('window.STARFARERS_SERVER_URL = \"' + $u + '\";' + [Environment]::NewLine), (New-Object System.Text.UTF8Encoding($false)))"
if errorlevel 1 goto WRITE_FAILED

echo.
echo config.js was updated successfully.
echo Upload all files in this GitHub folder to the root of your GitHub repository.
set "RC=0"
goto END

:NO_URL
echo.
echo [ERROR] No URL was entered.
set "RC=1"
goto END
:WRITE_FAILED
echo.
echo [ERROR] Could not update config.js.
set "RC=1"
goto END
:END
echo.
echo This window will stay open until you press a key.
pause >nul
exit /b %RC%
