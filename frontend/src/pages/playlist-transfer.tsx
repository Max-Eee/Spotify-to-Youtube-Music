import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogFooter,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FaSpotify, FaYoutube, FaGithub, FaStar } from "react-icons/fa";
import { CheckCircle2, ArrowRight } from "lucide-react";

// Use relative URL for Docker (proxied by nginx) or absolute URL for local dev
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8080" : "");

interface Playlist {
    id: string;
    name: string;
    description: string;
    tracks_total: number;
    image_url: string | null;
    owner: string;
    public: boolean;
}

interface MissedTracks {
    count: number;
    tracks: string[];
}

export default function PlaylistTransfer() {
    const { toast } = useToast();
    const [spotifyConnected, setSpotifyConnected] = useState(false);
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(false);
    const [transferring, setTransferring] = useState<string | null>(null);
    const [error, setError] = useState<string>("");
    const [showError, setShowError] = useState(false);
    const [missedTracks, setMissedTracks] = useState<MissedTracks | null>(null);
    const [showMissedTracks, setShowMissedTracks] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [starCount, setStarCount] = useState<number | null>(null);
    const [transferSummary, setTransferSummary] = useState<{
        playlistName: string;
        totalTracks: number;
        successfulTracks: number;
    } | null>(null);

    useEffect(() => {
        checkAuthStatus();
        fetchGitHubStars();
        
        // Check for auth callback parameter
        const params = new URLSearchParams(window.location.search);
        const authParam = params.get('auth');
        const errorParam = params.get('error');
        
        if (errorParam) {
            // Show error toast
            const service = params.get('service') || 'Authentication';
            toast({
                variant: "destructive",
                title: `${service} Failed`,
                description: decodeURIComponent(errorParam),
            });
            // Remove the parameter from URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (authParam) {
            // Show success toast
            const serviceName = authParam === 'spotify' ? 'Spotify' : 'YouTube Music';
            toast({
                title: "Connected Successfully!",
                description: `${serviceName} has been connected to your account.`,
            });
            // Remove the parameter from URL
            window.history.replaceState({}, '', window.location.pathname);
            // Recheck auth status multiple times to ensure session is propagated
            setTimeout(() => checkAuthStatus(), 500);
            setTimeout(() => checkAuthStatus(), 1000);
            setTimeout(() => checkAuthStatus(), 2000);
        }
    }, [toast]);

    useEffect(() => {
        if (spotifyConnected) {
            fetchPlaylists();
        }
    }, [spotifyConnected]);

    const checkAuthStatus = async () => {
        try {
            const [spotifyRes, youtubeRes] = await Promise.all([
                fetch(`${API_URL}/auth/spotify/status`, {
                    credentials: "include",
                }),
                fetch(`${API_URL}/auth/youtube/status`, {
                    credentials: "include",
                }),
            ]);

            const spotifyData = await spotifyRes.json();
            const youtubeData = await youtubeRes.json();

            setSpotifyConnected(spotifyData.authenticated);
            setYoutubeConnected(youtubeData.authenticated);
        } catch (err) {
            console.error("Error checking auth status:", err);
        }
    };

    const fetchGitHubStars = async () => {
        try {
            const response = await fetch("https://api.github.com/repos/Max-Eee/Spotify-to-YouTube-Music");
            if (!response.ok) {
                console.log("GitHub repo not found or API rate limit exceeded");
                return;
            }
            const data = await response.json();
            if (data.stargazers_count !== undefined) {
                setStarCount(data.stargazers_count);
            }
        } catch (err) {
            console.log("Could not fetch GitHub stars:", err);
            // Silently fail - star count is optional
        }
    };

    const connectSpotify = () => {
        // Direct redirect to maintain session
        window.location.href = `${API_URL}/auth/spotify`;
    };

    const connectYoutube = () => {
        // Direct redirect to maintain session
        window.location.href = `${API_URL}/auth/youtube`;
    };

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/playlists`, {
                credentials: "include",
            });
            const data = await res.json();

            if (res.ok) {
                setPlaylists(data.playlists);
            } else {
                setError(data.error || "Failed to fetch playlists");
                setShowError(true);
            }
        } catch (err) {
            setError("Network error while fetching playlists");
            setShowError(true);
        } finally {
            setLoading(false);
        }
    };

    const transferPlaylist = async (playlistId: string) => {
        if (!youtubeConnected) {
            setError("Please connect to YouTube Music first");
            setShowError(true);
            return;
        }

        setTransferring(playlistId);
        try {
            const playlist = playlists.find(p => p.id === playlistId);
            const res = await fetch(`${API_URL}/transfer/${playlistId}`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();

            if (res.ok) {
                const totalTracks = playlist?.tracks_total || 0;
                const missedCount = data.missed_tracks?.count || 0;
                const successfulTracks = totalTracks - missedCount;

                setTransferSummary({
                    playlistName: playlist?.name || "Playlist",
                    totalTracks,
                    successfulTracks,
                });

                if (data.missed_tracks && data.missed_tracks.count > 0) {
                    setMissedTracks(data.missed_tracks);
                    setShowMissedTracks(true);
                } else {
                    setShowSuccess(true);
                }
            } else {
                setError(data.error || "Failed to transfer playlist");
                setShowError(true);
            }
        } catch (err) {
            setError("Network error while transferring playlist");
            setShowError(true);
        } finally {
            setTransferring(null);
        }
    };

    return (
        <>
            <div className={`min-h-screen bg-black pb-20 ${!spotifyConnected ? 'flex items-center justify-center' : ''}`}>
                <div className={`w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 ${!spotifyConnected ? 'max-w-6xl' : 'py-6 sm:py-8 lg:py-12'}`}>
                    <div className="mt-6 sm:mt-8 mb-6 sm:mb-8 text-center">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 flex items-center justify-center gap-2 sm:gap-3">
                            <span className="text-[#1DB954]">Transfer</span>
                            <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-foreground" />
                            <span className="text-[#FF0000]">Playlists</span>
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Connect your accounts and transfer playlists from
                            Spotify to YouTube Music
                        </p>
                    </div>

                    {/* Connection Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12 max-w-4xl mx-auto">
                        <Card className="border hover:border-[#1DB954]/50 transition-all duration-300 hover:shadow-xl bg-black/40 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[#1DB954]/10">
                                            <FaSpotify className="text-[#1DB954] text-xl" />
                                        </div>
                                        <span>Spotify</span>
                                    </div>
                                    {spotifyConnected && (
                                        <div className="flex items-center gap-1 text-[#1DB954] text-sm font-semibold">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Connected
                                        </div>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {spotifyConnected ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-[#1DB954]/30 hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
                                        onClick={() =>
                                            fetch(
                                                `${API_URL}/auth/spotify/logout`,
                                                {
                                                    method: "POST",
                                                    credentials: "include",
                                                }
                                            ).then(() => {
                                                setSpotifyConnected(false);
                                                setPlaylists([]);
                                            })
                                        }
                                    >
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={connectSpotify}
                                        className="w-full bg-[#1DB954] hover:bg-[#1DB954]/90 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                    >
                                        <FaSpotify className="mr-2" />
                                        Connect to Spotify
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border hover:border-[#FF0000]/50 transition-all duration-300 hover:shadow-xl bg-black/40 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[#FF0000]/10">
                                            <FaYoutube className="text-[#FF0000] text-xl" />
                                        </div>
                                        <span>YouTube Music</span>
                                    </div>
                                    {youtubeConnected && (
                                        <div className="flex items-center gap-1 text-[#FF0000] text-sm font-semibold">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Connected
                                        </div>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {youtubeConnected ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-[#FF0000]/30 hover:bg-[#FF0000]/10 hover:text-[#FF0000]"
                                        onClick={() =>
                                            fetch(
                                                `${API_URL}/auth/youtube/logout`,
                                                {
                                                    method: "POST",
                                                    credentials: "include",
                                                }
                                            ).then(() =>
                                                setYoutubeConnected(false)
                                            )
                                        }
                                    >
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={connectYoutube}
                                        className="w-full bg-[#FF0000] hover:bg-[#FF0000]/90 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                    >
                                        <FaYoutube className="mr-2" />
                                        Connect to YouTube Music
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Playlists Grid */}
                    {spotifyConnected && (
                        <div className="w-full">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">
                                Your Playlists
                            </h2>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                </div>
                            ) : playlists.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No playlists found
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 lg:gap-6 w-full">
                                    {playlists.map((playlist) => (
                                        <Card key={playlist.id} className="group hover:shadow-2xl transition-all duration-300 border hover:border-primary/50 overflow-hidden bg-black/40 backdrop-blur-sm">
                                            <CardContent className="p-0">
                                                <div className="relative aspect-square overflow-hidden">
                                                    {playlist.image_url ? (
                                                        <img
                                                            src={playlist.image_url}
                                                            alt={playlist.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                                            <FaSpotify className="text-4xl text-muted-foreground/40" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center p-4">
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                transferPlaylist(
                                                                    playlist.id
                                                                )
                                                            }
                                                            disabled={
                                                                transferring ===
                                                                    playlist.id ||
                                                                !youtubeConnected
                                                            }
                                                            className="w-full bg-[#1DB954] hover:bg-[#1DB954]/90 text-white font-semibold text-xs shadow-lg"
                                                        >
                                                            {transferring ===
                                                            playlist.id
                                                                ? "Transferring..."
                                                                : "Transfer"}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-1">
                                                    <h3 className="font-semibold text-sm truncate" title={playlist.name}>
                                                        {playlist.name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {playlist.tracks_total} tracks
                                                    </p>
                                                    {playlist.description && (
                                                        <p className="text-xs text-muted-foreground truncate" title={playlist.description}>
                                                            {playlist.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with GitHub Link */}
                <footer className="fixed bottom-0 left-0 right-0 py-4 backdrop-blur-sm border-t border-border/30" style={{ zIndex: 10, background: 'rgba(0, 0, 0, 0.3)' }}>
                    <div className="flex items-center justify-center gap-4">
                        <a 
                            href="https://github.com/Max-Eee/Spotify-to-YouTube-Music" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                            <FaGithub className="text-xl" />
                            <span className="font-semibold">Star the Repo</span>
                        </a>
                        {starCount !== null && typeof starCount === 'number' && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-yellow-400 rounded-lg shadow-lg border border-yellow-400/20">
                                <FaStar className="text-lg" />
                                <span className="font-bold">{starCount.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </footer>
            </div>

            {/* Error Dialog */}
            <AlertDialog open={showError} onOpenChange={setShowError}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Error</AlertDialogTitle>
                        <AlertDialogDescription>
                            {error}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setShowError(false)}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Success Dialog */}
            <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
                <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg sm:text-xl">✅ Transfer Complete!</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 pt-2">
                                <p className="text-sm sm:text-base">
                                    Playlist transferred successfully to YouTube Music!
                                </p>
                                {transferSummary && (
                                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
                                        <div className="font-semibold text-foreground text-sm sm:text-base">
                                            📊 Transfer Summary
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Playlist:</span>
                                            <span className="font-medium text-foreground">{transferSummary.playlistName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Tracks:</span>
                                            <span className="font-medium text-foreground">{transferSummary.totalTracks}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600 dark:text-green-400">
                                            <span>✓ Successfully Transferred:</span>
                                            <span className="font-bold">{transferSummary.successfulTracks}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setShowSuccess(false)}
                            className="w-full sm:w-auto"
                        >
                            Close
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Missed Tracks Dialog */}
            <AlertDialog
                open={showMissedTracks}
                onOpenChange={setShowMissedTracks}
            >
                <AlertDialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <AlertDialogHeader className="flex-shrink-0">
                        <AlertDialogTitle className="text-lg sm:text-xl">
                            ⚠️ Transfer Complete with Some Issues
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 pt-2">
                                {transferSummary && (
                                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
                                        <div className="font-semibold text-foreground text-sm sm:text-base">
                                            📊 Transfer Summary
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Playlist:</span>
                                            <span className="font-medium text-foreground truncate ml-2 max-w-[60%]" title={transferSummary.playlistName}>{transferSummary.playlistName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Tracks:</span>
                                            <span className="font-medium text-foreground">{transferSummary.totalTracks}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600 dark:text-green-400">
                                            <span>✓ Successfully Transferred:</span>
                                            <span className="font-bold">{transferSummary.successfulTracks}</span>
                                        </div>
                                        <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                            <span>⚠ Not Found:</span>
                                            <span className="font-bold">{missedTracks?.count}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="text-sm sm:text-base">
                                    <p className="mb-2 font-semibold text-foreground">
                                        {missedTracks?.count} song{missedTracks?.count !== 1 ? 's' : ''} couldn't be found on YouTube Music:
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
                        <div className="space-y-2">
                            {missedTracks?.tracks.map((track, index) => {
                                const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(track)}`;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <span className="text-muted-foreground text-xs sm:text-sm mt-1 flex-shrink-0">
                                            {index + 1}.
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs sm:text-sm text-foreground break-words">
                                                {track}
                                            </p>
                                        </div>
                                        <a
                                            href={searchUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 inline-flex items-center gap-1 px-2 sm:px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                                        >
                                            <FaYoutube className="text-sm" />
                                            <span className="hidden sm:inline">Search</span>
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <AlertDialogFooter className="flex-shrink-0">
                        <AlertDialogAction
                            onClick={() => setShowMissedTracks(false)}
                            className="w-full sm:w-auto"
                        >
                            Close
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
