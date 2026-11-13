cmake_minimum_required(VERSION 3.16)
project(hex_settlers_rules LANGUAGES CXX)

add_library(hex_rules STATIC hex_rules_core.cpp)
target_compile_features(hex_rules PUBLIC cxx_std_17)
target_include_directories(hex_rules PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")

add_executable(hex_rules_runner hex_rules_runner.cpp)
target_link_libraries(hex_rules_runner PRIVATE hex_rules)

add_executable(hex_inventory_runner ../../scripts/cuda-exact/hex_exact_cpu.cpp)
target_compile_features(hex_inventory_runner PRIVATE cxx_std_17)

include(CTest)
if(BUILD_TESTING)
  add_executable(hex_rules_selftest hex_rules_selftest.cpp)
  target_link_libraries(hex_rules_selftest PRIVATE hex_rules)
  add_test(NAME hex_rules_selftest COMMAND hex_rules_selftest)
endif()
