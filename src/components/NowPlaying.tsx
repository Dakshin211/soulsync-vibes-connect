import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import YouTube, { YouTubeProps } from 'react-youtube';

export default function NowPlaying() {
  const {
    currentSong,
    isPlaying,
    nextSong,
    prevSong,
    pauseSong,
    resumeSong,
    currentTime,
    duration,
    seekTo,
    volume,
    setVolume,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
    playerRef,
    updateDuration,
  } = useMusicPlayer();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(volume);
    updateDuration();
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // Video ended (state 0)
    if (event.data === 0) {
      if (repeat === 'one') {
        event.target.seekTo(0);
        event.target.playVideo();
      } else if (repeat === 'all' || repeat === 'off') {
        // Autoplay next song
        nextSong();
      }
    }
    // Video playing (state 1)
    if (event.data === 1) {
      updateDuration();
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
    },
  };

  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  if (!currentSong) return null;

  return (
    <>
      <div style={{ display: 'none' }}>
        <YouTube
          videoId={currentSong.id}
          opts={opts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
        />
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-sidebar border-t border-sidebar-border z-30 pb-2">
        <div className="px-4 pt-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={1}
            onValueChange={([value]) => seekTo(value)}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="px-4 py-2 md:hidden">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-12 h-12 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{currentSong.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={isPlaying ? pauseSong : resumeSong}
              className="shrink-0"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          </div>
          
          <div className="flex items-center justify-around">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShuffle}
              className={shuffle ? 'text-primary' : ''}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={prevSong}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={nextSong}>
              <SkipForward className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRepeat}
              className={repeat !== 'off' ? 'text-primary' : ''}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4 flex-1">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-14 h-14 rounded object-cover"
            />
            <div className="min-w-0">
              <h4 className="font-semibold truncate">{currentSong.title}</h4>
              <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShuffle}
              className={shuffle ? 'text-primary' : ''}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={prevSong}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={isPlaying ? pauseSong : resumeSong}
              className="bg-primary hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextSong}>
              <SkipForward className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRepeat}
              className={repeat !== 'off' ? 'text-primary' : ''}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            >
              <Volume2 className="w-5 h-5" />
            </Button>
            {showVolumeSlider && (
              <Slider
                value={[volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => setVolume(value)}
                className="w-24"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
