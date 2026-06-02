#!/usr/bin/env python3
"""Local preview server that mimics Vercel cleanUrls (/pricing -> pricing.html)."""
import http.server, socketserver, os, posixpath

PORT = 8091

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]
        local = super().translate_path(p)
        # Directory -> try index.html (default behavior handles this)
        if os.path.isdir(local):
            return local
        # Exact file exists
        if os.path.exists(local):
            return local
        # Clean URL: try adding .html
        if not p.endswith('/') and '.' not in posixpath.basename(p):
            html = super().translate_path(p + '.html')
            if os.path.exists(html):
                return html
        return local

os.chdir(os.path.dirname(os.path.abspath(__file__)))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving clean-URL preview at http://localhost:{PORT}")
    httpd.serve_forever()
