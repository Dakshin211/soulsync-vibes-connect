import React from 'react';
import { Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

const trendingPlaylists = [
  { id: 1, title: 'Chill Vibes', image: '🎵', songs: 42 },
  { id: 2, title: 'Party Mix', image: '🎉', songs: 38 },
  { id: 3, title: 'Focus Flow', image: '🎧', songs: 51 },
  { id: 4, title: 'Night Drive', image: '🌙', songs: 29 },
];

export default function Home() {
  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-12 shadow-glow-violet">
        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to SoulSync
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Discover, share, and sync your music journey with friends in real-time
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/30 rounded-full blur-3xl"></div>
      </div>

      <section>
        <h2 className="text-3xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Trending Now
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingPlaylists.map((playlist) => (
            <Card
              key={playlist.id}
              className="group bg-card border-border hover:bg-card/80 transition-all cursor-pointer overflow-hidden"
            >
              <div className="aspect-square bg-gradient-glow flex items-center justify-center text-6xl relative">
                {playlist.image}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{playlist.title}</h3>
                <p className="text-sm text-muted-foreground">{playlist.songs} songs</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Made For You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-dark border-border p-6 hover:shadow-glow-pink transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-primary rounded-lg flex items-center justify-center text-3xl">
                ❤️
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Your Top Tracks</h3>
                <p className="text-muted-foreground">Based on your listening history</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-dark border-border p-6 hover:shadow-glow-pink transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-primary rounded-lg flex items-center justify-center text-3xl">
                🔥
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Discover Weekly</h3>
                <p className="text-muted-foreground">Fresh picks just for you</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
