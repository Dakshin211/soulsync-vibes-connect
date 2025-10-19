import React, { useState } from 'react';
import { Search, Play, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

const YOUTUBE_API_KEY = 'AIzaSyBr_W9YzP9i9BS3zQmrn--ApqLegBnJWdw';
const SUGGESTIONS = ['Top hits 2024', 'Chill vibes', 'Workout music', 'Party songs', 'Love songs'];

interface Video { id: string; title: string; thumbnail: string; channel: string; }

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { playSong, setQueue } = useMusicPlayer();

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setShowSuggestions(false);
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q+' official music')}&type=video&videoCategoryId=10&maxResults=30&key=${YOUTUBE_API_KEY}`);
      const data = await res.json();
      if (!data.items) { setResults([]); setLoading(false); return; }
      const ids = data.items.map((i: any) => i.id.videoId).join(',');
      const det = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${YOUTUBE_API_KEY}`);
      const dData = await det.json();
      const filtered = dData.items?.filter((i: any) => {
        const d = i.contentDetails.duration;
        const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!m) return false;
        const s = (parseInt(m[1]||'0')*3600)+(parseInt(m[2]||'0')*60)+parseInt(m[3]||'0');
        return s >= 60 && s <= 900;
      }).slice(0,20).map((i: any) => ({ id: i.id, title: i.snippet.title, thumbnail: i.snippet.thumbnails.medium?.url, channel: i.snippet.channelTitle })) || [];
      setResults(filtered);
    } catch (e) { console.error(e); setResults([]); }
    finally { setLoading(false); }
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
    <div className="p-3 md:p-8 pb-36 md:pb-32 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold mb-4 md:mb-8 bg-gradient-primary bg-clip-text text-transparent">Search</h1>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="Search songs..." className="pl-12 py-6 text-base bg-card border-border rounded-xl" />
          {showSuggestions && !results.length && (
            <Card className="absolute z-10 w-full mt-2 p-2 bg-card border-border">
              {SUGGESTIONS.map((s, i) => (
                <div key={i} onClick={() => { setQuery(s); handleSearch(s); }} className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg cursor-pointer">
                  <Search className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{s}</span>
                </div>
              ))}
            </Card>
          )}
        </form>
        {loading && <div className="flex justify-center py-12"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {results.map((v) => (
              <Card key={v.id} onClick={() => handlePlaySong(v)} className="group bg-card border-border hover:bg-card/80 cursor-pointer">
                <div className="aspect-square relative overflow-hidden">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 md:w-16 h-12 md:h-16 bg-primary rounded-full flex items-center justify-center"><Play className="w-6 md:w-8 h-6 md:h-8 text-white ml-0.5" /></div>
                  </div>
                </div>
                <div className="p-2 md:p-3">
                  <h3 className="font-semibold text-xs md:text-sm mb-0.5 line-clamp-2 leading-tight">{v.title}</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">{v.channel}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
