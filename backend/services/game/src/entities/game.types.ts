export type GamePhase = 'countdown' | 'playing' | 'answering' | 'revealing' | 'leaderboard' | 'round_ended' | 'finished';

export type MatchMode = 'title_only' | 'title_and_artist' | 'exact';

export interface GameSong {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  sourceType?: 'upload' | 'youtube';
  previewStart: number;
  previewDuration: number;
  timeLimit: number;
  matchMode?: MatchMode;
  alternativeAnswers?: string[];
  genre?: string | null;
  releaseYear?: number | null;
  hint?: string | null;
}

export interface PlayerAnswer {
  playerId: string;
  answer: string;
  submittedAt: number;
  isCorrect: boolean;
  points: number;
  timeBonus: number;
}

export interface RoundResult {
  songIndex: number;
  song: GameSong;
  answers: PlayerAnswer[];
  correctAnswer: string;
  firstCorrectPlayerId: string | null;
  firstCorrectNickname: string | null;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  songs: GameSong[];
  currentSong: GameSong | null;
  roundStartTime: number | null;
  roundEndTime: number | null;
  answers: Map<string, PlayerAnswer>;
  roundResults: RoundResult[];
  scores: Map<string, number>;
  firstCorrectPlayerId: string | null;
  firstCorrectNickname: string | null;
  skipVotes: Set<string>; // playerIds who voted to skip
  skipVotingEnabled: boolean;
  skipThresholdPercent: number;
  roundSkipped: boolean;
  // Playback errors
  playbackErrorReports: Set<string>; // playerIds who reported playback errors
  // Hints
  hintsEnabled: boolean;
  hintRevealed: boolean;
  hintDelaySeconds: number;
  hintPenaltyPercent: number;
}

export interface GameStateResponse {
  roomId: string;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentSong: {
    audioUrl: string;
    sourceType?: 'upload' | 'youtube';
    previewStart: number;
    previewDuration: number;
    timeLimit: number;
    matchMode?: MatchMode;
  } | null;
  roundStartTime: number | null;
  roundEndTime: number | null;
  hasAnswered: boolean;
  scores: { playerId: string; nickname: string; score: number }[];
}

export interface SubmitAnswerDto {
  answer: string;
}

export interface RoundResultResponse {
  songIndex: number;
  song: {
    title: string;
    artist: string;
  };
  correctAnswer: string;
  firstCorrectPlayerId: string | null;
  firstCorrectNickname: string | null;
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

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  score: number;
  correctAnswers: number;
}

export interface GameEndResult {
  roomId: string;
  quizTitle: string;
  leaderboard: LeaderboardEntry[];
  roundResults: RoundResultResponse[];
  duration: number;
}
