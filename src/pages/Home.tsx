import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

const YOUTUBE_API_KEY = 'AIzaSyBr_W9YzP9i9BS3zQmrn--ApqLegBnJWdw';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

export default function Home() {
  const { currentUser } = useAuth();
  const { playSong, setQueue } = useMusicPlayer();
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, [currentUser]);

  const loadHomeData = async () => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'Users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const favoriteArtists = userData?.favoriteArtists || [];

      if (favoriteArtists.length > 0) {
        const recommendedQuery = favoriteArtists.slice(0, 3).join(' ');
        const recommended = await searchYouTube(recommendedQuery, 8);
        setRecommendedSongs(recommended);
      }

      const trending = await searchYouTube('top hits 2024', 8);
      setTrendingSongs(trending);

      setLoading(false);
    } catch (error) {
      console.error('Error loading home data:', error);
      setLoading(false);
    }
  };

  const searchYouTube = async (query: string, maxResults: number = 8): Promise<Song[]> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query + ' music'
        )}&type=video&videoCategoryId=10&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();

      return data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high.url,
      })) || [];
    } catch (error) {
      console.error('YouTube search error:', error);
      return [];
    }
  };

  const handlePlaySong = (song: Song, songList: Song[]) => {
    playSong(song);
    setQueue(songList);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-32">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-8 md:p-12 shadow-glow-violet">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Welcome to SoulSync
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl">
            Discover, share, and sync your music journey with friends in real-time
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/30 rounded-full blur-3xl"></div>
      </div>

      {recommendedSongs.length > 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Recommended For You
          </h2>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-4">
              {recommendedSongs.map((song) => (
                <Card
                  key={song.id}
                  onClick={() => handlePlaySong(song, recommendedSongs)}
                  className="group flex-shrink-0 w-[280px] md:w-auto bg-card border-border hover:bg-card/80 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="aspect-square bg-gradient-glow relative overflow-hidden">
                    <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-glow-violet">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-base md:text-lg mb-1 line-clamp-1">{song.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{song.artist}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Trending Now
        </h2>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-4">
            {trendingSongs.map((song) => (
              <Card
                key={song.id}
                onClick={() => handlePlaySong(song, trendingSongs)}
                className="group flex-shrink-0 w-[280px] md:w-auto bg-card border-border hover:bg-card/80 transition-all cursor-pointer overflow-hidden"
              >
                <div className="aspect-square bg-gradient-glow relative overflow-hidden">
                  <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-glow-violet">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-base md:text-lg mb-1 line-clamp-1">{song.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{song.artist}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
