import { api } from './api';

export interface PlayerStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  averageScore: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  averageResponseTimeMs: number | null;
  winRate: number;
  bestScore: number;
  currentStreak: number;
}

export interface GameHistoryItem {
  id: string;
  quizTitle: string;
  playedAt: string;
  playerCount: number;
  rank: number;
  score: number;
  correctAnswers: number;
  totalRounds: number;
  isWinner: boolean;
}

export interface GlobalLeaderboardEntry {
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  totalScore: number;
  gamesPlayed: number;
  wins: number;
  averageScore: number;
}

export interface GameDetails {
  id: string;
  roomId: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  winnerId: string | null;
  playerCount: number;
  totalRounds: number;
  durationMs: number;
  roundData: {
    songTitle: string;
    songArtist: string;
    correctAnswers: number;
  }[];
  playedAt: string;
  playerResults: {
    id: string;
    playerId: string;
    playerNickname: string;
    playerAvatarUrl: string | null;
    rank: number;
    score: number;
    correctAnswers: number;
    totalAnswers: number;
    isWinner: boolean;
    answerDetails: {
      round: number;
      answer: string;
      isCorrect: boolean;
      points: number;
      responseTimeMs: number;
    }[];
  }[];
}

export const gameHistoryApi = {
  async getMyGames(limit = 20, offset = 0): Promise<{ games: GameHistoryItem[]; total: number }> {
    return api.get<{ games: GameHistoryItem[]; total: number }>(`/game-history/my-games?limit=${limit}&offset=${offset}`);
  },

  async getMyStats(): Promise<PlayerStats> {
    return api.get<PlayerStats>('/game-history/my-stats');
  },

  async getPlayerGames(playerId: string, limit = 20, offset = 0): Promise<{ games: GameHistoryItem[]; total: number }> {
    return api.get<{ games: GameHistoryItem[]; total: number }>(`/game-history/players/${playerId}/games?limit=${limit}&offset=${offset}`);
  },

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    return api.get<PlayerStats>(`/game-history/players/${playerId}/stats`);
  },

  async getGameDetails(gameId: string): Promise<GameDetails> {
    return api.get<GameDetails>(`/game-history/games/${gameId}`);
  },

  async getGlobalLeaderboard(limit = 50): Promise<{ leaderboard: GlobalLeaderboardEntry[] }> {
    return api.get<{ leaderboard: GlobalLeaderboardEntry[] }>(`/game-history/leaderboard/global?limit=${limit}`);
  },

  async getQuizLeaderboard(quizId: string, limit = 20): Promise<{ leaderboard: GlobalLeaderboardEntry[] }> {
    return api.get<{ leaderboard: GlobalLeaderboardEntry[] }>(`/game-history/leaderboard/quiz/${quizId}?limit=${limit}`);
  },
};
