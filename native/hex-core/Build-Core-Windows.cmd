@echo off
setlocal EnableExtensions
cd /d "%~dp0"
where cl.exe >nul 2>nul
if errorlevel 1 (
  echo Open x64 Native Tools Command Prompt for Visual Studio 2022.
  exit /b 1
)
cl /nologo /O2 /EHsc /std:c++17 /Fe:hex_rules_runner.exe hex_rules_core.cpp hex_rules_runner.cpp
if errorlevel 1 exit /b 1
node core_parity.js --count 100
exit /b %errorlevel%
