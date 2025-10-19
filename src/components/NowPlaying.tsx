import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import YouTube from 'react-youtube';

export default function NowPlaying() {
  const {
    currentSong,
    isPlaying,
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
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    playerRef,
  } = useMusicPlayer();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    if (playerRef.current && isPlaying) {
      playerRef.current.playVideo();
    } else if (playerRef.current && !isPlaying) {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, playerRef]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
    if (volume) {
      event.target.setVolume(volume);
    }
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === 0) { // Video ended
      if (repeat === 'one') {
        event.target.seekTo(0);
        event.target.playVideo();
      } else if (repeat === 'all') {
        nextSong();
      }
    }
  };

  const opts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
    },
  };

  if (!currentSong) return null;

  return (
    <>
      {/* Hidden YouTube Player */}
      <div className="hidden">
        <YouTube
          videoId={currentSong.id}
          opts={opts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
        />
      </div>

      {/* Now Playing Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="container mx-auto px-4 py-3">
          {/* Mobile Layout */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{currentSong.title}</p>
                <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleShuffle}
                className={shuffle ? 'text-primary' : 'text-muted-foreground'}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={prevSong}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 w-10 h-10 rounded-full"
                onClick={isPlaying ? pauseSong : resumeSong}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={nextSong}>
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleRepeat}
                className={repeat !== 'off' ? 'text-primary' : 'text-muted-foreground'}
              >
                <Repeat className="w-4 h-4" />
              </Button>
            </div>

            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={([value]) => seekTo(value)}
              className="w-full"
            />
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-4 md:items-center">
            {/* Song Info */}
            <div className="flex items-center gap-4">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-14 h-14 rounded-lg object-cover shadow-lg"
              />
              <div className="min-w-0">
                <p className="font-semibold truncate">{currentSong.title}</p>
                <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleShuffle}
                  className={shuffle ? 'text-primary' : 'text-muted-foreground'}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={prevSong}>
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 w-10 h-10 rounded-full"
                  onClick={isPlaying ? pauseSong : resumeSong}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={nextSong}>
                  <SkipForward className="w-5 h-5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleRepeat}
                  className={repeat !== 'off' ? 'text-primary' : 'text-muted-foreground'}
                >
                  <Repeat className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3 w-full">
                <span className="text-xs text-muted-foreground min-w-[40px]">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={([value]) => seekTo(value)}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground min-w-[40px]">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
              {showVolumeSlider && (
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={([value]) => setVolume(value)}
                  className="w-24"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
