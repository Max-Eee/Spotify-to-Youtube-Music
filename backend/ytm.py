from ytmusicapi import YTMusic
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials


def get_video_ids(ytmusic, tracks):
    video_ids = []
    missed_tracks = {
        "count": 0,
        "tracks": []
    }
    for track in tracks:
        try:
            search_string = f"{track['name']} {track['artists'][0]}"
            video_id = ytmusic.search(search_string, filter="songs")[0]["videoId"]
            video_ids.append(video_id)
        except:
            print(f"{track['name']} {track['artists'][0]} not found on YouTube Music")
            missed_tracks["count"] += 1
            missed_tracks["tracks"].append(f"{track['name']} {track['artists'][0]}")
    print(f"Found {len(video_ids)} songs on YouTube Music")
    if len(video_ids) == 0:
        raise Exception("No songs found on YouTube Music")
    return video_ids, missed_tracks


# ===== OAUTH-BASED FUNCTIONS =====

def create_ytm_playlist_oauth(credentials, tracks, playlist_name):
    """
    Create YouTube Music playlist using OAuth credentials via YouTube Data API v3.
    This bypasses ytmusicapi's token refresh issues by using google-api-python-client directly.
    
    Args:
        credentials: Google OAuth2 credentials dict with token, refresh_token, etc.
        tracks: List of track dictionaries with 'name', 'artists', 'album'
        playlist_name: Name for the new playlist
    
    Returns:
        missed_tracks: Dictionary with count and list of tracks not found
    """
    import json
    import tempfile
    import re
    
    # Sanitize playlist name
    sanitized_name = re.sub(r'[<>]', '', playlist_name)
    sanitized_name = sanitized_name.strip().rstrip('.')
    if not sanitized_name:
        sanitized_name = "Playlist from Spotify"
    
    print(f"Original playlist name: '{playlist_name}'")
    print(f"Sanitized playlist name: '{sanitized_name}'")
    
    # Create Google OAuth2 Credentials object
    # This will handle token refresh automatically
    creds = Credentials(
        token=credentials['token'],
        refresh_token=credentials.get('refresh_token'),
        token_uri=credentials.get('token_uri', 'https://oauth2.googleapis.com/token'),
        client_id=credentials['client_id'],
        client_secret=credentials['client_secret'],
        scopes=credentials.get('scopes', ['https://www.googleapis.com/auth/youtube'])
    )
    
    print(f"\n✓ Created Google credentials object")
    print(f"  Token present: {bool(creds.token)}")
    print(f"  Refresh token present: {bool(creds.refresh_token)}")
    
    try:
        # Build YouTube Data API v3 client
        # This will automatically refresh tokens when needed
        youtube = build('youtube', 'v3', credentials=creds)
        print("✓ YouTube Data API v3 client initialized\n")
        
        # Search for tracks using ytmusicapi (better for music search)
        ytmusic_search = YTMusic()  # No auth needed for search
        video_ids, missed_tracks = get_video_ids(ytmusic_search, tracks)
        
        if not video_ids:
            raise Exception("No songs found on YouTube Music")
        
        # Check if playlist already exists
        print(f"Checking if playlist '{sanitized_name}' already exists...")
        existing_playlist_id = None
        existing_video_ids = set()
        
        try:
            # Get user's playlists
            playlists_request = youtube.playlists().list(
                part='snippet',
                mine=True,
                maxResults=50
            )
            
            while playlists_request:
                playlists_response = playlists_request.execute()
                
                for playlist in playlists_response.get('items', []):
                    if playlist['snippet']['title'] == sanitized_name:
                        existing_playlist_id = playlist['id']
                        print(f"✓ Found existing playlist with ID: {existing_playlist_id}")
                        
                        # Get existing songs in the playlist
                        playlist_items_request = youtube.playlistItems().list(
                            part='snippet',
                            playlistId=existing_playlist_id,
                            maxResults=50
                        )
                        
                        while playlist_items_request:
                            items_response = playlist_items_request.execute()
                            for item in items_response.get('items', []):
                                video_id = item['snippet']['resourceId']['videoId']
                                existing_video_ids.add(video_id)
                            
                            playlist_items_request = youtube.playlistItems().list_next(
                                playlist_items_request, items_response
                            )
                        
                        print(f"  Found {len(existing_video_ids)} existing songs in playlist")
                        break
                
                if existing_playlist_id:
                    break
                    
                playlists_request = youtube.playlists().list_next(
                    playlists_request, playlists_response
                )
        except Exception as check_error:
            print(f"⚠ Error checking existing playlists: {check_error}")
        
        # Create or use existing playlist
        if existing_playlist_id:
            playlist_id = existing_playlist_id
            print(f"\n→ Will update existing playlist\n")
        else:
            print(f"Creating new playlist '{sanitized_name}'...")
            playlist_request = youtube.playlists().insert(
                part='snippet,status',
                body={
                    'snippet': {
                        'title': sanitized_name,
                        'description': 'Transferred from Spotify using StoY'
                    },
                    'status': {
                        'privacyStatus': 'private'  # Can be 'public', 'private', or 'unlisted'
                    }
                }
            )
            playlist_response = playlist_request.execute()
            playlist_id = playlist_response['id']
            print(f"✓ Playlist created with ID: {playlist_id}\n")
        
        # Add songs to playlist using YouTube Data API v3
        # Only add songs that aren't already in the playlist
        new_video_ids = [vid for vid in video_ids if vid not in existing_video_ids]
        total_songs = len(video_ids)
        new_songs = len(new_video_ids)
        skipped_songs = len(existing_video_ids & set(video_ids))
        
        if new_songs == 0:
            print(f"✓ All {total_songs} songs already exist in the playlist. No new songs to add.\n")
        else:
            print(f"Adding {new_songs} new songs to playlist (skipping {skipped_songs} already present)...")
            
            added_count = 0
            failed_count = 0
            
            for i, video_id in enumerate(new_video_ids, 1):
                try:
                    youtube.playlistItems().insert(
                        part='snippet',
                        body={
                            'snippet': {
                                'playlistId': playlist_id,
                                'resourceId': {
                                    'kind': 'youtube#video',
                                    'videoId': video_id
                                }
                            }
                        }
                    ).execute()
                    added_count += 1
                    if i % 10 == 0:
                        print(f"  Progress: {i}/{new_songs} new songs added...")
                except Exception as add_error:
                    print(f"  ⚠ Failed to add video {video_id}: {str(add_error)}")
                    failed_count += 1
        
        print(f"\n{'='*60}")
        if existing_playlist_id:
            print(f"✓ Playlist Updated Successfully!")
        else:
            print(f"✓ Playlist Created Successfully!")
        print(f"{'='*60}")
        print(f"Playlist: {sanitized_name}")
        print(f"Total tracks in Spotify playlist: {total_songs}")
        if existing_playlist_id:
            print(f"Already in YouTube playlist: {skipped_songs}")
            print(f"New songs added: {added_count}")
        else:
            print(f"Successfully added: {added_count}")
        if failed_count > 0:
            print(f"Failed to add: {failed_count}")
        print(f"Not found on YouTube: {missed_tracks['count']}")
        print(f"{'='*60}\n")
        
        return missed_tracks
        
    except Exception as e:
        print(f"\n❌ Error in create_ytm_playlist_oauth: {e}")
        import traceback
        traceback.print_exc()
        raise

