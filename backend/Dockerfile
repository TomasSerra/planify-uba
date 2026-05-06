FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api ./api
COPY scraper ./scraper

ENV PYTHONUNBUFFERED=1

# UVICORN_RELOAD=1 (compose dev) habilita hot-reload. Sin la var: prod-safe.
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port 8000 ${UVICORN_RELOAD:+--reload --reload-dir /app/api}"]
