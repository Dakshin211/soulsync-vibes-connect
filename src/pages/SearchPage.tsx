import React, { useState } from 'react';
import { Search, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

const YOUTUBE_API_KEY = 'AIzaSyBr_W9YzP9i9BS3zQmrn--ApqLegBnJWdw';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const { playSong, setQueue } = useMusicPlayer();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery + ' music'
        )}&type=video&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      
      const videos = data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        channel: item.snippet.channelTitle,
      })) || [];
      
      setResults(videos);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (video: Video) => {
    const song = {
      id: video.id,
      title: video.title,
      artist: video.channel,
      thumbnail: video.thumbnail,
    };
    
    const songsQueue = results.map(v => ({
      id: v.id,
      title: v.title,
      artist: v.channel,
      thumbnail: v.thumbnail,
    }));
    
    playSong(song);
    setQueue(songsQueue);
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in pb-32">
      <div className="max-w-4xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Search for songs, artists, or albums..."
            className="pl-12 h-12 md:h-14 text-base md:text-lg bg-input border-border"
          />
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {results.map((video) => (
          <div
            key={video.id}
            onClick={() => handlePlaySong(video)}
            className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-glow-violet transition-all cursor-pointer"
          >
            <div className="relative aspect-video">
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-glow-violet">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold line-clamp-2 mb-1 text-sm md:text-base">{video.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{video.channel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
