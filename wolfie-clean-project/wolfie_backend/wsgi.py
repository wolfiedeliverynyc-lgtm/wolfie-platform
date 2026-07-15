"""
╔══════════════════════════════════════════════════════════════╗
║     WOLFIE DELIVERY — wsgi.py                                ║
║     Entry point for Gunicorn on Render                       ║
╚══════════════════════════════════════════════════════════════╝

Render start command:
  gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
           --workers 1 --bind 0.0.0.0:$PORT wsgi:app
"""

import os
from app import create_app, socketio

app = create_app(os.getenv("FLASK_ENV", "production"))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
