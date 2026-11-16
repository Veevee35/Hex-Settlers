@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install Node.js, then run this launcher again.
  pause
  exit /b 1
)
node -e "require('ws'); require('openskill')" >nul 2>nul
if errorlevel 1 (
  echo Installing training dependencies with npm ci...
  call npm ci --include=dev
  if errorlevel 1 (
    echo Dependency install failed. Verify internet access and try again.
    pause
    exit /b 1
  )
)
echo Starting local Neural Trainer GUI...
call npm run train:neural:gui
if errorlevel 1 pause
