export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  score: number;
  joinedAt: number;
}

export interface RoomState {
  id: string;
  code: string;
  hostId: string;
  quizId: string;
  quizTitle: string;
  status: RoomStatus;
  maxPlayers: number;
  players: RoomPlayer[];
  currentSongIndex: number;
  settings: RoomSettings;
  createdAt: number;
  startedAt: number | null;
}

export type ScoringMode = 'all_correct' | 'first_correct_only';
export type LiveScoreDisplay = 'full' | 'compact' | 'hidden';

export interface RoomSettings {
  timeLimit: number; // seconds per question
  showLeaderboard: boolean;
  allowLateJoin: boolean;
  scoringMode: ScoringMode;
  liveScoreDisplay: LiveScoreDisplay;
  chatEnabled: boolean;
  skipVotingEnabled: boolean;
  skipThresholdPercent: number; // 50-100, default 100
  autoSkipSeconds: number | null; // null = disabled
}

export interface CreateRoomDto {
  quizId: string;
  maxPlayers?: number;
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomDto {
  code: string;
}

export interface RoomResponse {
  id: string;
  code: string;
  hostId: string;
  quizId: string;
  quizTitle: string;
  status: RoomStatus;
  maxPlayers: number;
  playerCount: number;
  players: Omit<RoomPlayer, 'joinedAt'>[];
  settings: RoomSettings;
}
