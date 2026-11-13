@echo off
setlocal EnableExtensions
cd /d "%~dp0"
where emcc.exe >nul 2>nul
if errorlevel 1 (
  echo Install the Emscripten SDK and activate its environment before running this script.
  exit /b 1
)
emcc -O3 -std=c++17 hex_rules_core.cpp -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s "EXPORTED_FUNCTIONS=['_hex_cpp_step','_hex_cpp_abi_version','_hex_cpp_state_size','_malloc','_free']" -s "EXPORTED_RUNTIME_METHODS=['cwrap']" -o hex_rules_core.js
if errorlevel 1 exit /b 1
echo WebAssembly rule subset compiled. NOT wired into live multiplayer or the browser game.
