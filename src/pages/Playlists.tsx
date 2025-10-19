import React, { useState, useEffect } from 'react';
import { Plus, ListMusic, Play, Trash2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  userId: string;
  songs: string[];
  createdAt: string;
}

export default function Playlists() {
  const { currentUser } = useAuth();
  const { playSong, queue } = useMusicPlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadPlaylists();
    }
  }, [currentUser]);

  const loadPlaylists = async () => {
    if (!currentUser) return;
    
    const q = query(collection(db, 'Playlists'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Playlist));
    setPlaylists(data);
  };

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
      setIsOpen(false);
      loadPlaylists();
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
      loadPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const addCurrentSongToPlaylist = async (playlistId: string) => {
    if (!queue[0]) {
      toast.error('No song currently playing');
      return;
    }

    try {
      await updateDoc(doc(db, 'Playlists', playlistId), {
        songs: arrayUnion(queue[0].id)
      });
      toast.success('Song added to playlist');
      loadPlaylists();
    } catch (error) {
      console.error('Error adding song:', error);
      toast.error('Failed to add song');
    }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Your Playlists
        </h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map((playlist) => (
            <Card
              key={playlist.id}
              className="group bg-card border-border hover:shadow-glow-pink transition-all overflow-hidden"
            >
              <div className="aspect-square bg-gradient-glow flex items-center justify-center text-5xl">
                <ListMusic className="w-16 h-16 text-primary" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{playlist.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{playlist.songs.length} songs</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addCurrentSongToPlaylist(playlist.id)}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePlaylist(playlist.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
