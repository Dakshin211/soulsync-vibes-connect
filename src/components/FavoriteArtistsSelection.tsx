import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const popularArtists = [
  { id: '1', name: 'The Weeknd', image: '🎤' },
  { id: '2', name: 'Taylor Swift', image: '🎸' },
  { id: '3', name: 'Drake', image: '🎵' },
  { id: '4', name: 'Billie Eilish', image: '🎧' },
  { id: '5', name: 'Ed Sheeran', image: '🎹' },
  { id: '6', name: 'Ariana Grande', image: '⭐' },
  { id: '7', name: 'Post Malone', image: '🎼' },
  { id: '8', name: 'Dua Lipa', image: '💫' },
  { id: '9', name: 'Bruno Mars', image: '🌟' },
  { id: '10', name: 'Olivia Rodrigo', image: '🎶' },
  { id: '11', name: 'Harry Styles', image: '✨' },
  { id: '12', name: 'SZA', image: '🌙' },
];

interface FavoriteArtistsSelectionProps {
  onComplete: () => void;
}

export default function FavoriteArtistsSelection({ onComplete }: FavoriteArtistsSelectionProps) {
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const toggleArtist = (artistName: string) => {
    setSelectedArtists(prev =>
      prev.includes(artistName)
        ? prev.filter(a => a !== artistName)
        : [...prev, artistName]
    );
  };

  const handleContinue = async () => {
    if (selectedArtists.length < 3) {
      toast({
        title: 'Select at least 3 artists',
        description: 'Please select at least 3 favorite artists to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'Users', currentUser.uid), {
        favoriteArtists: selectedArtists,
      });

      toast({
        title: 'Preferences saved!',
        description: 'Your favorite artists have been saved.',
      });

      onComplete();
    } catch (error) {
      console.error('Error saving favorite artists:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Choose Your Vibe
          </h1>
          <p className="text-muted-foreground text-lg">
            Select at least 3 artists you love (you can add more later)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {popularArtists.map((artist) => (
            <Card
              key={artist.id}
              onClick={() => toggleArtist(artist.name)}
              className={`relative cursor-pointer transition-all hover:shadow-glow-violet ${
                selectedArtists.includes(artist.name)
                  ? 'bg-gradient-primary border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <div className="aspect-square flex flex-col items-center justify-center p-4 text-center">
                <div className="text-5xl mb-3">{artist.image}</div>
                <p
                  className={`font-semibold text-sm ${
                    selectedArtists.includes(artist.name) ? 'text-white' : ''
                  }`}
                >
                  {artist.name}
                </p>
                {selectedArtists.includes(artist.name) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={selectedArtists.length < 3 || loading}
            className="bg-gradient-primary shadow-glow-violet px-8 py-6 text-lg"
          >
            {loading ? 'Saving...' : `Continue with ${selectedArtists.length} artists`}
          </Button>
        </div>
      </div>
    </div>
  );
}
