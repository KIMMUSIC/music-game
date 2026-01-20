import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';

interface GameChatProps {
  roomId: string;
  chatEnabled: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  content: string;
  type: 'message' | 'emoji' | 'answer' | 'correct' | 'system';
  timestamp: number;
  isCorrect?: boolean;
}

export const GameChat = ({ roomId, chatEnabled }: GameChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, sendMessage, loadHistory } = useChatStore();
  const { phase, hasAnswered, submitAnswer } = useGameStore();
  const { user } = useAuthStore();
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (chatEnabled) {
      loadHistory(roomId);
    }
  }, [roomId, chatEnabled, loadHistory]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when round starts
  useEffect(() => {
    if (phase === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const content = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    try {
      // If in playing phase and haven't answered, treat as answer
      if (phase === 'playing' && !hasAnswered) {
        await submitAnswer(roomId, content);
      }
      // Always send as chat message too (so others can see what was typed)
      if (chatEnabled) {
        await sendMessage(content, 'message');
      }
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlaceholder = () => {
    if (!chatEnabled) return 'Chat is disabled';
    if (phase === 'round_ended') return 'Round ended. Next round starting...';
    if (phase === 'playing') {
      if (hasAnswered) return 'Correct! You can still chat...';
      return 'Type your answer...';
    }
    return 'Type a message...';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Chat</span>
        </div>
        {(phase === 'playing' || phase === 'round_ended') && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            phase === 'round_ended'
              ? 'bg-blue-100 text-blue-700'
              : hasAnswered
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {phase === 'round_ended' ? 'Round ended' : hasAnswered ? 'Correct!' : 'Type answer below'}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
            <p>No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg: ChatMessage) => {
              const isOwnMessage = msg.playerId === user?.id;
              const isSystemMessage = msg.type === 'system';
              const isCorrectAnswer = msg.type === 'correct';

              if (isSystemMessage) {
                return (
                  <div key={msg.id} className="text-center">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-xs font-medium ${
                      isOwnMessage ? 'text-purple-600' : 'text-gray-600'
                    }`}>
                      {isOwnMessage ? 'You' : msg.nickname}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-lg text-sm ${
                      isCorrectAnswer
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : isOwnMessage
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {isCorrectAnswer && (
                      <span className="mr-1">✓</span>
                    )}
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={phase === 'round_ended' || (!chatEnabled && phase !== 'playing')}
            className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              phase === 'round_ended'
                ? 'border-gray-200 bg-gray-100 text-gray-500'
                : phase === 'playing' && !hasAnswered
                ? 'border-purple-300 bg-purple-50'
                : 'border-gray-300 bg-white'
            }`}
            autoComplete="off"
          />
          <button
            onClick={handleSend}
            disabled={phase === 'round_ended' || !inputValue.trim() || isSending}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              phase === 'round_ended'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : phase === 'playing' && !hasAnswered
                ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-300'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400'
            }`}
          >
            {phase === 'playing' && !hasAnswered ? 'Answer' : 'Send'}
          </button>
        </div>
        {phase === 'playing' && !hasAnswered && (
          <p className="text-xs text-purple-600 mt-1">
            Press Enter to submit your answer
          </p>
        )}
        {phase === 'round_ended' && (
          <p className="text-xs text-blue-600 mt-1">
            Get ready for the next round!
          </p>
        )}
      </div>
    </div>
  );
};
