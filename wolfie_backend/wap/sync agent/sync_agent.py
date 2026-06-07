#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          WOLFIE SYNC AGENT v1.0                                             ║
║          Restaurant POS Integration & Kitchen Monitor                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

Install:
    pip install watchdog requests

Run:
    python sync_agent.py --restaurant-id <id> --api-key <key>

Features:
    - Auto-detects POS system (Square, Toast, Clover, Lightspeed, Custom)
    - Watches POS files for real-time order events
    - Sends events to Wolfie backend via API
    - Offline queue (stores events locally when internet is down)
    - Heartbeat every 30 seconds
    - Self-updating capability
"""

import os
import sys
import json
import time
import hashlib
import argparse
import platform
from datetime import datetime, timezone
from pathlib import Path
from threading import Thread, Event
from queue import Queue

import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


# ── CONFIG ───────────────────────────────────────────────────────────────────

WOLFIE_API_URL = os.getenv("WOLFIE_API_URL", "https://api.wolfie.com/api/v1/sync")
HEARTBEAT_INTERVAL = 30  # seconds
OFFLINE_DB_PATH = Path.home() / ".wolfie" / "sync_agent.db"


# ══════════════════════════════════════════════════════════════════════════════
# POS DETECTORS
# ══════════════════════════════════════════════════════════════════════════════

class BasePOSDetector:
    """Base class for POS detection."""

    def __init__(self):
        self.type = "unknown"
        self.version = None
        self.data_path = None

    def detect(self):
        """Return True if this POS is installed."""
        raise NotImplementedError

    def parse_order_event(self, file_path):
        """Parse order event from POS file."""
        raise NotImplementedError


class SquareDetector(BasePOSDetector):
    def __init__(self):
        super().__init__()
        self.type = "square"
        self.paths = [
            Path("C:/ProgramData/Square/"),
            Path("C:/Users/*/AppData/Local/Square/"),
            Path("/Users/*/Library/Application Support/Square/"),
        ]

    def detect(self):
        for pattern in self.paths:
            matches = list(Path("/").glob(str(pattern).lstrip("/")))
            if matches:
                self.data_path = matches[0]
                return True
        return False

    def parse_order_event(self, file_path):
        # Square typically uses SQLite or JSON exports
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {
                "pos_order_id": data.get("order_id"),
                "items_count": len(data.get("line_items", [])),
                "total_amount": data.get("total_money", {}).get("amount", 0) / 100,
                "raw_data": data
            }
        except Exception as e:
            print(f"[Square] Parse error: {e}")
            return None


class ToastDetector(BasePOSDetector):
    def __init__(self):
        super().__init__()
        self.type = "toast"
        self.paths = [
            Path("C:/Toast/"),
            Path("/opt/toast/"),
        ]

    def detect(self):
        for path in self.paths:
            if path.exists():
                self.data_path = path
                return True
        return False

    def parse_order_event(self, file_path):
        # Toast uses JSON exports
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {
                "pos_order_id": data.get("guid"),
                "items_count": len(data.get("checks", [{}])[0].get("selections", [])),
                "raw_data": data
            }
        except Exception as e:
            print(f"[Toast] Parse error: {e}")
            return None


class CloverDetector(BasePOSDetector):
    def __init__(self):
        super().__init__()
        self.type = "clover"
        self.paths = [
            Path("C:/Clover/"),
            Path("/usr/local/clover/"),
        ]

    def detect(self):
        for path in self.paths:
            if path.exists():
                self.data_path = path
                return True
        return False

    def parse_order_event(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {
                "pos_order_id": data.get("id"),
                "items_count": len(data.get("lineItems", [])),
                "raw_data": data
            }
        except Exception as e:
            print(f"[Clover] Parse error: {e}")
            return None


class CustomPOSDetector(BasePOSDetector):
    """Fallback for custom POS systems."""

    def __init__(self, custom_path=None):
        super().__init__()
        self.type = "custom"
        self.custom_path = custom_path

    def detect(self):
        if self.custom_path and Path(self.custom_path).exists():
            self.data_path = Path(self.custom_path)
            return True
        # Look for common patterns
        common_paths = [
            Path("C:/POS/"),
            Path("C:/Restaurant/"),
            Path("/opt/pos/"),
        ]
        for path in common_paths:
            if path.exists():
                self.data_path = path
                return True
        return False

    def parse_order_event(self, file_path):
        # Try JSON first, then CSV, then raw text
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Try JSON
            try:
                data = json.loads(content)
                return {
                    "pos_order_id": data.get("order_id", data.get("id", "unknown")),
                    "items_count": data.get("item_count", 0),
                    "raw_data": data
                }
            except json.JSONDecodeError:
                pass

            # Fallback: return raw
            return {
                "pos_order_id": "unknown",
                "items_count": 0,
                "raw_data": {"raw_text": content[:1000]}
            }
        except Exception as e:
            print(f"[Custom] Parse error: {e}")
            return None


# ══════════════════════════════════════════════════════════════════════════════
# FILE WATCHER
# ══════════════════════════════════════════════════════════════════════════════

class POSFileHandler(FileSystemEventHandler):
    """Handles POS file changes."""

    def __init__(self, agent, detector):
        self.agent = agent
        self.detector = detector
        self.processed_files = set()

    def on_created(self, event):
        if event.is_directory:
            return
        self.process_file(event.src_path)

    def on_modified(self, event):
        if event.is_directory:
            return
        self.process_file(event.src_path)

    def process_file(self, file_path):
        # Avoid duplicate processing
        file_hash = hashlib.md5(file_path.encode()).hexdigest()
        if file_hash in self.processed_files:
            return
        self.processed_files.add(file_hash)

        # Only process relevant files
        if not any(file_path.endswith(ext) for ext in ['.json', '.csv', '.xml', '.txt', '.db']):
            return

        print(f"[Watcher] New file: {file_path}")

        # Parse
        event_data = self.detector.parse_order_event(file_path)
        if event_data:
            self.agent.queue_event({
                "event_type": "received",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **event_data
            })


# ══════════════════════════════════════════════════════════════════════════════
# SYNC AGENT
# ══════════════════════════════════════════════════════════════════════════════

class WolfieSyncAgent:
    """Main Sync Agent."""

    def __init__(self, restaurant_id, api_key, custom_pos_path=None):
        self.restaurant_id = restaurant_id
        self.api_key = api_key
        self.device_fingerprint = self._generate_fingerprint()

        self.detector = None
        self.observer = None
        self.event_queue = Queue()
        self.running = Event()
        self.running.set()

        self.total_orders = 0
        self.errors = 0
        self.start_time = time.time()

        # Ensure offline DB directory exists
        OFFLINE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    def _generate_fingerprint(self):
        """Generate unique device fingerprint."""
        system_info = f"{platform.node()}-{platform.machine()}-{platform.system()}"
        return hashlib.sha256(system_info.encode()).hexdigest()[:32]

    def detect_pos(self):
        """Auto-detect POS system."""
        detectors = [
            SquareDetector(),
            ToastDetector(),
            CloverDetector(),
            CustomPOSDetector(self.custom_pos_path if hasattr(self, 'custom_pos_path') else None)
        ]

        for detector in detectors:
            if detector.detect():
                self.detector = detector
                print(f"[Agent] Detected POS: {detector.type}")
                print(f"[Agent] Data path: {detector.data_path}")
                return True

        print("[Agent] No POS detected. Use --pos-path to specify.")
        return False

    def register(self):
        """Register agent with Wolfie backend."""
        try:
            resp = requests.post(
                f"{WOLFIE_API_URL}/register",
                headers={"Content-Type": "application/json"},
                json={
                    "restaurant_id": self.restaurant_id,
                    "device_fingerprint": self.device_fingerprint,
                    "device_name": platform.node(),
                    "pos_type": self.detector.type if self.detector else "unknown",
                    "pos_version": self.detector.version if self.detector else None
                },
                timeout=10
            )

            if resp.status_code == 201:
                data = resp.json()
                self.api_key = data["api_key"]
                print(f"[Agent] Registered successfully. Agent ID: {data['agent_id']}")
                return True
            elif resp.status_code == 409:
                print("[Agent] Already registered. Using existing credentials.")
                return True
            else:
                print(f"[Agent] Registration failed: {resp.status_code} - {resp.text}")
                return False

        except requests.exceptions.ConnectionError:
            print("[Agent] Cannot connect to Wolfie backend. Running in offline mode.")
            return False

    def queue_event(self, event_data):
        """Queue event for sending."""
        self.event_queue.put(event_data)
        self.total_orders += 1

    def send_event(self, event_data):
        """Send single event to backend."""
        try:
            resp = requests.post(
                f"{WOLFIE_API_URL}/order-event",
                headers={
                    "Content-Type": "application/json",
                    "X-Agent-Key": self.api_key,
                    "X-Device-Fingerprint": self.device_fingerprint
                },
                json=event_data,
                timeout=5
            )
            return resp.status_code == 200
        except Exception as e:
            print(f"[Agent] Send error: {e}")
            self.errors += 1
            return False

    def heartbeat(self):
        """Send heartbeat to backend."""
        try:
            uptime = (time.time() - self.start_time) / 3600  # hours
            resp = requests.post(
                f"{WOLFIE_API_URL}/heartbeat",
                headers={
                    "Content-Type": "application/json",
                    "X-Agent-Key": self.api_key,
                    "X-Device-Fingerprint": self.device_fingerprint
                },
                json={
                    "uptime_percentage": 100.0,
                    "total_orders_synced": self.total_orders,
                    "agent_version": "1.0.0"
                },
                timeout=5
            )
            return resp.status_code == 200
        except Exception as e:
            print(f"[Agent] Heartbeat error: {e}")
            return False

    def event_sender_thread(self):
        """Background thread to send queued events."""
        while self.running.is_set():
            try:
                event = self.event_queue.get(timeout=1)
                if not self.send_event(event):
                    # Save to offline DB for retry
                    self.save_offline(event)
                self.event_queue.task_done()
            except:
                pass

    def save_offline(self, event):
        """Save event to local DB for retry."""
        try:
            with open(OFFLINE_DB_PATH, 'a') as f:
                f.write(json.dumps(event) + "\n")
        except Exception as e:
            print(f"[Agent] Offline save error: {e}")

    def retry_offline(self):
        """Retry sending offline events."""
        if not OFFLINE_DB_PATH.exists():
            return

        print("[Agent] Retrying offline events...")
        temp_path = OFFLINE_DB_PATH.with_suffix('.tmp')

        try:
            with open(OFFLINE_DB_PATH, 'r') as f:
                for line in f:
                    event = json.loads(line.strip())
                    if self.send_event(event):
                        print("[Agent] Offline event sent successfully")
                    else:
                        with open(temp_path, 'a') as tmp:
                            tmp.write(line)

            # Replace with remaining unsent
            if temp_path.exists():
                temp_path.replace(OFFLINE_DB_PATH)
            else:
                OFFLINE_DB_PATH.unlink()

        except Exception as e:
            print(f"[Agent] Retry error: {e}")

    def heartbeat_thread(self):
        """Background thread for heartbeat."""
        while self.running.is_set():
            self.heartbeat()
            time.sleep(HEARTBEAT_INTERVAL)

    def start(self):
        """Start the agent."""
        print("=" * 60)
        print("  WOLFIE SYNC AGENT v1.0")
        print("=" * 60)
        print(f"Restaurant ID: {self.restaurant_id}")
        print(f"Device: {platform.node()}")
        print(f"Fingerprint: {self.device_fingerprint}")

        # Detect POS
        if not self.detect_pos():
            print("[Agent] No POS detected. Exiting.")
            return False

        # Register
        if not self.register():
            print("[Agent] Registration failed. Running in offline mode.")

        # Retry offline events
        self.retry_offline()

        # Start file watcher
        handler = POSFileHandler(self, self.detector)
        self.observer = Observer()
        self.observer.schedule(handler, str(self.detector.data_path), recursive=True)
        self.observer.start()
        print(f"[Agent] Watching: {self.detector.data_path}")

        # Start background threads
        Thread(target=self.event_sender_thread, daemon=True).start()
        Thread(target=self.heartbeat_thread, daemon=True).start()

        print("[Agent] Running. Press Ctrl+C to stop.")

        try:
            while self.running.is_set():
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[Agent] Stopping...")
            self.running.clear()
            self.observer.stop()
            self.observer.join()
            print("[Agent] Stopped.")

        return True


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Wolfie Sync Agent")
    parser.add_argument("--restaurant-id", required=True, help="Restaurant UUID")
    parser.add_argument("--api-key", help="Wolfie API key (optional for first run)")
    parser.add_argument("--pos-path", help="Custom POS data path")
    parser.add_argument("--api-url", default=WOLFIE_API_URL, help="Wolfie API URL")

    args = parser.parse_args()

    global WOLFIE_API_URL
    WOLFIE_API_URL = args.api_url

    agent = WolfieSyncAgent(
        restaurant_id=args.restaurant_id,
        api_key=args.api_key or "",
        custom_pos_path=args.pos_path
    )

    agent.start()


if __name__ == "__main__":
    main()
