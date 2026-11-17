cmake_minimum_required(VERSION 3.18)
project(velocite_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Portable optimisation (no -march=native: images are built and run on different CPUs)
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

find_package(Python COMPONENTS Interpreter Development.Module REQUIRED)
find_package(pybind11 CONFIG REQUIRED)

pybind11_add_module(real_estate_engine cpp/search_engine.cpp)
