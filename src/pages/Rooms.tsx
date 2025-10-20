import { useState, useEffect } from 'react';
import { Radio, Users, Plus, Copy, LogOut as Leave, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { realtimeDb } from '@/lib/firebaseRealtime';
import { ref, set, onValue, remove, push, get } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface Room {
  id: string;
  name: string;
  code: string;
  hostId: string;
  hostName: string;
  currentSong: any;
  currentTime: number;
  isPlaying: boolean;
  users: { [key: string]: boolean };
}

export default function Rooms() {
  const { currentUser } = useAuth();
  const { playSong, pauseSong, resumeSong, currentSong, isPlaying, seekTo, currentTime } = useMusicPlayer();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Listen to all rooms
  useEffect(() => {
    const roomsRef = ref(realtimeDb, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsList = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          ...room,
        }));
        setRooms(roomsList);
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync room playback state
  useEffect(() => {
    if (!currentRoom || !currentUser) return;

    const roomRef = ref(realtimeDb, `rooms/${currentRoom.id}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCurrentRoom(null);
        return;
      }

      // If user is not host, sync playback
      if (currentUser.uid !== data.hostId) {
        if (data.currentSong && data.currentSong.id !== currentSong?.id) {
          playSong(data.currentSong);
        }
        
        if (data.isPlaying && !isPlaying) {
          resumeSong();
        } else if (!data.isPlaying && isPlaying) {
          pauseSong();
        }

        // Sync time (with tolerance for network delay)
        if (Math.abs(data.currentTime - currentTime) > 2) {
          seekTo(data.currentTime);
        }
      }
    });

    return () => unsubscribe();
  }, [currentRoom, currentUser]);

  // Host: broadcast playback state
  useEffect(() => {
    if (!currentRoom || !currentUser || currentUser.uid !== currentRoom.hostId) return;

    const roomRef = ref(realtimeDb, `rooms/${currentRoom.id}`);
    set(roomRef, {
      ...currentRoom,
      currentSong: currentSong,
      isPlaying: isPlaying,
      currentTime: currentTime,
    });
  }, [currentSong, isPlaying, currentTime, currentRoom, currentUser]);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!currentUser || !newRoomName.trim()) return;
    
    setIsCreating(true);
    try {
      const code = generateRoomCode();
      const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
      const userName = userDoc.data()?.username || currentUser.email?.split('@')[0] || 'User';

      const roomsRef = ref(realtimeDb, 'rooms');
      const newRoomRef = push(roomsRef);
      
      const roomData = {
        name: newRoomName,
        code,
        hostId: currentUser.uid,
        hostName: userName,
        currentSong: null,
        currentTime: 0,
        isPlaying: false,
        users: { [currentUser.uid]: true },
      };

      await set(newRoomRef, roomData);
      
      setCurrentRoom({ id: newRoomRef.key!, ...roomData });
      toast.success(`Room created! Code: ${code}`);
      setNewRoomName('');
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!currentUser || !joinCode.trim()) return;
    
    try {
      const roomsRef = ref(realtimeDb, 'rooms');
      const snapshot = await get(roomsRef);
      const data = snapshot.val();
      
      if (!data) {
        toast.error('Room not found');
        return;
      }

      const roomEntry = Object.entries(data).find(([_, room]: [string, any]) => 
        room.code === joinCode.toUpperCase()
      );

      if (!roomEntry) {
        toast.error('Room not found');
        return;
      }

      const [roomId, roomData] = roomEntry as [string, any];
      const roomRef = ref(realtimeDb, `rooms/${roomId}/users/${currentUser.uid}`);
      await set(roomRef, true);

      setCurrentRoom({ id: roomId, ...roomData });
      toast.success('Joined room!');
      setJoinCode('');
      setJoinDialogOpen(false);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !currentUser) return;

    try {
      if (currentUser.uid === currentRoom.hostId) {
        await remove(ref(realtimeDb, `rooms/${currentRoom.id}`));
        toast.success('Room closed');
      } else {
        await remove(ref(realtimeDb, `rooms/${currentRoom.id}/users/${currentUser.uid}`));
        toast.success('Left room');
      }
      setCurrentRoom(null);
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Room code copied!');
  };

  if (currentRoom) {
    const userCount = currentRoom.users ? Object.keys(currentRoom.users).length : 0;
    
    return (
      <div className="p-4 pb-32 animate-fade-in bg-background">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {currentRoom.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-sm font-mono bg-muted px-3 py-1 rounded">
                {currentRoom.code}
              </code>
              <Button size="sm" variant="ghost" onClick={() => copyRoomCode(currentRoom.code)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button variant="destructive" onClick={leaveRoom}>
            <Leave className="w-5 h-5 mr-2" />
            {currentUser?.uid === currentRoom.hostId ? 'Close' : 'Leave'}
          </Button>
        </div>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-medium">{userCount} listening</span>
          </div>

          {currentRoom.currentSong ? (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <img 
                src={currentRoom.currentSong.thumbnail} 
                alt={currentRoom.currentSong.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold">{currentRoom.currentSong.title}</h3>
                <p className="text-sm text-muted-foreground">{currentRoom.currentSong.artist}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Music2 className="w-12 h-12 mb-2 opacity-50" />
              <p>No song playing</p>
              {currentUser?.uid === currentRoom.hostId && (
                <p className="text-sm">Play a song to start the session</p>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 animate-fade-in bg-background">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Music Rooms
        </h1>
        <div className="flex gap-2">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-border">Join</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                  className="uppercase"
                />
                <Button onClick={joinRoom} disabled={!joinCode.trim()} className="w-full bg-gradient-primary">
                  Join
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow-violet">
                <Plus className="w-5 h-5 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                />
                <Button onClick={createRoom} disabled={isCreating || !newRoomName.trim()} className="w-full bg-gradient-primary">
                  {isCreating ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Radio className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">No active rooms</p>
          <p className="text-sm">Create a room to listen with friends</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const userCount = room.users ? Object.keys(room.users).length : 0;
            return (
              <Card
                key={room.id}
                className="bg-card border-border hover:shadow-glow-violet transition-all cursor-pointer p-6"
                onClick={() => setCurrentRoom(room)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Radio className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{room.name}</h3>
                    <p className="text-sm text-muted-foreground">Host: {room.hostName}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{userCount} listening</span>
                  </div>
                  <code className="text-sm font-mono bg-muted px-3 py-1 rounded">
                    {room.code}
                  </code>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
