from flask import Flask, request, redirect, session, jsonify
from flask_cors import CORS
from ytm import create_ytm_playlist_oauth
from spotify import get_user_playlists, get_playlist_tracks_oauth
import os
from pathlib import Path
from dotenv import load_dotenv
from auth import (
    get_spotify_oauth, get_youtube_oauth_flow, generate_state_token,
    get_spotify_client, is_spotify_authenticated, is_youtube_authenticated
)
import secrets

# Load .env from root directory (parent of backend)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')

# Simple in-memory state storage
# For production with multiple containers, use Redis or a database
oauth_states = {}

# Configure session
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_NAME'] = 'StoY_session'
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour

CORS(app, 
     origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000'), 'http://localhost:3000', 'http://127.0.0.1:3000'],
     supports_credentials=True,
     allow_headers=["Content-Type"],
     methods=["GET", "POST", "OPTIONS"]
)


@app.route('/', methods=['GET'])
def home():
    # Render health check endpoint
    return {"message": "Server Online"}, 200


# ===== SPOTIFY OAUTH ROUTES =====

@app.route('/auth/spotify', methods=['GET'])
def spotify_auth():
    """Initiate Spotify OAuth flow"""
    state = generate_state_token()
    # Store state both in session AND in-memory for fallback
    session['spotify_oauth_state'] = state
    oauth_states[state] = {'timestamp': __import__('time').time(), 'type': 'spotify'}
    session.permanent = True
    session.modified = True
    
    sp_oauth = get_spotify_oauth()
    auth_url = sp_oauth.get_authorize_url(state=state)
    
    # Direct redirect to maintain session
    return redirect(auth_url)


@app.route('/callback/spotify', methods=['GET'])
def spotify_callback():
    """Handle Spotify OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Try session first, fallback to in-memory
    stored_state = session.get('spotify_oauth_state')
    valid_state = stored_state == state if stored_state else state in oauth_states
    
    # Verify state
    if not valid_state:
        return {"error": "Invalid or expired state"}, 400
    
    # Clear the state after use
    session.pop('spotify_oauth_state', None)
    oauth_states.pop(state, None)
    
    sp_oauth = get_spotify_oauth()
    try:
        token_info = sp_oauth.get_access_token(code)
        
        # Store token in session
        session['spotify_token_info'] = token_info
        session.permanent = True
        session.modified = True
        
        # Direct redirect without intermediate page
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f'{frontend_url}?auth=spotify')
    except Exception as e:
        import traceback
        import urllib.parse
        traceback.print_exc()
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        error_msg = urllib.parse.quote(str(e))
        return redirect(f'{frontend_url}?error={error_msg}&service=Spotify')


@app.route('/auth/spotify/status', methods=['GET'])
def spotify_auth_status():
    """Check if user is authenticated with Spotify"""
    print(f"[DEBUG] /auth/spotify/status - Session ID: {session.get('_id', 'NO SESSION')}")
    print(f"[DEBUG] /auth/spotify/status - Has spotify_token_info: {bool(session.get('spotify_token_info'))}")
    print(f"[DEBUG] /auth/spotify/status - Request cookies: {request.cookies}")
    token_info = session.get('spotify_token_info')
    return {"authenticated": token_info is not None}, 200


@app.route('/auth/spotify/logout', methods=['POST'])
def spotify_logout():
    """Logout from Spotify"""
    session.pop('spotify_token_info', None)
    return {"message": "Logged out successfully"}, 200


# ===== YOUTUBE OAUTH ROUTES =====

@app.route('/auth/youtube', methods=['GET'])
def youtube_auth():
    """Initiate YouTube OAuth flow"""
    try:
        flow = get_youtube_oauth_flow()
        state = generate_state_token()
        # Store state both in session AND in-memory for fallback
        session['youtube_oauth_state'] = state
        oauth_states[state] = {'timestamp': __import__('time').time(), 'type': 'youtube'}
        session.permanent = True
        session.modified = True
        
        # CRITICAL: Use prompt='consent' to force refresh token generation
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            prompt='consent',  # Force consent screen to get refresh token
            include_granted_scopes='true',
            state=state
        )
        
        # Direct redirect to maintain session
        return redirect(authorization_url)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


@app.route('/callback/youtube', methods=['GET'])
def youtube_callback():
    """Handle YouTube OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Try session first, fallback to in-memory
    stored_state = session.get('youtube_oauth_state')
    valid_state = stored_state == state if stored_state else state in oauth_states
    
    # Verify state
    if not valid_state:
        return {"error": "Invalid or expired state"}, 400
    
    # Clear the state after use
    session.pop('youtube_oauth_state', None)
    oauth_states.pop(state, None)
    
    try:
        flow = get_youtube_oauth_flow()
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        youtube_creds = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        session['youtube_credentials'] = youtube_creds
        session.permanent = True
        session.modified = True
        
        # Direct redirect without intermediate page
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f'{frontend_url}?auth=youtube')
    except Exception as e:
        import traceback
        import urllib.parse
        traceback.print_exc()
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        error_msg = urllib.parse.quote(str(e))
        return redirect(f'{frontend_url}?error={error_msg}&service=YouTube%20Music')


@app.route('/auth/youtube/status', methods=['GET'])
def youtube_auth_status():
    """Check if user is authenticated with YouTube"""
    creds_present = 'youtube_credentials' in session
    return {"authenticated": creds_present}, 200


@app.route('/auth/youtube/logout', methods=['POST'])
def youtube_logout():
    """Logout from YouTube"""
    session.pop('youtube_credentials', None)
    return {"message": "Logged out successfully"}, 200


# ===== PLAYLIST ROUTES =====

@app.route('/playlists', methods=['GET'])
def get_playlists():
    """Get user's Spotify playlists"""
    print(f"[DEBUG] /playlists - Session ID: {session.get('_id', 'NO SESSION')}")
    print(f"[DEBUG] /playlists - Has spotify_token_info: {bool(session.get('spotify_token_info'))}")
    print(f"[DEBUG] /playlists - Request origin: {request.headers.get('Origin', 'NO ORIGIN')}")
    print(f"[DEBUG] /playlists - Request cookies: {request.cookies}")
    
    if not is_spotify_authenticated():
        return {"error": "Not authenticated with Spotify"}, 401
    
    try:
        token_info = session.get('spotify_token_info')
        sp = get_spotify_client(token_info)
        playlists = get_user_playlists(sp)
        return {"playlists": playlists}, 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


@app.route('/transfer/<playlist_id>', methods=['POST'])
def transfer_playlist(playlist_id):
    """Transfer a Spotify playlist to YouTube Music"""
    if not is_spotify_authenticated():
        return {"error": "Not authenticated with Spotify"}, 401
    
    if not is_youtube_authenticated():
        return {"error": "Not authenticated with YouTube Music"}, 401
    
    try:
        # Get Spotify tracks
        token_info = session.get('spotify_token_info')
        sp = get_spotify_client(token_info)
        tracks, playlist_name = get_playlist_tracks_oauth(sp, playlist_id)
        
        # Get YouTube credentials (pass as dict)
        creds_dict = session.get('youtube_credentials')
        
        # Create YouTube Music playlist
        missed_tracks = create_ytm_playlist_oauth(creds_dict, tracks, playlist_name)
        
        return {
            "message": "Playlist transferred successfully!",
            "missed_tracks": missed_tracks
        }, 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


if __name__ == '__main__':
    # Startup message is handled by Gunicorn config
    app.run(host='0.0.0.0', port=8080, debug=False)