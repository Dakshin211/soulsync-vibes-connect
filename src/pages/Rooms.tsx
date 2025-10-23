import { useState, useEffect, useRef } from 'react';
import { Radio, Users, Plus, Copy, LogOut as Leave, Music2, ListMusic, Trash2, Share2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { realtimeDb } from '@/lib/firebaseRealtime';
import { ref, set, onValue, remove, push, get, update, serverTimestamp } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
}

interface Room {
  id: string;
  name: string;
  code: string;
  hostId: string;
  hostName: string;
  currentSong: Song | null;
  currentTime: number;
  isPlaying: boolean;
  users: { [key: string]: boolean };
  playlist: Song[];
  lastUpdateTime: number;
}

export default function Rooms() {
  const { currentUser } = useAuth();
  const { playSong, pauseSong, resumeSong, currentSong, isPlaying, seekTo, currentTime, addToQueue, queue } = useMusicPlayer();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const roomCacheRef = useRef<{ data: Room | null; timestamp: number }>({ data: null, timestamp: 0 });

  // Listen to all rooms and auto-delete empty ones
  useEffect(() => {
    const roomsRef = ref(realtimeDb, 'rooms');
    const unsubscribe = onValue(roomsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsList = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          ...room,
        }));
        
        // Auto-delete rooms with no users
        for (const room of roomsList) {
          const userCount = room.users ? Object.keys(room.users).length : 0;
          if (userCount === 0) {
            await remove(ref(realtimeDb, `rooms/${room.id}`));
          }
        }
        
        setRooms(roomsList.filter(room => {
          const userCount = room.users ? Object.keys(room.users).length : 0;
          return userCount > 0;
        }));
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync room playback state with caching - ALL users sync, any user can control
  useEffect(() => {
    if (!currentRoom || !currentUser) return;

    const roomRef = ref(realtimeDb, `rooms/${currentRoom.id}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCurrentRoom(null);
        roomCacheRef.current = { data: null, timestamp: 0 };
        return;
      }

      // Check cache (3 second TTL)
      const now = Date.now();
      if (roomCacheRef.current.data && (now - roomCacheRef.current.timestamp) < 3000) {
        // Use cached data to reduce rerenders
        if (JSON.stringify(roomCacheRef.current.data) === JSON.stringify(data)) {
          return;
        }
      }

      // Update cache
      roomCacheRef.current = { data, timestamp: now };

      if (isSyncingRef.current) return;

      // Sync to room state with 50ms precision
      const timeDiff = Math.abs((data.currentTime || 0) - currentTime);
      
      if (data.currentSong && data.currentSong.id !== currentSong?.id) {
        isSyncingRef.current = true;
        playSong(data.currentSong);
        setTimeout(() => {
          if (data.currentTime > 1) {
            seekTo(data.currentTime);
          }
          isSyncingRef.current = false;
        }, 100);
      }
      
      if (data.isPlaying !== isPlaying) {
        if (data.isPlaying) {
          resumeSong();
        } else {
          pauseSong();
        }
      }

      // High-precision sync (target 50ms latency)
      if (timeDiff > 0.5 && (now - lastSyncTimeRef.current) > 1000) {
        seekTo(data.currentTime || 0);
        lastSyncTimeRef.current = now;
      }
      
      setCurrentRoom({ ...data, id: currentRoom.id });
    });

    return () => unsubscribe();
  }, [currentRoom?.id, currentUser]);

  // Broadcast playback state - ANY user can update (debounced)
  useEffect(() => {
    if (!currentRoom || !currentUser || isSyncingRef.current) return;

    const updateRoom = async () => {
      try {
        const roomRef = ref(realtimeDb, `rooms/${currentRoom.id}`);
        const snapshot = await get(roomRef);
        const currentData = snapshot.val();
        
        if (!currentData) return;

        const timeDiff = Math.abs((currentData.currentTime || 0) - currentTime);
        const songChanged = currentData.currentSong?.id !== currentSong?.id;
        const playStateChanged = currentData.isPlaying !== isPlaying;
        
        // Only update if values actually changed
        if (songChanged || playStateChanged || timeDiff > 0.5) {
          await update(roomRef, {
            currentSong: currentSong,
            isPlaying: isPlaying,
            currentTime: currentTime,
            lastUpdateTime: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error updating room:', error);
      }
    };

    const debounce = setTimeout(updateRoom, 100);
    return () => clearTimeout(debounce);
  }, [currentSong, isPlaying, currentTime, currentRoom?.id, currentUser]);

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
        playlist: [],
        lastUpdateTime: Date.now(),
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

  const joinRoom = async (code?: string) => {
    if (!currentUser) return;
    const roomCode = code || joinCode.trim();
    if (!roomCode) return;
    
    try {
      const roomsRef = ref(realtimeDb, 'rooms');
      const snapshot = await get(roomsRef);
      const data = snapshot.val();
      
      if (!data) {
        toast.error('Room not found');
        return;
      }

      const roomEntry = Object.entries(data).find(([_, room]: [string, any]) => 
        room.code === roomCode.toUpperCase()
      );

      if (!roomEntry) {
        toast.error('Room not found');
        return;
      }

      const [roomId, roomData] = roomEntry as [string, any];
      
      // Pause personal playback
      if (currentSong) {
        pauseSong();
      }
      
      // Join room
      const userRef = ref(realtimeDb, `rooms/${roomId}/users/${currentUser.uid}`);
      await set(userRef, true);

      // Sync to current room state immediately
      const joinedRoom = { id: roomId, ...roomData };
      setCurrentRoom(joinedRoom);
      
      // Auto-sync to room's playback mid-song
      if (roomData.currentSong) {
        setTimeout(() => {
          playSong(roomData.currentSong);
          if (roomData.currentTime > 0) {
            setTimeout(() => seekTo(roomData.currentTime), 500);
          }
          if (roomData.isPlaying) {
            resumeSong();
          }
        }, 200);
      }
      
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
      const roomRef = ref(realtimeDb, `rooms/${currentRoom.id}`);
      const snapshot = await get(roomRef);
      const roomData = snapshot.val();
      
      if (currentUser.uid === currentRoom.hostId) {
        // Transfer host to another user if available
        const userIds = Object.keys(roomData.users || {}).filter(id => id !== currentUser.uid);
        
        if (userIds.length > 0) {
          const newHostId = userIds[0];
          const newHostDoc = await getDoc(doc(db, 'Users', newHostId));
          const newHostName = newHostDoc.data()?.username || 'User';
          
          await update(roomRef, {
            hostId: newHostId,
            hostName: newHostName,
          });
          await remove(ref(realtimeDb, `rooms/${currentRoom.id}/users/${currentUser.uid}`));
          toast.success('Host transferred');
        } else {
          // No other users, delete room
          await remove(roomRef);
          toast.success('Room closed');
        }
      } else {
        await remove(ref(realtimeDb, `rooms/${currentRoom.id}/users/${currentUser.uid}`));
        toast.success('Left room');
      }
      setCurrentRoom(null);
      roomCacheRef.current = { data: null, timestamp: 0 };
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Room code copied!');
  };

  const shareRoomLink = () => {
    if (!currentRoom) return;
    const link = `${window.location.origin}?joinRoom=${currentRoom.code}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied!');
  };

  const addSongToRoomPlaylist = async (song: Song) => {
    if (!currentRoom || !currentUser) return;
    
    try {
      const roomRef = ref(realtimeDb, `rooms/${currentRoom.id}`);
      const snapshot = await get(roomRef);
      const data = snapshot.val();
      
      const updatedPlaylist = [...(data.playlist || []), song];
      await update(roomRef, { playlist: updatedPlaylist });
      toast.success('Added to room playlist');
    } catch (error) {
      console.error('Error adding to playlist:', error);
      toast.error('Failed to add');
    }
  };

  const removeSongFromRoomPlaylist = async (index: number) => {
    if (!currentRoom || !currentUser) return;
    
    try {
      const roomRef = ref(realtimeDb, `rooms/${currentRoom.id}`);
      const snapshot = await get(roomRef);
      const data = snapshot.val();
      
      const updatedPlaylist = [...(data.playlist || [])];
      updatedPlaylist.splice(index, 1);
      await update(roomRef, { playlist: updatedPlaylist });
      toast.success('Removed from playlist');
    } catch (error) {
      console.error('Error removing from playlist:', error);
      toast.error('Failed to remove');
    }
  };

  const playRoomPlaylistSong = async (song: Song) => {
    if (!currentRoom || !currentUser) return;
    playSong(song);
  };

  // Handle invite links on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('joinRoom');
    if (roomCode && currentUser) {
      joinRoom(roomCode);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentUser]);

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
              <Button size="sm" variant="ghost" onClick={shareRoomLink}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button variant="destructive" onClick={leaveRoom} className="animate-fade-in">
            <Leave className="w-5 h-5 mr-2" />
            {currentUser?.uid === currentRoom.hostId ? 'Close' : 'Leave'}
          </Button>
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium">{userCount} listening</span>
              </div>
              <Dialog open={playlistDialogOpen} onOpenChange={setPlaylistDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <ListMusic className="w-4 h-4 mr-2" />
                    Playlist ({currentRoom.playlist?.length || 0})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Room Playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 mt-4">
                    {currentRoom.playlist && currentRoom.playlist.length > 0 ? (
                      currentRoom.playlist.map((song, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-all">
                          <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded object-cover" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{song.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => playRoomPlaylistSong(song)}>
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeSongFromRoomPlaylist(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No songs in playlist</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {currentRoom.currentSong ? (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20 animate-fade-in">
                <img 
                  src={currentRoom.currentSong.thumbnail} 
                  alt={currentRoom.currentSong.title}
                  className="w-16 h-16 rounded object-cover shadow-glow-violet"
                />
                <div className="flex-1">
                  <h3 className="font-bold">{currentRoom.currentSong.title}</h3>
                  <p className="text-sm text-muted-foreground">{currentRoom.currentSong.artist}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground animate-fade-in">
                <Music2 className="w-12 h-12 mb-2 opacity-50" />
                <p>No song playing</p>
                <p className="text-sm">Play a song to start the session</p>
              </div>
            )}
          </Card>

          {currentSong && currentSong.id !== currentRoom.currentSong?.id && (
            <Button 
              onClick={() => addSongToRoomPlaylist(currentSong)} 
              className="w-full bg-gradient-primary animate-fade-in"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Current Song to Room Playlist
            </Button>
          )}
        </div>
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
                <Button onClick={() => joinRoom()} disabled={!joinCode.trim()} className="w-full bg-gradient-primary">
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
