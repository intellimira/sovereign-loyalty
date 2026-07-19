#!/usr/bin/env python3
"""
Sovereign Loyalty — Demo HTTP Server
FAAW Stage 3: Local mobile demo hosting

Usage:
    python3 serve.py [--port 8080] [--host 0.0.0.0]

Features:
    - Serves the PWA app on LAN (accessible from any phone on same WiFi)
    - Proper MIME types for PWA manifest and service worker
    - CORS headers for local development
    - Auto-detects local IP for mobile access
"""

import http.server
import socketserver
import socket
import os
import sys
import argparse

PORT = 8080
HOST = '0.0.0.0'
APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')


class SovereignHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with proper PWA headers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def end_headers(self):
        # PWA-friendly headers
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        super().end_headers()

    def guess_type(self, path):
        """Ensure correct MIME types for PWA."""
        if path.endswith('.json'):
            return 'application/manifest+json'
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.webmanifest'):
            return 'application/manifest+json'
        return super().guess_type(path)

    def log_message(self, format, *args):
        """Styled logging."""
        status = args[1] if len(args) > 1 else ''
        method = args[0] if args else ''
        color = '\033[32m' if '200' in str(status) else '\033[33m' if '304' in str(status) else '\033[31m'
        reset = '\033[0m'
        print(f'  {color}{method}{reset} {status}')


def get_local_ip():
    """Detect the local LAN IP for mobile access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


def main():
    parser = argparse.ArgumentParser(description='Sovereign Loyalty Demo Server')
    parser.add_argument('--port', '-p', type=int, default=PORT, help=f'Port (default: {PORT})')
    parser.add_argument('--host', default=HOST, help=f'Host (default: {HOST})')
    args = parser.parse_args()

    local_ip = get_local_ip()

    print(f'''
\033[36m╔══════════════════════════════════════════════════════╗
║         SOVEREIGN LOYALTY — DEMO SERVER              ║
║         The Greatest Loyalty Card — FAAW v3          ║
╚══════════════════════════════════════════════════════╝\033[0m

  \033[33m📡 Desktop:\033[0m  http://localhost:{args.port}
  \033[33m📱 Mobile:\033[0m   http://{local_ip}:{args.port}

  \033[36mHow to use:\033[0m
  1. Open the Mobile URL on your phone (same WiFi)
  2. Tap "Add to Home Screen" when prompted
  3. The app works offline after first load

  \033[36mDemo Flow:\033[0m
  💳 Pass   → Customer loyalty card with QR + tier
  📡 Door   → Staff scanner — award stamps
  🍺 Staff  → Vibe profile + rewards
  📊 CRM    → Merchant dashboard + IntelliGrow

  \033[90mPress Ctrl+C to stop\033[0m
''')

    with socketserver.TCPServer((args.host, args.port), SovereignHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\033[33m⏹  Server stopped.\033[0m')


if __name__ == '__main__':
    main()
