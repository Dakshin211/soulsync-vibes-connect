import React, { useState, useEffect } from 'react';
import { Plus, ListMusic, Play, Trash2, Music2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
}

interface Playlist {
  id: string;
  name: string;
  userId: string;
  songs: Song[];
  createdAt: string;
}

export default function Playlists() {
  const { currentUser } = useAuth();
  const { playSong, setQueue, currentSong } = useMusicPlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'Playlists'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Playlist));
      setPlaylists(data);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const createPlaylist = async () => {
    if (!currentUser || !newPlaylistName.trim()) return;
    
    setIsCreating(true);
    try {
      await addDoc(collection(db, 'Playlists'), {
        name: newPlaylistName,
        userId: currentUser.uid,
        songs: [],
        createdAt: new Date().toISOString()
      });
      
      toast.success('Playlist created!');
      setNewPlaylistName('');
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist');
    } finally {
      setIsCreating(false);
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    try {
      await deleteDoc(doc(db, 'Playlists', playlistId));
      toast.success('Playlist deleted');
      setViewDialogOpen(false);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const addCurrentSongToPlaylist = async (playlistId: string) => {
    if (!currentSong) {
      toast.error('No song currently playing');
      return;
    }

    try {
      await updateDoc(doc(db, 'Playlists', playlistId), {
        songs: arrayUnion(currentSong)
      });
      toast.success('Song added to playlist');
    } catch (error) {
      console.error('Error adding song:', error);
      toast.error('Failed to add song');
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, song: Song) => {
    try {
      await updateDoc(doc(db, 'Playlists', playlistId), {
        songs: arrayRemove(song)
      });
      toast.success('Song removed');
    } catch (error) {
      console.error('Error removing song:', error);
      toast.error('Failed to remove song');
    }
  };

  const playPlaylist = (playlist: Playlist) => {
    if (playlist.songs.length === 0) {
      toast.error('Playlist is empty');
      return;
    }
    setQueue(playlist.songs);
    playSong(playlist.songs[0]);
    toast.success(`Playing ${playlist.name}`);
  };

  return (
    <div className="p-4 pb-32 animate-fade-in bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Your Playlists
          </h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow-violet">
                <Plus className="w-5 h-5 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
                />
                <Button 
                  onClick={createPlaylist}
                  disabled={isCreating || !newPlaylistName.trim()}
                  className="w-full bg-gradient-primary"
                >
                  {isCreating ? 'Creating...' : 'Create Playlist'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Music2 className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No playlists yet</p>
            <p className="text-sm">Create your first playlist to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="group bg-card border-border hover:shadow-glow-pink transition-all cursor-pointer overflow-hidden"
                onClick={() => { setSelectedPlaylist(playlist); setViewDialogOpen(true); }}
              >
                <div className="aspect-square bg-gradient-glow flex items-center justify-center relative">
                  <ListMusic className="w-16 h-16 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      className="w-12 h-12 rounded-full bg-primary"
                      onClick={(e) => { e.stopPropagation(); playPlaylist(playlist); }}
                    >
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm mb-1 truncate">{playlist.name}</h3>
                  <p className="text-xs text-muted-foreground">{playlist.songs.length} songs</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* View Playlist Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedPlaylist?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => selectedPlaylist && playPlaylist(selectedPlaylist)}
                  className="flex-1 bg-gradient-primary"
                  disabled={!selectedPlaylist?.songs.length}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play All
                </Button>
                <Button
                  onClick={() => selectedPlaylist && addCurrentSongToPlaylist(selectedPlaylist.id)}
                  variant="outline"
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Current
                </Button>
                <Button
                  onClick={() => selectedPlaylist && deletePlaylist(selectedPlaylist.id)}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {selectedPlaylist?.songs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No songs in playlist</p>
                  </div>
                ) : (
                  selectedPlaylist?.songs.map((song, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors group"
                    >
                      <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => selectedPlaylist && removeSongFromPlaylist(selectedPlaylist.id, song)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
