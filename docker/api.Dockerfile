# Build stage — compile C++ engine
FROM python:3.12-slim AS builder


RUN apt-get update && apt-get install -y \
    cmake g++ python3-dev pybind11-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY cpp/ ./cpp/
COPY CMakeLists.txt .

RUN mkdir -p build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release \
    && make -j$(nproc)

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

# Copy compiled C++ engine
COPY --from=builder /build/build/real_estate_engine*.so ./

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY analytics/ ./analytics/
COPY scrapers/ ./scrapers/
COPY database/ ./database/

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001"]