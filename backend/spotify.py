# ===== OAUTH-BASED FUNCTIONS =====

def get_user_playlists(sp_client):
    """Get all playlists for the authenticated user using Spotipy client"""
    playlists = []
    results = sp_client.current_user_playlists(limit=50)
    
    while results:
        for item in results['items']:
            playlists.append({
                'id': item['id'],
                'name': item['name'],
                'description': item.get('description', ''),
                'tracks_total': item['tracks']['total'],
                'image_url': item['images'][0]['url'] if item['images'] else None,
                'owner': item['owner']['display_name'],
                'public': item.get('public', False)
            })
        
        # Get next page if available
        if results['next']:
            results = sp_client.next(results)
        else:
            results = None
    
    return playlists


def get_playlist_tracks_oauth(sp_client, playlist_id):
    """Get tracks from a playlist using OAuth authenticated Spotipy client"""
    tracks = []
    playlist_name = ""
    
    # Get playlist details
    playlist = sp_client.playlist(playlist_id)
    playlist_name = playlist['name']
    
    # Get all tracks
    results = sp_client.playlist_tracks(playlist_id, limit=100)
    
    while results:
        for item in results['items']:
            track = item.get('track')
            if not track or track.get('is_local') or track.get('restrictions'):
                continue
            
            tracks.append({
                "name": track["name"],
                "artists": [artist["name"] for artist in track["artists"]],
                "album": track["album"]["name"],
            })
        
        # Get next page if available
        if results['next']:
            results = sp_client.next(results)
        else:
            results = None
    
    return tracks, playlist_name
    
    


