import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { getArtistSongs, formatDuration } from '@/services/youtubeApi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  getCachedMusicData, 
  storeMusicData, 
  fetchTopTrending, 
  fetchGlobalHits, 
  fetchRegionalHits,
  fetchFamousArtists,
  refreshDailyMusicData
} from '@/services/dailyMusicData';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
}

interface Artist {
  id: string;
  name: string;
  image: string;
}

export default function Home() {
  const { playSong, setQueue } = useMusicPlayer();
  const { currentUser } = useAuth();
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [globalHits, setGlobalHits] = useState<Song[]>([]);
  const [regionalHits, setRegionalHits] = useState<Song[]>([]);
  const [famousArtists, setFamousArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        
        // Check if we need to refresh daily data
        const lastRefresh = localStorage.getItem('lastMusicDataRefresh');
        const today = new Date().toDateString();
        
        if (!lastRefresh || lastRefresh !== today) {
          await refreshDailyMusicData();
          localStorage.setItem('lastMusicDataRefresh', today);
        }
        
        // Fetch trending songs from cache or API
        let trending = await getCachedMusicData('trending');
        if (!trending) {
          trending = await fetchTopTrending();
          await storeMusicData('trending', trending);
        }
        setTrendingSongs(trending);
        
        // Fetch global hits from cache or API
        let hits = await getCachedMusicData('globalHits');
        if (!hits) {
          hits = await fetchGlobalHits();
          await storeMusicData('globalHits', hits);
        }
        setGlobalHits(hits);
        
        // Fetch regional hits from cache or API
        let regional = await getCachedMusicData('regionalHits');
        if (!regional) {
          regional = await fetchRegionalHits();
          await storeMusicData('regionalHits', regional);
        }
        setRegionalHits(regional);
        
        // Fetch famous artists from cache or API
        let artists = await getCachedMusicData('famousArtists');
        if (!artists) {
          artists = await fetchFamousArtists();
          await storeMusicData('famousArtists', artists);
        }
        setFamousArtists(artists);
        
        // Get user's favorite artists for recommendations (their famous songs)
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
          const favoriteArtists = userDoc.data()?.favoriteArtists || [];
          
          if (favoriteArtists.length > 0) {
            const recommended: Song[] = [];
            for (const artist of favoriteArtists.slice(0, 5)) {
              // Search for the artist's most popular/famous songs
              const songs = await getArtistSongs(`${artist.name} top songs popular`, 5);
              recommended.push(...songs);
            }
            setRecommendedSongs(recommended.slice(0, 20));
          }
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [currentUser]);

  const handlePlaySong = (song: Song, allSongs: Song[]) => {
    playSong(song);
    setQueue(allSongs);
  };

  const handleArtistClick = async (artist: Artist) => {
    const songs = await getArtistSongs(artist.name, 20);
    if (songs.length > 0) {
      playSong(songs[0]);
      setQueue(songs);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner message="Loading your music..." />
      </div>
    );
  }

  const SongCard = ({ song, onClick }: { song: Song; onClick: () => void }) => (
    <Card 
      className="flex-shrink-0 w-36 bg-card/50 backdrop-blur border-border hover:bg-card/80 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative">
        <img 
          src={song.thumbnail} 
          alt={song.title}
          className="w-full h-36 object-cover rounded-t"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-12 h-12 text-white" fill="white" />
        </div>
      </div>
      <div className="p-2">
        <h3 className="font-semibold text-sm truncate">{song.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
        {song.duration && (
          <p className="text-xs text-muted-foreground mt-1">{formatDuration(song.duration)}</p>
        )}
      </div>
    </Card>
  );

  const ArtistCard = ({ artist, onClick }: { artist: Artist; onClick: () => void }) => (
    <div 
      className="flex-shrink-0 w-32 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative mb-2">
        <img 
          src={artist.image} 
          alt={artist.name}
          className="w-32 h-32 rounded-full object-cover border-2 border-primary/20 group-hover:border-primary transition-all"
        />
      </div>
      <p className="text-sm font-medium text-center truncate">{artist.name}</p>
    </div>
  );

  return (
    <div className="p-4 pb-32 animate-fade-in bg-background">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
        Home
      </h1>

      {/* Top Trending Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3">Top Trending</h2>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {trendingSongs.slice(0, 10).map((song) => (
            <SongCard 
              key={song.id}
              song={song}
              onClick={() => handlePlaySong(song, trendingSongs)}
            />
          ))}
        </div>
      </section>

      {/* Recommended For You Section */}
      {recommendedSongs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Recommended For You</h2>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {recommendedSongs.slice(0, 10).map((song) => (
              <SongCard 
                key={song.id}
                song={song}
                onClick={() => handlePlaySong(song, recommendedSongs)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Global Hit Songs Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3">Global Hit Songs</h2>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {globalHits.slice(0, 10).map((song) => (
            <SongCard 
              key={song.id}
              song={song}
              onClick={() => handlePlaySong(song, globalHits)}
            />
          ))}
        </div>
      </section>

      {/* Regional Hits Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3">Regional Hits (India)</h2>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {regionalHits.slice(0, 10).map((song) => (
            <SongCard 
              key={song.id}
              song={song}
              onClick={() => handlePlaySong(song, regionalHits)}
            />
          ))}
        </div>
      </section>

      {/* Famous Artists Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3">Famous Artists</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {famousArtists.map((artist) => (
            <ArtistCard 
              key={artist.id}
              artist={artist}
              onClick={() => handleArtistClick(artist)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
