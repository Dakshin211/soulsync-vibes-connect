import React from 'react';
import { UserPlus, Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

export default function Friends() {
  const friends = [
    { id: 1, name: 'Sarah Johnson', status: 'online', listening: 'Midnight City' },
    { id: 2, name: 'Mike Chen', status: 'online', listening: 'Blinding Lights' },
    { id: 3, name: 'Emma Wilson', status: 'offline', listening: null },
  ];

  const requests = [
    { id: 1, name: 'Alex Parker', mutual: 3 },
    { id: 2, name: 'Jamie Lee', mutual: 7 },
  ];

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Friends
        </h1>
        <Button className="bg-gradient-primary shadow-glow-violet">
          <UserPlus className="w-5 h-5 mr-2" />
          Add Friend
        </Button>
      </div>

      {requests.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Friend Requests</h2>
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="bg-card border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 bg-gradient-primary" />
                    <div>
                      <p className="font-semibold">{request.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.mutual} mutual friends
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-primary">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="border-border">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          All Friends ({friends.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((friend) => (
            <Card
              key={friend.id}
              className="bg-card border-border hover:shadow-glow-pink transition-all p-6"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 bg-gradient-primary" />
                  <div
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${
                      friend.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{friend.name}</h3>
                  {friend.listening ? (
                    <p className="text-sm text-muted-foreground">
                      🎵 {friend.listening}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Offline</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
