import { create } from 'zustand';
import { Room, RoomPlayer, RoomSettings, roomSocket } from '../services/room';

interface RoomState {
  room: Room | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setRoom: (room: Room | null) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePlayer: (playerId: string, updates: Partial<RoomPlayer>) => void;
  addPlayer: (player: RoomPlayer) => void;
  removePlayer: (playerId: string) => void;
  updateSettings: (settings: RoomSettings) => void;

  // Socket actions
  connect: (token: string) => void;
  disconnect: () => void;
  createRoom: (quizId: string, quizTitle: string, maxPlayers?: number) => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setReady: (isReady: boolean) => Promise<void>;
  kickPlayer: (playerId: string) => Promise<void>;
  updateRoomSettings: (settings: Partial<RoomSettings>) => Promise<void>;
  startGame: () => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  isConnected: false,
  isLoading: false,
  error: null,

  setRoom: (room) => set({ room }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  updatePlayer: (playerId, updates) => {
    const { room } = get();
    if (!room) return;

    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, ...updates } : p
    );

    set({ room: { ...room, players } });
  },

  addPlayer: (player) => {
    const { room } = get();
    if (!room) return;

    set({
      room: {
        ...room,
        players: [...room.players, player],
        playerCount: room.playerCount + 1,
      },
    });
  },

  removePlayer: (playerId) => {
    const { room } = get();
    if (!room) return;

    set({
      room: {
        ...room,
        players: room.players.filter((p) => p.id !== playerId),
        playerCount: room.playerCount - 1,
      },
    });
  },

  updateSettings: (settings) => {
    const { room } = get();
    if (!room) return;

    set({ room: { ...room, settings } });
  },

  connect: (token) => {
    const socket = roomSocket.connect(token);

    socket.on('connect', () => {
      set({ isConnected: true, error: null });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', () => {
      set({ error: 'Failed to connect to game server' });
    });

    roomSocket.on('room:rejoined', (room) => {
      set({ room });
    });

    roomSocket.on('room:player_joined', ({ room }) => {
      set({ room });
    });

    roomSocket.on('room:player_left', ({ room }) => {
      set({ room });
    });

    roomSocket.on('room:player_ready', ({ room }) => {
      set({ room });
    });

    roomSocket.on('room:player_kicked', ({ room }) => {
      set({ room });
    });

    roomSocket.on('room:kicked', () => {
      set({ room: null, error: 'You were kicked from the room' });
    });

    roomSocket.on('room:settings_updated', ({ room }) => {
      set({ room });
    });

    roomSocket.on('room:game_starting', ({ room }) => {
      set({ room });
    });

    roomSocket.on('room:reset', ({ room }) => {
      set({ room });
    });

    roomSocket.on('room:closed', () => {
      set({ room: null });
    });
  },

  disconnect: () => {
    roomSocket.disconnect();
    set({ isConnected: false, room: null });
  },

  createRoom: async (quizId, quizTitle, maxPlayers) => {
    set({ isLoading: true, error: null });

    const response = await roomSocket.emit('room:create', {
      quizId,
      quizTitle,
      maxPlayers,
    });

    if (response.error) {
      set({ error: response.error, isLoading: false });
    } else if (response.room) {
      set({ room: response.room, isLoading: false });
    }
  },

  joinRoom: async (code) => {
    set({ isLoading: true, error: null });

    const response = await roomSocket.emit('room:join', { code });

    if (response.error) {
      set({ error: response.error, isLoading: false });
    } else if (response.room) {
      set({ room: response.room, isLoading: false });
    }
  },

  leaveRoom: async () => {
    set({ isLoading: true });

    const response = await roomSocket.emit('room:leave');

    if (response.error) {
      set({ error: response.error, isLoading: false });
    } else {
      set({ room: null, isLoading: false });
    }
  },

  setReady: async (isReady) => {
    const response = await roomSocket.emit('room:ready', { isReady });

    if (response.error) {
      set({ error: response.error });
    }
  },

  kickPlayer: async (playerId) => {
    const response = await roomSocket.emit('room:kick', { playerId });

    if (response.error) {
      set({ error: response.error });
    }
  },

  updateRoomSettings: async (settings) => {
    const response = await roomSocket.emit('room:update_settings', { settings });

    if (response.error) {
      set({ error: response.error });
    }
  },

  startGame: async () => {
    set({ isLoading: true, error: null });

    const response = await roomSocket.emit('room:start');

    if (response.error) {
      set({ error: response.error, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },
}));
