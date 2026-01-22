import { io, Socket } from 'socket.io-client';

// In production, use relative URL to connect through ALB; in development use localhost
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? ''
    : 'http://localhost:3003'
);

export interface SocketEvents {
  // Room events
  'room:join': { roomCode: string; wsToken: string };
  'room:state': {
    status: 'lobby' | 'playing' | 'finished';
    players: Player[];
    currentQuestion: number;
    totalQuestions: number;
  };
  'room:leave': void;

  // Player events
  'player:joined': { player: Player };
  'player:left': { userId: string };

  // Game events
  'game:start': {
    questionIndex: number;
    audioType: 'youtube' | 'mp3';
    audioSource: string;
    startTimeMs: number;
    endTimeMs: number;
    timeLimitSec: number;
    serverTime: number;
  };
  'game:end': { rankings: PlayerResult[] };

  // Answer events
  'answer:submit': { answer: string; timestamp: number };
  'answer:result': {
    correct: boolean;
    points: number;
    correctAnswer?: string;
  };

  // Score events
  'score:update': {
    userId: string;
    score: number;
    correct: boolean;
  };

  // Question events
  'question:end': {
    questionIndex: number;
    correctAnswer: string;
    playerAnswers: {
      userId: string;
      answer: string;
      correct: boolean;
      points: number;
    }[];
  };

  // Error
  error: { code: string; message: string };
}

export interface Player {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  score: number;
  isHost: boolean;
  isActive: boolean;
}

export interface PlayerResult {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  totalScore: number;
  correctAnswers: number;
  averageResponseTimeMs: number;
}

class SocketService {
  private socket: Socket | null = null;

  connect(wsToken?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      auth: wsToken ? { token: wsToken } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit:', event);
    }
  }

  on<K extends keyof SocketEvents>(
    event: K,
    callback: (data: SocketEvents[K]) => void,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.on(event, callback as any);
  }

  off<K extends keyof SocketEvents>(event: K): void {
    this.socket?.off(event);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
export default socketService;
