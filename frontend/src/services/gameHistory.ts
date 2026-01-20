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
    const response = await api.get(`/game-history/my-games?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getMyStats(): Promise<PlayerStats> {
    const response = await api.get('/game-history/my-stats');
    return response.data;
  },

  async getPlayerGames(playerId: string, limit = 20, offset = 0): Promise<{ games: GameHistoryItem[]; total: number }> {
    const response = await api.get(`/game-history/players/${playerId}/games?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const response = await api.get(`/game-history/players/${playerId}/stats`);
    return response.data;
  },

  async getGameDetails(gameId: string): Promise<GameDetails> {
    const response = await api.get(`/game-history/games/${gameId}`);
    return response.data;
  },

  async getGlobalLeaderboard(limit = 50): Promise<{ leaderboard: GlobalLeaderboardEntry[] }> {
    const response = await api.get(`/game-history/leaderboard/global?limit=${limit}`);
    return response.data;
  },

  async getQuizLeaderboard(quizId: string, limit = 20): Promise<{ leaderboard: GlobalLeaderboardEntry[] }> {
    const response = await api.get(`/game-history/leaderboard/quiz/${quizId}?limit=${limit}`);
    return response.data;
  },
};
