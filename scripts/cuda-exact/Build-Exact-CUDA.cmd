@echo off
setlocal
cd /d "%~dp0"
where nvcc.exe >nul 2>nul
if errorlevel 1 (
  echo NVIDIA CUDA Toolkit nvcc.exe was not found in PATH.
  echo Install CUDA Toolkit 12+ with Visual Studio 2022 C++ components.
  echo https://developer.nvidia.com/cuda-downloads
  exit /b 1
)
rem RTX 3090 Ti is Ampere compute capability 8.6.
nvcc -O3 -std=c++17 -arch=sm_86 -o hex_exact_cuda.exe hex_exact_cuda.cu
if errorlevel 1 exit /b 1
node exact_parity.js --backend cuda --count 500
if errorlevel 1 exit /b 1
echo Native CUDA kernel compiled and passed 500 authoritative JavaScript parity cases.
