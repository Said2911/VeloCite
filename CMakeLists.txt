cmake_minimum_required(VERSION 3.18)
project(velocite_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -ffast-math")

find_package(pybind11 REQUIRED)

pybind11_add_module(real_estate_engine
    cpp/search_engine.cpp
)

target_compile_options(real_estate_engine PRIVATE
    $<$<CONFIG:Release>:-O3 -march=native>
)