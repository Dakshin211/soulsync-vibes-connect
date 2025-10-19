import React, { useState } from 'react';
import { Plus, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Playlists() {
  const [playlists] = useState([
    { id: 1, name: 'My Favorites', songs: 23, cover: '💜' },
    { id: 2, name: 'Workout Mix', songs: 45, cover: '💪' },
    { id: 3, name: 'Study Session', songs: 31, cover: '📚' },
  ]);

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Your Playlists
        </h1>
        <Button className="bg-gradient-primary shadow-glow-violet">
          <Plus className="w-5 h-5 mr-2" />
          Create Playlist
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {playlists.map((playlist) => (
          <Card
            key={playlist.id}
            className="group bg-card border-border hover:shadow-glow-pink transition-all cursor-pointer overflow-hidden"
          >
            <div className="aspect-square bg-gradient-glow flex items-center justify-center text-6xl">
              {playlist.cover}
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <ListMusic className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-xl">{playlist.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{playlist.songs} songs</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
