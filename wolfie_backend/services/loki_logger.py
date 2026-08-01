import logging
import requests
import time
import json
from urllib.parse import urlparse
from threading import Thread
from queue import Queue

class LokiHandler(logging.Handler):
    """
    Asynchronous, thread-safe logging handler that batches and pushes logs 
    directly to Grafana Loki's HTTP push API.
    """
    def __init__(self, url, labels, level=logging.NOTSET):
        super().__init__(level)
        self.labels = labels or {}
        self.queue = Queue()
        
        # Parse basic auth from URL if present
        parsed = urlparse(url)
        self.auth = None
        if parsed.username and parsed.password:
            self.auth = (parsed.username, parsed.password)
            netloc = parsed.hostname
            if parsed.port:
                netloc = f"{netloc}:{parsed.port}"
            # Ensure path doesn't end with double slash
            base_path = parsed.path.rstrip("/")
            self.url = f"{parsed.scheme}://{netloc}{base_path}/loki/api/v1/push"
        else:
            base_url = url.rstrip("/")
            self.url = f"{base_url}/loki/api/v1/push"

        # Start worker thread
        self.worker = Thread(target=self._post_loop, daemon=True)
        self.worker.start()

    def emit(self, record):
        try:
            log_entry = self.format(record)
            timestamp_ns = str(int(time.time() * 1e9))
            self.queue.put((timestamp_ns, log_entry, record.levelname.lower()))
        except Exception:
            self.handleError(record)

    def _post_loop(self):
        while True:
            batch = []
            try:
                # Wait for at least one log (blocks up to 2 seconds)
                item = self.queue.get(timeout=2.0)
                batch.append(item)
                # Consume remaining logs in queue up to batch limit
                while not self.queue.empty() and len(batch) < 100:
                    batch.append(self.queue.get_nowait())
            except Exception:
                pass

            if not batch:
                continue

            # Group logs by log level label
            by_level = {}
            for ts, msg, lvl in batch:
                if lvl not in by_level:
                    by_level[lvl] = []
                by_level[lvl].append([ts, msg])

            streams = []
            for lvl, values in by_level.items():
                lbls = self.labels.copy()
                lbls["level"] = lvl
                streams.append({
                    "stream": lbls,
                    "values": values
                })

            payload = {"streams": streams}
            try:
                headers = {"Content-Type": "application/json"}
                kwargs = {
                    "data": json.dumps(payload),
                    "headers": headers,
                    "timeout": 5
                }
                if self.auth:
                    kwargs["auth"] = self.auth
                
                res = requests.post(self.url, **kwargs)
                if res.status_code >= 400:
                    import sys
                    print(f"⚠️ Loki push failed with status {res.status_code}: {res.text}", file=sys.stderr)
            except Exception as e:
                import sys
                print(f"⚠️ Loki push error: {e}", file=sys.stderr)

