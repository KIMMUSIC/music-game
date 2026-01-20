import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { useChatStore } from '../stores/chatStore';
import { ChatPanel } from '../components/game/ChatPanel';
import { roomApi } from '../services/room';

const RoomLobby = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const {
    room,
    isLoading,
    error,
    connect,
    leaveRoom,
    setReady,
    kickPlayer,
    startGame,
    setRoom,
    setError,
  } = useRoomStore();

  const [copied, setCopied] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const { initializeListeners: initChatListeners, reset: resetChat } = useChatStore();

  useEffect(() => {
    if (token) {
      connect(token);
    }

    // Load room if not already loaded
    if (!room && id) {
      loadRoom();
    }

    return () => {
      resetChat();
    };
  }, [connect, id, token, resetChat]);

  // Initialize chat listeners when connected
  useEffect(() => {
    if (room) {
      initChatListeners();
    }
  }, [room, initChatListeners]);

  useEffect(() => {
    if (room?.status === 'playing') {
      navigate(`/game/${room.id}`);
    }
  }, [room?.status, room?.id, navigate]);

  const loadRoom = async () => {
    if (!id) return;

    try {
      const currentRoom = await roomApi.getCurrentRoom();
      if (currentRoom.inRoom && currentRoom.room) {
        setRoom(currentRoom.room);
      } else {
        navigate('/');
      }
    } catch {
      setError('Failed to load room');
      navigate('/');
    }
  };

  const handleCopyCode = async () => {
    if (!room) return;

    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input');
      input.value = room.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    navigate('/');
  };

  const handleToggleReady = async () => {
    if (!user || !room) return;

    const currentPlayer = room.players.find((p) => p.id === user.id);
    if (currentPlayer) {
      await setReady(!currentPlayer.isReady);
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (confirm('Are you sure you want to kick this player?')) {
      await kickPlayer(playerId);
    }
  };

  const handleStartGame = async () => {
    await startGame();
  };

  if (!room) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const isHost = user?.id === room.hostId;
  const currentPlayer = room.players.find((p) => p.id === user?.id);
  const allPlayersReady = room.players.every((p) => p.isReady);
  const canStart = isHost && allPlayersReady && room.players.length >= 1;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <Card className="p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{room.quizTitle}</h1>
              <p className="text-gray-500">Waiting for players...</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Room Code</div>
              <button
                onClick={handleCopyCode}
                className="text-2xl font-mono font-bold text-purple-600 hover:text-purple-700 transition-colors"
              >
                {room.code}
              </button>
              {copied && (
                <div className="text-xs text-green-600 mt-1">Copied!</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {room.players.length} / {room.maxPlayers} players
            </span>
            <span>Time limit: {room.settings.timeLimit}s per question</span>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Players</h2>

          <div className="space-y-3">
            {room.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  player.isReady ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                {player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt={player.nickname}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-purple-600">
                      {player.nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {player.nickname}
                    </span>
                    {player.isHost && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        Host
                      </span>
                    )}
                    {player.id === user?.id && (
                      <span className="text-xs text-gray-500">(You)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {player.isReady ? (
                    <span className="text-sm text-green-600 font-medium">
                      Ready
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Not ready</span>
                  )}

                  {isHost && !player.isHost && (
                    <button
                      onClick={() => handleKickPlayer(player.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Kick player"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Chat Panel */}
        <ChatPanel
          roomId={room.id}
          chatEnabled={room.settings.chatEnabled ?? true}
          collapsed={chatCollapsed}
          onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
          className="mb-6"
        />

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleLeaveRoom}
            className="flex-1"
          >
            Leave Room
          </Button>

          {isHost ? (
            <Button
              onClick={handleStartGame}
              disabled={!canStart || isLoading}
              className="flex-1"
            >
              {isLoading
                ? 'Starting...'
                : !allPlayersReady
                ? 'Waiting for players...'
                : room.players.length < 1
                ? 'Need more players'
                : 'Start Game'}
            </Button>
          ) : (
            <Button
              onClick={handleToggleReady}
              variant={currentPlayer?.isReady ? 'outline' : 'primary'}
              className="flex-1"
            >
              {currentPlayer?.isReady ? 'Cancel Ready' : 'Ready'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RoomLobby;
