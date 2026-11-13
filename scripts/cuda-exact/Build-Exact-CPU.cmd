@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
where cl.exe >nul 2>nul
if errorlevel 1 (
  set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
  if exist "%VSWHERE%" (
    for /f "usebackq delims=" %%v in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VSROOT=%%v"
    if defined VSROOT if exist "!VSROOT!\VC\Auxiliary\Build\vcvars64.bat" call "!VSROOT!\VC\Auxiliary\Build\vcvars64.bat"
  )
)
where cl.exe >nul 2>nul
if errorlevel 1 (
  echo Cannot find MSVC C++ compiler. Open the x64 Native Tools Command Prompt for VS 2022,
  echo or install Visual Studio Desktop development with C++ workload.
  exit /b 1
)
cl /nologo /O2 /EHsc /std:c++17 /Fe:hex_exact_cpu.exe hex_exact_cpu.cpp
if errorlevel 1 exit /b 1
node exact_parity.js --backend cpu --count 500
if errorlevel 1 exit /b 1
echo Native CPU reference compiled and passed 500 JavaScript parity cases.
