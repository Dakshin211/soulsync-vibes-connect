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
          query + ' official music'
        )}&type=video&videoCategoryId=10&maxResults=${maxResults * 2}&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      if (!data.items) return [];

      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const detailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );
      const detailsData = await detailsResponse.json();

      return detailsData.items?.filter((item: any) => {
        const duration = item.contentDetails.duration;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return false;
        const totalSec = (parseInt(match[1]||'0')*3600) + (parseInt(match[2]||'0')*60) + parseInt(match[3]||'0');
        return totalSec >= 60 && totalSec <= 900;
      }).slice(0, maxResults).map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url,
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
    <div className="p-3 md:p-8 space-y-4 md:space-y-8 animate-fade-in pb-36 md:pb-32">
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-primary p-6 md:p-12 shadow-glow-violet">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-5xl font-bold text-white mb-2 md:mb-4">Welcome to SoulSync</h1>
          <p className="text-sm md:text-xl text-white/90">Discover and sync your music</p>
        </div>
      </div>

      {recommendedSongs.length > 0 && (
        <section>
          <h2 className="text-lg md:text-3xl font-bold mb-3 md:mb-6 bg-gradient-primary bg-clip-text text-transparent">Recommended</h2>
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide">
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6 pb-2">
              {recommendedSongs.map((song) => (
                <Card key={song.id} onClick={() => handlePlaySong(song, recommendedSongs)} className="group flex-shrink-0 w-[140px] md:w-auto bg-card border-border hover:bg-card/80 transition-all cursor-pointer">
                  <div className="aspect-square relative overflow-hidden">
                    <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 md:w-16 h-12 md:h-16 bg-primary rounded-full flex items-center justify-center"><Play className="w-6 md:w-8 h-6 md:h-8 text-white ml-0.5" /></div>
                    </div>
                  </div>
                  <div className="p-2 md:p-4">
                    <h3 className="font-semibold text-xs md:text-base line-clamp-1">{song.title}</h3>
                    <p className="text-[10px] md:text-sm text-muted-foreground line-clamp-1">{song.artist}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg md:text-3xl font-bold mb-3 md:mb-6 bg-gradient-primary bg-clip-text text-transparent">Trending</h2>
        <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide">
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6 pb-2">
            {trendingSongs.map((song) => (
              <Card key={song.id} onClick={() => handlePlaySong(song, trendingSongs)} className="group flex-shrink-0 w-[140px] md:w-auto bg-card border-border hover:bg-card/80 transition-all cursor-pointer">
                <div className="aspect-square relative overflow-hidden">
                  <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 md:w-16 h-12 md:h-16 bg-primary rounded-full flex items-center justify-center"><Play className="w-6 md:w-8 h-6 md:h-8 text-white ml-0.5" /></div>
                  </div>
                </div>
                <div className="p-2 md:p-4">
                  <h3 className="font-semibold text-xs md:text-base line-clamp-1">{song.title}</h3>
                  <p className="text-[10px] md:text-sm text-muted-foreground line-clamp-1">{song.artist}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
