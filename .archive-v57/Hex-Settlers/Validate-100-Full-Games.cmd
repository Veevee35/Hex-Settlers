@echo off
setlocal
cd /d "%~dp0"
echo This runs 100 COMPLETE matches through the existing JavaScript engine,
echo using a separate neural-model copy and checkpoint, not the incomplete C++ port.
echo Test Builder is excluded. Check scripts\output\validation-100 for results.
node scripts\validate_100_full_games.js
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" echo Validation incomplete: see failure log and resume by running this file again.
pause
exit /b %RESULT%
