import { useState, useEffect } from 'react';

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
}

const VOLUME_STORAGE_KEY = 'musicquiz_volume';

export const useVolume = () => {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 50;
  });

  useEffect(() => {
    localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
  }, [volume]);

  return [volume, setVolume] as const;
};

export const VolumeControl = ({ volume, onChange }: VolumeControlProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const handleMuteToggle = () => {
    if (isMuted) {
      onChange(prevVolume || 50);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      onChange(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    onChange(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      );
    } else if (volume < 50) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    }
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <button
        onClick={handleMuteToggle}
        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {getVolumeIcon()}
      </button>

      <div
        className={`flex items-center gap-2 overflow-hidden transition-all duration-200 ${
          isExpanded ? 'w-28 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
          className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <span className="text-xs text-gray-500 w-7 text-right">
          {isMuted ? 0 : volume}
        </span>
      </div>
    </div>
  );
};
