import React, { useState } from 'react';
import { Music, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const YOUTUBE_API_KEY = 'AIzaSyBr_W9YzP9i9BS3zQmrn--ApqLegBnJWdw';

interface Artist {
  id: string;
  name: string;
  thumbnail: string;
}

const POPULAR_ARTISTS = [
  'Taylor Swift', 'Ed Sheeran', 'The Weeknd', 'Drake', 'Ariana Grande',
  'Billie Eilish', 'Post Malone', 'Justin Bieber', 'Dua Lipa', 'Bad Bunny'
];

interface FavoriteArtistsSelectionProps {
  onComplete: () => void;
}

export default function FavoriteArtistsSelection({ onComplete }: FavoriteArtistsSelectionProps) {
  const { currentUser } = useAuth();
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [popularArtists, setPopularArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  React.useEffect(() => {
    loadPopularArtists();
  }, []);

  const loadPopularArtists = async () => {
    const artists = await Promise.all(
      POPULAR_ARTISTS.map(async (name) => {
        const result = await searchArtist(name);
        return result[0] || { id: name, name, thumbnail: '' };
      })
    );
    setPopularArtists(artists);
  };

  const searchArtist = async (query: string): Promise<Artist[]> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query + ' artist'
        )}&type=channel&maxResults=5&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();

      return data.items?.map((item: any) => ({
        id: item.id.channelId || item.snippet.channelId,
        name: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      })) || [];
    } catch (error) {
      console.error('Artist search error:', error);
      return [];
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchArtist(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const toggleArtist = (artistName: string) => {
    setSelectedArtists(prev =>
      prev.includes(artistName)
        ? prev.filter(a => a !== artistName)
        : prev.length < 10 ? [...prev, artistName] : prev
    );
  };

  const handleSubmit = async () => {
    if (selectedArtists.length < 3) {
      toast.error('Please select at least 3 artists');
      return;
    }

    if (!currentUser) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'Users', currentUser.uid), {
        favoriteArtists: selectedArtists,
      });
      toast.success('Favorite artists saved!');
      onComplete();
    } catch (error) {
      toast.error('Failed to save artists');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl p-4 md:p-8 bg-card/90 backdrop-blur-glass border-border animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center mb-4 md:mb-6">
          <Music className="w-10 h-10 md:w-12 md:h-12 text-primary mb-2 md:mb-3 animate-glow-pulse" />
          <h1 className="text-xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent text-center">
            Choose Your Favorite Artists
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-2 text-center">
            Select at least 3 artists ({selectedArtists.length}/10)
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 md:mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for artists..."
                className="pl-10 bg-input border-border text-sm"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching} className="bg-primary hover:bg-primary/90 text-sm">
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 md:mb-6">
            <h3 className="text-xs md:text-sm font-semibold mb-2 md:mb-3 text-foreground">Search Results</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
              {searchResults.map((artist) => (
                <Card
                  key={artist.id}
                  onClick={() => toggleArtist(artist.name)}
                  className={`cursor-pointer p-2 md:p-3 text-center transition-all hover:scale-105 ${
                    selectedArtists.includes(artist.name)
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/50 border-border'
                  }`}
                >
                  <div className="relative">
                    {artist.thumbnail ? (
                      <img
                        src={artist.thumbnail}
                        alt={artist.name}
                        className="w-full aspect-square object-cover rounded-md md:rounded-lg mb-1 md:mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-muted rounded-md md:rounded-lg mb-1 md:mb-2 flex items-center justify-center">
                        <Music className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                      </div>
                    )}
                    {selectedArtists.includes(artist.name) && (
                      <div className="absolute top-0 right-0 bg-primary rounded-full p-0.5 md:p-1">
                        <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs font-medium truncate">{artist.name}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Popular Artists */}
        <div>
          <h3 className="text-xs md:text-sm font-semibold mb-2 md:mb-3 text-foreground">Popular Artists</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 max-h-[300px] md:max-h-[400px] overflow-y-auto">
            {popularArtists.map((artist) => (
              <Card
                key={artist.id}
                onClick={() => toggleArtist(artist.name)}
                className={`cursor-pointer p-2 md:p-3 text-center transition-all hover:scale-105 ${
                  selectedArtists.includes(artist.name)
                    ? 'bg-primary/20 border-primary'
                    : 'bg-card/50 border-border'
                }`}
              >
                <div className="relative">
                  {artist.thumbnail ? (
                    <img
                      src={artist.thumbnail}
                      alt={artist.name}
                      className="w-full aspect-square object-cover rounded-md md:rounded-lg mb-1 md:mb-2"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-muted rounded-md md:rounded-lg mb-1 md:mb-2 flex items-center justify-center">
                      <Music className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                    </div>
                  )}
                  {selectedArtists.includes(artist.name) && (
                    <div className="absolute top-0 right-0 bg-primary rounded-full p-0.5 md:p-1">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] md:text-xs font-medium truncate">{artist.name}</p>
              </Card>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={selectedArtists.length < 3 || loading}
          className="w-full mt-4 md:mt-6 bg-gradient-primary hover:shadow-glow-violet transition-all text-sm md:text-base"
        >
          {loading ? 'Saving...' : `Continue (${selectedArtists.length} selected)`}
        </Button>
      </Card>
    </div>
  );
}
