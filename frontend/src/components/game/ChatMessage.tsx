import { useAuthStore } from '../../stores/authStore';

export interface ChatMessageData {
  id: string;
  roomId: string;
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'emoji';
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const { user } = useAuthStore();
  const isOwnMessage = user?.id === message.playerId;
  const isSystem = message.type === 'system';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] ${
          isOwnMessage
            ? 'bg-purple-600 text-white rounded-l-lg rounded-tr-lg'
            : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg'
        } px-3 py-2`}
      >
        {!isOwnMessage && (
          <div className="text-xs font-medium text-purple-600 mb-1">
            {message.nickname}
          </div>
        )}
        <div className={`text-sm ${message.type === 'emoji' ? 'text-2xl' : ''}`}>
          {message.content}
        </div>
        <div
          className={`text-xs mt-1 ${
            isOwnMessage ? 'text-purple-200' : 'text-gray-400'
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};
