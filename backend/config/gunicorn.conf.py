import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8080"
workers = 1  # Use single worker to avoid session issues with in-memory state
worker_class = 'sync'
timeout = 900

# Worker settings
max_requests = 1000
max_requests_jitter = 50
keepalive = 500 

# Logging - enable debug logs
accesslog = '-'  # Show access logs to stdout
errorlog = '-'    # Show errors to stderr
loglevel = 'debug'  # Show all logs for debugging
capture_output = True  # Capture output

# Process naming
proc_name = 'spotify-ytm-api'

# Production settings
reload = False
preload_app = True

# Startup message - shown when server is ready
def when_ready(server):
    import sys
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    # Write to stderr to ensure it's displayed
    sys.stderr.write("\n" + "="*60 + "\n")
    sys.stderr.write("🎵 Spotify to YouTube Music Playlist Transfer\n")
    sys.stderr.write("="*60 + "\n")
    sys.stderr.write(f"🌐 Visit: {frontend_url}\n")
    sys.stderr.write(f"📝 Transfer your playlists now!\n")
    sys.stderr.write("="*60 + "\n\n")
    sys.stderr.flush()