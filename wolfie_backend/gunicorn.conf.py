import os

# Gunicorn configuration file to override Render start command settings
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
worker_class = "geventwebsocket.gunicorn.workers.GeventWebSocketWorker"
workers = 1
timeout = 120
keepalive = 5
loglevel = "info"
