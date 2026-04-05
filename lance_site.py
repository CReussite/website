"""
Script pour lancer le site localement avec Python

Utilisation :
    python lance_site.py
"""

# Script pour lancer le site localement avec Python
import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DOCS_DIR = os.path.join(os.path.dirname(__file__), 'docs')
os.chdir(DOCS_DIR)

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Le serveur est lancé sur http://localhost:{PORT}")
    webbrowser.open(f"http://localhost:{PORT}")
    httpd.serve_forever()
