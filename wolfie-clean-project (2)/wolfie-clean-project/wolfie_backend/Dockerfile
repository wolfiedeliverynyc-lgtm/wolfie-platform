# ══════════════════════════════════════════════════════════════
# WOLFIE DELIVERY — Dockerfile
# ══════════════════════════════════════════════════════════════

FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Non-root user for security
RUN useradd -m wolfie && chown -R wolfie:wolfie /app
USER wolfie

EXPOSE 5000

# Start with Gunicorn + gevent for WebSocket support
CMD gunicorn \
    --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
    --workers 1 \
    --bind 0.0.0.0:${PORT:-5000} \
    --timeout 120 \
    --keep-alive 5 \
    --log-level info \
    wsgi:app
