# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Serve the course locally and open it in your browser.

    uv run serve.py            # or: python3 serve.py
    uv run serve.py --port 9000 --no-open

Standard library only. Also answers /__course/root with this repo's absolute path, so the "Ask your agent"
prompts can name the exact files on your machine.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import json
import socket
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path.split('?')[0].rstrip('/') == '/__course/root':
            body = json.dumps({'root': str(ROOT)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self) -> None:
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:  # quiet unless something fails
        if args and str(args[1]).startswith(('4', '5')) and '__course' not in str(args[0]):
            super().log_message(format, *args)


def free_port(preferred: int) -> int:
    for port in [preferred, *range(preferred + 1, preferred + 20), 0]:
        with socket.socket() as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # a port in TIME_WAIT from the last run is free
            try:
                s.bind(('127.0.0.1', port))
                return s.getsockname()[1]
            except OSError:
                continue
    raise SystemExit('No free port found')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--host', default='127.0.0.1', help='use 0.0.0.0 to share on your network, e.g. to present from another device')
    parser.add_argument('--no-open', action='store_true', help="don't open a browser")
    args = parser.parse_args()
    port = free_port(args.port) if args.host == '127.0.0.1' else args.port
    server = http.server.ThreadingHTTPServer((args.host, port), functools.partial(Handler, directory=str(ROOT)))
    url = f'http://{"localhost" if args.host in ("127.0.0.1", "0.0.0.0") else args.host}:{port}/'
    print(f'Harness engineering with Pydantic AI: {url}  (Ctrl+C to stop)', flush=True)
    if not args.no_open:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == '__main__':
    main()
