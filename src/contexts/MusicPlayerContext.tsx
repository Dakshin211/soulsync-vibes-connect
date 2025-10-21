import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getSimilarTracks, getRandomRecommendation } from '@/services/recommendationApi';
import { searchYouTube } from '@/services/youtubeApi';
import { getGroqRecommendations } from '@/services/groqApi';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
}

interface MusicPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  playSong: (song: Song) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  prevSong: () => void;
  addToQueue: (song: Song) => void;
  setQueue: (songs: Song[]) => void;
  clearQueue: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playerRef: React.MutableRefObject<any>;
  updateDuration: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return context;
};

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([]); // Track last 3 songs to avoid repetition

  // Update duration when player is ready
  const updateDuration = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
      const dur = playerRef.current.getDuration();
      if (dur && !isNaN(dur)) {
        setDuration(dur);
      }
    }
  }, []);

  // Track progress
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const time = playerRef.current.getCurrentTime();
          if (typeof time === 'number') {
            setCurrentTime(time);
          }
        }
      }, 100); // Update more frequently for smoother timeline
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const playSong = useCallback((song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  }, []);

  const pauseSong = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resumeSong = useCallback(() => {
    if (currentSong) {
      setIsPlaying(true);
    }
  }, [currentSong]);

  const nextSong = useCallback(async () => {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
    let nextIndex;

    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
      setCurrentSong(queue[nextIndex]);
      setIsPlaying(true);
      // Update recently played
      if (queue[nextIndex]) {
        setRecentlyPlayed(prev => [queue[nextIndex].id, ...prev.slice(0, 2)]);
      }
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
      
      // If we're at the end of queue, get smart recommendations
      if (nextIndex === 0 && currentSong && repeat === 'off') {
        try {
          // Try Last.fm first
          let recommendations = await getSimilarTracks(currentSong.artist, currentSong.title);
          
          // Fallback to Groq if Last.fm fails
          if (recommendations.length === 0) {
            console.log('Last.fm failed, trying Groq...');
            recommendations = await getGroqRecommendations(currentSong.artist, currentSong.title);
          }
          
          if (recommendations.length > 0) {
            // Filter out recently played songs to avoid repetition
            const filteredRecs = recommendations.filter(
              rec => !recentlyPlayed.includes(`${rec.artist}-${rec.title}`)
            );
            
            const recsToUse = filteredRecs.length > 0 ? filteredRecs : recommendations;
            const randomRec = getRandomRecommendation(recsToUse.slice(0, 5));
            
            if (randomRec) {
              const searchResults = await searchYouTube(`${randomRec.artist} ${randomRec.title}`, 1);
              if (searchResults.length > 0) {
                setQueueState(prev => [...prev, searchResults[0]]);
                setCurrentSong(searchResults[0]);
                setIsPlaying(true);
                setRecentlyPlayed(prev => [searchResults[0].id, ...prev.slice(0, 2)]);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Error getting recommendations:', error);
        }
      }
      
      setCurrentSong(queue[nextIndex]);
      setIsPlaying(true);
      // Update recently played
      if (queue[nextIndex]) {
        setRecentlyPlayed(prev => [queue[nextIndex].id, ...prev.slice(0, 2)]);
      }
    }
  }, [queue, currentSong, shuffle, repeat, recentlyPlayed]);

  const prevSong = useCallback(() => {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
    const prevIndex = currentIndex - 1 < 0 ? queue.length - 1 : currentIndex - 1;

    setCurrentSong(queue[prevIndex]);
    setIsPlaying(true);
  }, [queue, currentSong]);

  const addToQueue = useCallback((song: Song) => {
    setQueueState(prev => [...prev, song]);
  }, []);

  const setQueue = useCallback((songs: Song[]) => {
    setQueueState(songs);
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
  }, []);

  const seekTo = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time);
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const value = {
    currentSong,
    isPlaying,
    queue,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    playSong,
    pauseSong,
    resumeSong,
    nextSong,
    prevSong,
    addToQueue,
    setQueue,
    clearQueue,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    playerRef,
    updateDuration,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
};
