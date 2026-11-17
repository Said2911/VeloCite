FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scrapers/ ./scrapers/
COPY analytics/ ./analytics/
COPY backend/ ./backend/

CMD ["python", "-m", "scrapers.scheduler"]