import { useState, useEffect, useRef } from 'react';
import { Search, Play, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { searchYouTube, formatDuration } from '@/services/youtubeApi';
import { collection, addDoc, query as firestoreQuery, where, orderBy, limit, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// No longer using hardcoded suggestions

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
}

export default function SearchPage() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { playSong, setQueue } = useMusicPlayer();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadRecentSearches();
  }, [currentUser]);

  const loadRecentSearches = async () => {
    if (!currentUser) return;
    
    try {
      const q = firestoreQuery(
        collection(db, 'RecentSearches'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const searches = snapshot.docs.map(doc => (doc.data() as { query: string }).query);
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveSearch = async (searchQuery: string) => {
    if (!currentUser || !searchQuery.trim()) return;
    
    try {
      // Check if we have more than 10 searches, delete oldest
      const allSearchesQuery = firestoreQuery(
        collection(db, 'RecentSearches'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      const allSnapshot = await getDocs(allSearchesQuery);
      
      if (allSnapshot.docs.length >= 10) {
        const oldestDoc = allSnapshot.docs[allSnapshot.docs.length - 1];
        await deleteDoc(oldestDoc.ref);
      }
      
      await addDoc(collection(db, 'RecentSearches'), {
        userId: currentUser.uid,
        query: searchQuery,
        timestamp: serverTimestamp(),
      });
      loadRecentSearches();
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setShowSuggestions(false);
    
    try {
      const songs = await searchYouTube(searchQuery, 20);
      // Filter for full-length tracks (1-15 minutes)
      const filteredSongs = songs.filter(song => {
        const duration = song.duration || 0;
        return duration >= 60 && duration <= 900;
      });
      setResults(filteredSongs);
      saveSearch(searchQuery);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    
    // Clear previous timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce search by 300ms
    if (value.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        handleSearch(value);
      }, 300);
    } else {
      setResults([]);
    }
  };

  const handlePlaySong = (song: Song) => {
    playSong(song);
    setQueue(results);
  };

  return (
    <div className="p-4 pb-32 animate-fade-in bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Search
        </h1>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            value={query} 
            onChange={(e) => handleQueryChange(e.target.value)} 
            onFocus={() => setShowSuggestions(true)} 
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
            placeholder="Search songs, artists..." 
            className="pl-12 py-6 text-base bg-card border-border rounded-xl" 
          />
          
          {showSuggestions && !results.length && recentSearches.length > 0 && (
            <Card className="absolute z-10 w-full mt-2 p-2 bg-card border-border animate-fade-in">
              <div className="px-3 py-2 text-xs text-muted-foreground font-semibold">Recent Searches</div>
              {recentSearches.map((search, i) => (
                <div 
                  key={i} 
                  onClick={() => { setQuery(search); handleSearch(search); }} 
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{search}</span>
                </div>
              ))}
            </Card>
          )}
        </form>
        
        {loading && (
          <div className="flex justify-center py-12 animate-fade-in">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          </div>
        )}
        
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map((song) => (
              <Card 
                key={song.id} 
                onClick={() => handlePlaySong(song)} 
                className="group bg-card border-border hover:bg-card/80 cursor-pointer"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img 
                    src={song.thumbnail} 
                    alt={song.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <h3 className="font-semibold text-xs mb-0.5 line-clamp-2 leading-tight">{song.title}</h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{song.artist}</p>
                  {song.duration && (
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDuration(song.duration)}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
