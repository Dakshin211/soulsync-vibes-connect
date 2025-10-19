import React from 'react';
import { Radio, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Rooms() {
  const rooms = [
    { id: 1, name: 'Chill Lounge', users: 8, code: 'ABC123', host: 'You' },
    { id: 2, name: 'Party Zone', users: 15, code: 'XYZ789', host: 'Alex' },
  ];

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Music Rooms
        </h1>
        <div className="flex gap-3">
          <Button variant="outline" className="border-border">
            Join Room
          </Button>
          <Button className="bg-gradient-primary shadow-glow-violet">
            <Plus className="w-5 h-5 mr-2" />
            Create Room
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className="bg-card border-border hover:shadow-glow-violet transition-all cursor-pointer p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{room.name}</h3>
                  <p className="text-sm text-muted-foreground">Host: {room.host}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm">{room.users} listening</span>
              </div>
              <code className="text-sm font-mono bg-muted px-3 py-1 rounded">
                {room.code}
              </code>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
