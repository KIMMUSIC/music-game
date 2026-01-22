import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  startTime?: number;
  previewDuration?: number;
  autoPlay?: boolean;
  volume?: number;
  onReady?: () => void;
  onError?: () => void;
}

export interface YouTubePlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

// Extract video ID from various YouTube URL formats
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  ({ videoUrl, startTime = 0, previewDuration = 30, autoPlay = false, volume = 100, onReady, onError }, ref) => {
    const playerRef = useRef<YT.Player | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const videoId = extractVideoId(videoUrl);

    // Use refs for values that shouldn't trigger re-renders
    const configRef = useRef({ startTime, previewDuration, volume, autoPlay });
    configRef.current = { startTime, previewDuration, volume, autoPlay };

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
      setVolume: (vol: number) => playerRef.current?.setVolume(vol),
    }));

    // Update volume when prop changes
    useEffect(() => {
      if (playerRef.current && isReady) {
        playerRef.current.setVolume(volume);
      }
    }, [volume, isReady]);

    // Main player setup - only depends on videoId
    useEffect(() => {
      if (!videoId || !containerRef.current) return;

      const containerId = `yt-player-${videoId}-${Date.now()}`;

      // Create player container
      const playerDiv = document.createElement('div');
      playerDiv.id = containerId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      let player: YT.Player | null = null;
      let loopInterval: ReturnType<typeof setInterval> | null = null;
      let isDestroyed = false;

      const createPlayer = () => {
        if (isDestroyed) return;

        const element = document.getElementById(containerId);
        if (!element) return;

        const { startTime: start, previewDuration: duration, volume: vol, autoPlay: auto } = configRef.current;

        player = new window.YT.Player(element, {
          height: '1',
          width: '1',
          videoId: videoId,
          playerVars: {
            autoplay: auto ? 1 : 0,
            start: Math.floor(start),
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (isDestroyed) return;

              playerRef.current = event.target;
              event.target.setVolume(vol);

              // Seek to start position
              event.target.seekTo(start, true);

              if (auto) {
                setTimeout(() => {
                  if (!isDestroyed && playerRef.current) {
                    playerRef.current.playVideo();
                  }
                }, 200);
              }

              setIsReady(true);
              onReady?.();

              // Setup looping - check every 500ms
              loopInterval = setInterval(() => {
                if (isDestroyed || !playerRef.current) return;

                try {
                  const currentTime = playerRef.current.getCurrentTime();
                  const { startTime: loopStart, previewDuration: loopDuration } = configRef.current;
                  const endTime = loopStart + loopDuration;

                  // If past end time, loop back to start
                  if (currentTime >= endTime) {
                    playerRef.current.seekTo(loopStart, true);
                  }
                } catch {
                  // Ignore errors
                }
              }, 500);
            },
            onError: (event) => {
              console.error('YouTube player error:', event);
              onError?.();
            },
            onStateChange: (event) => {
              // YT.PlayerState: UNSTARTED=-1, ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5
              if (event.data === 0) {
                // Video ended - restart from beginning of segment
                const { startTime: loopStart } = configRef.current;
                playerRef.current?.seekTo(loopStart, true);
                playerRef.current?.playVideo();
              }
            },
          },
        });
      };

      // Load YouTube API if needed
      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
        if (!existingScript) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }

        // Wait for API to be ready
        const checkReady = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkReady);
            createPlayer();
          }
        }, 100);

        // Cleanup the interval if component unmounts
        setTimeout(() => clearInterval(checkReady), 10000);
      }

      return () => {
        isDestroyed = true;
        if (loopInterval) clearInterval(loopInterval);
        if (player) {
          try {
            player.destroy();
          } catch {
            // Ignore
          }
        }
        playerRef.current = null;
        setIsReady(false);
      };
    }, [videoId, onReady, onError]);

    // Handle tab visibility - resume playback when tab becomes visible
    useEffect(() => {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && playerRef.current && isReady) {
          // Resume playback when tab becomes visible
          playerRef.current.playVideo();
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isReady]);

    if (!videoId) return null;

    // Use visibility:hidden instead of display:none to keep audio playing
    // Position off-screen but still "visible" to the browser
    return (
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      />
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

// Type declarations for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement | string,
        options: {
          height: string;
          width: string;
          videoId: string;
          playerVars?: {
            autoplay?: number;
            start?: number;
            controls?: number;
            disablekb?: number;
            fs?: number;
            modestbranding?: number;
            rel?: number;
            playsinline?: number;
          };
          events?: {
            onReady?: (event: { target: YT.Player }) => void;
            onError?: (event: { data: number }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YT.Player;
    };
    onYouTubeIframeAPIReady?: () => void;
  }

  namespace YT {
    interface Player {
      playVideo: () => void;
      pauseVideo: () => void;
      seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
      setVolume: (volume: number) => void;
      getVolume: () => number;
      getCurrentTime: () => number;
      destroy: () => void;
    }
  }
}
