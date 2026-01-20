import { api } from './api';

export type GamePhase = 'countdown' | 'playing' | 'answering' | 'revealing' | 'leaderboard' | 'round_ended' | 'finished';

export type MatchMode = 'title_only' | 'title_and_artist' | 'exact';

export interface HintEvent {
  round: number;
  hint: string;
  penaltyPercent: number;
}

export interface GameSong {
  audioUrl: string;
  sourceType?: 'upload' | 'youtube';
  previewStart: number;
  previewDuration: number;
  timeLimit: number;
  matchMode?: MatchMode;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentSong: GameSong | null;
  roundStartTime: number | null;
  roundEndTime: number | null;
  hasAnswered: boolean;
  scores: PlayerScore[];
}

export interface PlayerScore {
  playerId: string;
  nickname: string;
  score: number;
}

export interface RoundStartedEvent {
  round: number;
  totalRounds: number;
  song: GameSong;
  endTime: number;
}

export interface RoundEndedEvent {
  round: number;
  song: {
    title: string;
    artist: string;
  };
  correctAnswer: string;
  firstCorrectPlayerId: string | null;
  firstCorrectNickname: string | null;
  playerResults: PlayerResult[];
  skipped?: boolean;
}

export interface SkipVoteUpdate {
  count: number;
  total: number;
  percent: number;
}

export interface SkipExecutedEvent {
  reason: 'unanimous' | 'threshold' | 'auto_timeout';
}

// New event: someone got the correct answer
export interface CorrectAnswerEvent {
  round: number;
  playerId: string;
  nickname: string;
  points: number;
  song: {
    title: string;
    artist: string;
  };
}

// New event: round timed out (no one got it)
export interface RoundTimeoutEvent {
  round: number;
  song: {
    title: string;
    artist: string;
  };
  correctAnswer: string;
  skipped?: boolean;
}

export interface PlayerResult {
  playerId: string;
  nickname: string;
  answer: string;
  isCorrect: boolean;
  points: number;
  timeBonus: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  score: number;
  correctAnswers: number;
}

export interface LiveScoreEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
  correctCount: number;
  previousRank: number;
}

export interface GameEndResult {
  roomId: string;
  quizTitle: string;
  leaderboard: LeaderboardEntry[];
  roundResults: RoundResultResponse[];
  duration: number;
}

export interface RoundResultResponse {
  songIndex: number;
  song: {
    title: string;
    artist: string;
  };
  correctAnswer: string;
  playerResults: {
    playerId: string;
    nickname: string;
    answer: string;
    isCorrect: boolean;
    points: number;
    timeBonus: number;
    totalScore: number;
  }[];
}

export const gameApi = {
  async getGameState(roomId: string): Promise<GameState> {
    return await api.get<GameState>(`/game/rooms/${roomId}/game`);
  },

  async submitAnswer(roomId: string, answer: string): Promise<{ submitted: boolean; isCorrect: boolean; points: number }> {
    return await api.post(`/game/rooms/${roomId}/answer`, { answer });
  },

  async getLeaderboard(roomId: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
    return await api.get(`/game/rooms/${roomId}/leaderboard`);
  },

  async getResults(roomId: string): Promise<GameEndResult> {
    return await api.get(`/game/rooms/${roomId}/results`);
  },
};
