import React, { useState, useEffect } from 'react';
import { UserPlus, Check, X, Users as UsersIcon, Music2, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { realtimeDb } from '@/lib/firebaseRealtime';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, query, 
  where, updateDoc, onSnapshot, getDoc 
} from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { toast } from 'sonner';

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  username: string;
  status: 'pending' | 'accepted';
  requestedBy: string;
  createdAt: any;
  isOnline?: boolean;
  currentSong?: {
    title: string;
    artist: string;
  } | null;
}

export default function Friends() {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<{ [key: string]: boolean }>({});
  const [listeningStatus, setListeningStatus] = useState<{ [key: string]: any }>({});

  // Set up presence system for current user
  useEffect(() => {
    if (!currentUser) return;

    const userPresenceRef = ref(realtimeDb, `presence/${currentUser.uid}`);
    const userStatusRef = ref(realtimeDb, `status/${currentUser.uid}`);

    // Set online status
    set(userPresenceRef, {
      online: true,
      lastSeen: serverTimestamp(),
    });

    // Set up disconnect handler
    onDisconnect(userPresenceRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });

    // Also cleanup status on disconnect
    onDisconnect(userStatusRef).remove();

    return () => {
      set(userPresenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
      });
    };
  }, [currentUser]);

  // Fetch friends list
  useEffect(() => {
    if (!currentUser) return;

    const friendsQuery = query(
      collection(db, 'Friends'),
      where('userId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(friendsQuery, async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const friendData = docSnapshot.data();
          let username = 'Unknown User';
          
          try {
            const friendDoc = await getDoc(doc(db, 'Users', friendData.friendId));
            if (friendDoc.exists()) {
              username = friendDoc.data().username || friendDoc.data().email?.split('@')[0] || 'User';
            }
          } catch (error) {
            console.error('Error fetching friend data:', error);
          }

          return {
            id: docSnapshot.id,
            ...friendData,
            username
          } as Friend;
        })
      );

      const acceptedFriends = data.filter(f => f.status === 'accepted');
      setFriends(acceptedFriends);
      setRequests(data.filter(f => f.status === 'pending' && f.requestedBy !== currentUser.uid));

      // Listen to presence for each friend
      acceptedFriends.forEach((friend) => {
        const presenceRef = ref(realtimeDb, `presence/${friend.friendId}`);
        onValue(presenceRef, (snapshot) => {
          const presenceData = snapshot.val();
          setOnlineStatus(prev => ({
            ...prev,
            [friend.friendId]: presenceData?.online || false,
          }));
        });

        const statusRef = ref(realtimeDb, `status/${friend.friendId}`);
        onValue(statusRef, (snapshot) => {
          const statusData = snapshot.val();
          setListeningStatus(prev => ({
            ...prev,
            [friend.friendId]: statusData?.currentSong || null,
          }));
        });
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  const sendFriendRequest = async () => {
    if (!currentUser || !searchEmail.trim()) return;
    
    setIsSearching(true);
    try {
      const usersQuery = query(
        collection(db, 'Users'),
        where('email', '==', searchEmail.toLowerCase())
      );
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        toast.error('User not found');
        return;
      }

      const friendUser = userSnapshot.docs[0];
      const friendId = friendUser.id;

      if (friendId === currentUser.uid) {
        toast.error('You cannot add yourself');
        return;
      }

      const existingQuery = query(
        collection(db, 'Friends'),
        where('userId', '==', currentUser.uid),
        where('friendId', '==', friendId)
      );
      const existing = await getDocs(existingQuery);

      if (!existing.empty) {
        toast.error('Friend request already sent');
        return;
      }

      await addDoc(collection(db, 'Friends'), {
        userId: currentUser.uid,
        friendId: friendId,
        status: 'pending',
        requestedBy: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'Friends'), {
        userId: friendId,
        friendId: currentUser.uid,
        status: 'pending',
        requestedBy: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      toast.success('Friend request sent!');
      setSearchEmail('');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
    } finally {
      setIsSearching(false);
    }
  };

  const acceptRequest = async (friendshipId: string, friendId: string) => {
    try {
      const friendshipsQuery = query(
        collection(db, 'Friends'),
        where('userId', 'in', [currentUser!.uid, friendId]),
        where('friendId', 'in', [currentUser!.uid, friendId])
      );
      const snapshot = await getDocs(friendshipsQuery);
      
      snapshot.docs.forEach(async (docSnapshot) => {
        await updateDoc(doc(db, 'Friends', docSnapshot.id), {
          status: 'accepted'
        });
      });

      toast.success('Friend request accepted!');
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept');
    }
  };

  const rejectRequest = async (friendshipId: string, friendId: string) => {
    try {
      const friendshipsQuery = query(
        collection(db, 'Friends'),
        where('userId', 'in', [currentUser!.uid, friendId]),
        where('friendId', 'in', [currentUser!.uid, friendId])
      );
      const snapshot = await getDocs(friendshipsQuery);
      
      snapshot.docs.forEach(async (docSnapshot) => {
        await deleteDoc(doc(db, 'Friends', docSnapshot.id));
      });

      toast.success('Request rejected');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Friends
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-glow-violet">
              <UserPlus className="w-5 h-5 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                type="email"
                placeholder="Enter friend's email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
              />
              <Button 
                onClick={sendFriendRequest}
                disabled={isSearching || !searchEmail.trim()}
                className="w-full bg-gradient-primary"
              >
                {isSearching ? 'Searching...' : 'Send Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="bg-card border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {request.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold">{request.username}</h3>
                      <p className="text-sm text-muted-foreground">wants to be friends</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => acceptRequest(request.id, request.friendId)}
                      className="bg-gradient-primary"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectRequest(request.id, request.friendId)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">All Friends</h2>
      
      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-fade-in">
          <UsersIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">No friends yet</p>
          <p className="text-sm">Add friends to listen together</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {friends.map((friend) => {
            const isOnline = onlineStatus[friend.friendId];
            const currentSong = listeningStatus[friend.friendId];
            
            return (
              <Card 
                key={friend.id} 
                className="bg-card border-border p-4 hover:shadow-glow-pink transition-all animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {friend.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{friend.username}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {isOnline ? (
                        currentSong ? (
                          <>
                            <Headphones className="w-3 h-3 text-primary animate-pulse" />
                            <span className="truncate">
                              {currentSong.title} - {currentSong.artist}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>Online</span>
                          </>
                        )
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <span>Offline</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
