import os
import secrets
from pathlib import Path
from flask import session, request, redirect, url_for
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from google_auth_oauthlib.flow import Flow
from dotenv import load_dotenv

# Load .env from root directory (parent of backend)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Spotify OAuth Configuration
SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
SPOTIFY_REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:8080/callback/spotify')
SPOTIFY_SCOPE = 'playlist-read-private playlist-read-collaborative'

# Google/YouTube OAuth Configuration
YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube']
YOUTUBE_REDIRECT_URI = os.getenv('YOUTUBE_REDIRECT_URI', 'http://127.0.0.1:8080/callback/youtube')

# Google OAuth credentials from environment (recommended)
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')


def get_spotify_oauth():
    """Create Spotify OAuth handler"""
    return SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope=SPOTIFY_SCOPE,
        cache_handler=None  # We'll handle tokens in session
    )


def get_youtube_oauth_flow():
    """Create YouTube OAuth flow from environment variables (Google OAuth)"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise ValueError(
            "Google OAuth credentials not configured. "
            "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables. "
            "See README.md for setup instructions."
        )
    
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [YOUTUBE_REDIRECT_URI]
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=YOUTUBE_SCOPES,
        redirect_uri=YOUTUBE_REDIRECT_URI
    )
    return flow


def generate_state_token():
    """Generate a random state token for OAuth"""
    return secrets.token_urlsafe(32)


def get_spotify_client(token_info):
    """Get Spotify client with access token"""
    return spotipy.Spotify(auth=token_info['access_token'])


def is_spotify_authenticated():
    """Check if user is authenticated with Spotify"""
    token_info = session.get('spotify_token_info')
    if not token_info:
        return False
    
    # Check if token is expired
    sp_oauth = get_spotify_oauth()
    if sp_oauth.is_token_expired(token_info):
        try:
            token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
            session['spotify_token_info'] = token_info
            return True
        except:
            return False
    return True


def is_youtube_authenticated():
    """Check if user is authenticated with YouTube"""
    return 'youtube_credentials' in session
