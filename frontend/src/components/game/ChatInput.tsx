import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string, type: 'message' | 'emoji') => void;
  disabled?: boolean;
  placeholder?: string;
}

const EMOJI_LIST = ['👍', '👏', '🎉', '🔥', '😂', '😍', '🤔', '😱', '💯', '🎵', '🎶', '🎸'];

export const ChatInput = ({ onSend, disabled, placeholder = 'Type a message...' }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed, 'message');
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onSend(emoji, 'emoji');
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {showEmojis && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          <div className="grid grid-cols-6 gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl p-2 hover:bg-gray-100 rounded transition-colors"
                disabled={disabled}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className={`p-2 rounded-full transition-colors ${
            showEmojis ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-200 text-gray-500'
          }`}
          disabled={disabled}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={200}
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      <div className="text-xs text-gray-400 mt-1 text-right">
        {message.length}/200
      </div>
    </div>
  );
};
