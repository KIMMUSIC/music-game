import { io, Socket } from 'socket.io-client';
import { api } from './api';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

export type LiveScoreDisplay = 'full' | 'compact' | 'hidden';

export interface RoomSettings {
  timeLimit: number;
  showLeaderboard: boolean;
  allowLateJoin: boolean;
  liveScoreDisplay: LiveScoreDisplay;
  chatEnabled: boolean;
  skipVotingEnabled: boolean;
  skipThresholdPercent: number;
  autoSkipSeconds: number | null;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  quizId: string;
  quizTitle: string;
  status: RoomStatus;
  maxPlayers: number;
  playerCount: number;
  players: RoomPlayer[];
  settings: RoomSettings;
}

export interface RoomSocketEvents {
  // Outgoing events
  'room:create': { quizId: string; quizTitle: string; maxPlayers?: number };
  'room:join': { code: string };
  'room:leave': void;
  'room:ready': { isReady: boolean };
  'room:kick': { playerId: string };
  'room:update_settings': { settings: Partial<RoomSettings> };
  'room:start': void;

  // Game events (outgoing)
  'game:submit_answer': { answer: string; roomId: string };
  'game:vote_skip': { roomId: string };
  'game:report_playback_error': { roomId: string };
  'game:get_state': { roomId: string };

  // Incoming events
  connected: { userId: string };
  'room:rejoined': Room;
  'room:player_joined': { player: RoomPlayer; room: Room };
  'room:player_left': { playerId: string; room: Room };
  'room:player_ready': { playerId: string; isReady: boolean; room: Room };
  'room:player_kicked': { playerId: string; room: Room };
  'room:kicked': void;
  'room:settings_updated': { settings: RoomSettings; room: Room };
  'room:game_starting': { room: Room };
  'room:closed': void;
  'room:reset': { room: Room };
}

class RoomSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected && this.token === token) {
      return this.socket;
    }

    this.token = token;
    // In production, use relative URL to connect through ALB; in development use localhost
    const gameServiceUrl = import.meta.env.VITE_GAME_SERVICE_URL || (
      typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? ''
        : 'http://localhost:3003'
    );
    this.socket = io(`${gameServiceUrl}/room`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit<K extends keyof RoomSocketEvents>(
    event: K,
    data?: RoomSocketEvents[K],
  ): Promise<{ success?: boolean; error?: string; room?: Room }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ error: 'Not connected' });
        return;
      }

      this.socket.emit(event, data, (response: { success?: boolean; error?: string; room?: Room }) => {
        resolve(response);
      });
    });
  }

  on<K extends keyof RoomSocketEvents>(
    event: K,
    callback: (data: RoomSocketEvents[K]) => void,
  ): void {
    if (this.socket) {
      this.socket.on(event as string, callback as (...args: unknown[]) => void);
    }
  }

  off<K extends keyof RoomSocketEvents>(event: K): void {
    if (this.socket) {
      this.socket.off(event as string);
    }
  }
}

export const roomSocket = new RoomSocketService();

export const roomApi = {
  async getCurrentRoom(): Promise<{ inRoom: boolean; room?: Room }> {
    return await api.get<{ inRoom: boolean; room?: Room }>('/game/rooms/current');
  },

  async getRoomByCode(code: string): Promise<Room> {
    return await api.get<Room>(`/game/rooms/code/${code}`);
  },

  async createRoom(data: { quizId: string; quizTitle: string; maxPlayers?: number }): Promise<Room> {
    return await api.post<Room>('/game/rooms', data);
  },

  async joinRoom(code: string): Promise<Room> {
    return await api.post<Room>('/game/rooms/join', { code });
  },
};
