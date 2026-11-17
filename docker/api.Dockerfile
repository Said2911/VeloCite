# Build stage — compile the C++ ranking engine for the same Python version
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends cmake g++ make \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir "pybind11>=2.12"

WORKDIR /build
COPY cpp/ ./cpp/
COPY CMakeLists.txt .

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
        -DPython_EXECUTABLE="$(which python)" \
        -Dpybind11_DIR="$(python -m pybind11 --cmakedir)" \
    && cmake --build build -j"$(nproc)"

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Compiled C++ engine (optional at runtime — Python fallback exists)
COPY --from=builder /build/build/real_estate_engine*.so ./

# Application code
COPY backend/ ./backend/
COPY analytics/ ./analytics/
COPY scrapers/ ./scrapers/
COPY database/ ./database/

ENV PYTHONPATH=/app
EXPOSE 8001

# Railway/Render provide $PORT; default to 8001 locally
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
