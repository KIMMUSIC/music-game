import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

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
  ({ videoUrl, startTime = 0, previewDuration, autoPlay = false, volume = 100, onReady, onError }, ref) => {
    const playerRef = useRef<YT.Player | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerElementId = useRef(`youtube-player-${Math.random().toString(36).substr(2, 9)}`);
    const loopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const videoId = extractVideoId(videoUrl);

    useImperativeHandle(ref, () => ({
      play: () => {
        playerRef.current?.playVideo();
      },
      pause: () => {
        playerRef.current?.pauseVideo();
      },
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
      },
      setVolume: (vol: number) => {
        playerRef.current?.setVolume(vol);
      },
    }));

    // Update volume when prop changes
    useEffect(() => {
      if (playerRef.current) {
        playerRef.current.setVolume(volume);
      }
    }, [volume]);

    // Setup loop interval for preview segment
    useEffect(() => {
      if (!previewDuration || previewDuration <= 0) return;

      const checkAndLoop = () => {
        if (playerRef.current) {
          const currentTime = playerRef.current.getCurrentTime();
          const endTime = startTime + previewDuration;
          if (currentTime >= endTime) {
            playerRef.current.seekTo(startTime, true);
          }
        }
      };

      // Check every 100ms
      loopIntervalRef.current = setInterval(checkAndLoop, 100);

      return () => {
        if (loopIntervalRef.current) {
          clearInterval(loopIntervalRef.current);
          loopIntervalRef.current = null;
        }
      };
    }, [startTime, previewDuration]);

    useEffect(() => {
      if (!videoId || !containerRef.current) return;

      // Create a div for YouTube to replace (outside of React's control)
      const playerDiv = document.createElement('div');
      playerDiv.id = playerElementId.current;
      containerRef.current.appendChild(playerDiv);

      // Load YouTube IFrame API if not already loaded
      if (!window.YT || !window.YT.Player) {
        const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
        if (!existingScript) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        window.onYouTubeIframeAPIReady = () => {
          initializePlayer();
        };
      } else {
        initializePlayer();
      }

      function initializePlayer() {
        const element = document.getElementById(playerElementId.current);
        if (!element) return;

        playerRef.current = new window.YT.Player(element, {
          height: '0',
          width: '0',
          videoId: videoId!,
          playerVars: {
            autoplay: autoPlay ? 1 : 0,
            start: Math.floor(startTime),
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              // Set initial volume
              event.target.setVolume(volume);
              if (autoPlay) {
                event.target.playVideo();
              }
              onReady?.();
            },
            onError: () => {
              onError?.();
            },
          },
        });
      }

      return () => {
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {
            // Ignore errors during cleanup
          }
          playerRef.current = null;
        }
        // Clean up the container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    }, [videoId, startTime, autoPlay, onReady, onError]);

    if (!videoId) {
      return null;
    }

    return <div ref={containerRef} className="hidden" />;
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

// Type declarations for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
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
          };
          events?: {
            onReady?: (event: { target: YT.Player }) => void;
            onError?: () => void;
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
