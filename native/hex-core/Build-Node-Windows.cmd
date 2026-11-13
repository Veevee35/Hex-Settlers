@echo off
setlocal
if "%~2"=="" (
  echo Usage: Build-Node-Windows.cmd NODE_INCLUDE_DIRECTORY NODE_LIB
  exit /b 1
)
set "NODE_INCLUDE=%~f1"
set "NODE_LIB=%~f2"
cd /d "%~dp0"
cl /nologo /O2 /EHsc /std:c++17 /LD /I"%NODE_INCLUDE%" /Fe:hex_rules.node hex_rules_core.cpp node_binding.cpp "%NODE_LIB%" /link /NOIMPLIB /NOEXP
exit /b %errorlevel%
