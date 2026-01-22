import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import axios from 'axios';
import {
  GameState,
  GamePhase,
  GameSong,
  PlayerAnswer,
  RoundResult,
  GameStateResponse,
  RoundResultResponse,
  LeaderboardEntry,
  GameEndResult,
} from '../entities/game.types';
import { RoomState, RoomPlayer } from '../entities/room.types';

@Injectable()
export class GameService {
  private readonly gamePrefix = 'game:';
  private readonly gameTTL = 3600 * 3; // 3 hours
  private readonly basePoints = 1000;
  private readonly timeBonusMax = 500;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private configService: ConfigService,
  ) {}

  async initializeGame(room: RoomState): Promise<GameState> {
    // Fetch quiz songs and hint config from Quiz service
    const quizData = await this.fetchQuizData(room.quizId);

    if (quizData.songs.length === 0) {
      throw new BadRequestException('Quiz has no songs');
    }

    const gameState: GameState = {
      roomId: room.id,
      phase: 'countdown',
      currentRound: 0,
      totalRounds: quizData.songs.length,
      songs: quizData.songs,
      currentSong: null,
      roundStartTime: null,
      roundEndTime: null,
      answers: new Map(),
      roundResults: [],
      scores: new Map(room.players.map((p) => [p.id, 0])),
      firstCorrectPlayerId: null,
      firstCorrectNickname: null,
      skipVotes: new Set(),
      skipVotingEnabled: room.settings.skipVotingEnabled ?? false,
      skipThresholdPercent: room.settings.skipThresholdPercent ?? 100,
      roundSkipped: false,
      playbackErrorReports: new Set(),
      hintsEnabled: quizData.hintsEnabled,
      hintRevealed: false,
      hintDelaySeconds: 5, // Fixed 5 second delay for hints
      hintPenaltyPercent: 10, // Fixed 10% penalty for using hints
    };

    await this.saveGame(gameState);
    return gameState;
  }

  async getGame(roomId: string): Promise<GameState> {
    const data = await this.redis.get(`${this.gamePrefix}${roomId}`);

    if (!data) {
      throw new NotFoundException('Game not found');
    }

    const parsed = JSON.parse(data);
    // Restore Maps from JSON
    parsed.answers = new Map(Object.entries(parsed.answers || {}));
    parsed.scores = new Map(Object.entries(parsed.scores || {}));
    // Restore Sets from arrays
    parsed.skipVotes = new Set(parsed.skipVotes || []);
    parsed.playbackErrorReports = new Set(parsed.playbackErrorReports || []);
    // Ensure new fields have defaults for backward compatibility
    parsed.firstCorrectPlayerId = parsed.firstCorrectPlayerId || null;
    parsed.firstCorrectNickname = parsed.firstCorrectNickname || null;
    parsed.skipVotingEnabled = parsed.skipVotingEnabled ?? false;
    parsed.skipThresholdPercent = parsed.skipThresholdPercent ?? 100;
    parsed.roundSkipped = parsed.roundSkipped ?? false;
    // Hint fields
    parsed.hintsEnabled = parsed.hintsEnabled ?? false;
    parsed.hintRevealed = parsed.hintRevealed ?? false;
    parsed.hintDelaySeconds = parsed.hintDelaySeconds ?? 5;
    parsed.hintPenaltyPercent = parsed.hintPenaltyPercent ?? 10;

    return parsed;
  }

  async startRound(roomId: string): Promise<GameState> {
    const game = await this.getGame(roomId);

    if (game.currentRound >= game.totalRounds) {
      game.phase = 'finished';
      await this.saveGame(game);
      return game;
    }

    game.phase = 'playing';
    game.currentSong = game.songs[game.currentRound];
    game.roundStartTime = Date.now();
    game.roundEndTime = Date.now() + game.currentSong.timeLimit * 1000;
    game.answers = new Map();
    game.firstCorrectPlayerId = null;
    game.firstCorrectNickname = null;
    game.skipVotes = new Set();
    game.playbackErrorReports = new Set();
    game.roundSkipped = false;
    game.hintRevealed = false;

    await this.saveGame(game);
    return game;
  }

  async submitAnswer(
    roomId: string,
    playerId: string,
    playerNickname: string,
    answer: string,
  ): Promise<{ playerAnswer: PlayerAnswer; isFirstCorrect: boolean }> {
    const game = await this.getGame(roomId);

    if (game.phase !== 'playing') {
      throw new BadRequestException('Not in playing phase');
    }

    // Check if player already got the correct answer - if so, don't allow more submissions
    const existingAnswer = game.answers.get(playerId);
    if (existingAnswer && existingAnswer.isCorrect) {
      throw new BadRequestException('You already got the correct answer');
    }

    const now = Date.now();
    if (now > game.roundEndTime!) {
      throw new BadRequestException('Time is up');
    }

    const currentSong = game.currentSong!;
    const normalizedAnswer = answer.toLowerCase().trim();

    // Check if answer is correct (fuzzy matching)
    const isCorrect = this.checkAnswer(normalizedAnswer, currentSong);

    // Calculate points based on scoring mode
    const timeTaken = now - game.roundStartTime!;
    const timeRemaining = game.roundEndTime! - now;
    const currentTimeLimit = game.currentSong!.timeLimit;
    const timeBonus = isCorrect
      ? Math.floor((timeRemaining / (currentTimeLimit * 1000)) * this.timeBonusMax)
      : 0;

    let points = 0;
    let isFirstCorrect = false;

    if (isCorrect) {
      // First correct only: only the first correct answer gets points
      if (game.firstCorrectPlayerId === null) {
        let baseAndBonus = this.basePoints + timeBonus;
        // Apply hint penalty if hint was revealed
        if (game.hintRevealed && game.hintPenaltyPercent > 0) {
          const penaltyReduction = Math.floor(baseAndBonus * (game.hintPenaltyPercent / 100));
          baseAndBonus = Math.max(baseAndBonus - penaltyReduction, 100); // Min 100 points
        }
        points = baseAndBonus;
        game.firstCorrectPlayerId = playerId;
        game.firstCorrectNickname = playerNickname;
        isFirstCorrect = true;
      }
      // Subsequent correct answers get 0 points
    }

    const playerAnswer: PlayerAnswer = {
      playerId,
      answer,
      submittedAt: now,
      isCorrect,
      points,
      timeBonus: isCorrect ? timeBonus : 0,
    };

    game.answers.set(playerId, playerAnswer);

    // Update player's total score
    const currentScore = game.scores.get(playerId) || 0;
    game.scores.set(playerId, currentScore + points);

    await this.saveGame(game);
    return { playerAnswer, isFirstCorrect };
  }

  async voteSkip(
    roomId: string,
    playerId: string,
    totalPlayers: number,
  ): Promise<{ voted: boolean; skipVoteCount: number; shouldSkip: boolean }> {
    const game = await this.getGame(roomId);

    if (game.phase !== 'playing') {
      throw new BadRequestException('Not in playing phase');
    }

    if (!game.skipVotingEnabled) {
      throw new BadRequestException('Skip voting is not enabled');
    }

    if (game.skipVotes.has(playerId)) {
      // Already voted - return current state
      return {
        voted: false,
        skipVoteCount: game.skipVotes.size,
        shouldSkip: false,
      };
    }

    game.skipVotes.add(playerId);
    await this.saveGame(game);

    const skipVoteCount = game.skipVotes.size;
    const threshold = Math.ceil((game.skipThresholdPercent / 100) * totalPlayers);
    const shouldSkip = skipVoteCount >= threshold;

    return {
      voted: true,
      skipVoteCount,
      shouldSkip,
    };
  }

  async reportPlaybackError(
    roomId: string,
    playerId: string,
    totalPlayers: number,
  ): Promise<{ reported: boolean; errorCount: number; shouldSkip: boolean }> {
    const game = await this.getGame(roomId);

    if (game.phase !== 'playing') {
      return { reported: false, errorCount: 0, shouldSkip: false };
    }

    if (game.playbackErrorReports.has(playerId)) {
      // Already reported
      return {
        reported: false,
        errorCount: game.playbackErrorReports.size,
        shouldSkip: false,
      };
    }

    game.playbackErrorReports.add(playerId);
    await this.saveGame(game);

    const errorCount = game.playbackErrorReports.size;
    // Auto-skip if more than 50% of players report playback errors
    const threshold = Math.ceil(totalPlayers * 0.5);
    const shouldSkip = errorCount >= threshold;

    return {
      reported: true,
      errorCount,
      shouldSkip,
    };
  }

  async skipRound(roomId: string): Promise<RoundResult> {
    const game = await this.getGame(roomId);

    if (game.phase !== 'playing') {
      throw new BadRequestException('Not in playing phase');
    }

    game.roundSkipped = true;
    game.phase = 'revealing';

    const roundResult: RoundResult = {
      songIndex: game.currentRound,
      song: game.currentSong!,
      answers: Array.from(game.answers.values()),
      correctAnswer: `${game.currentSong!.title} - ${game.currentSong!.artist}`,
      firstCorrectPlayerId: game.firstCorrectPlayerId,
      firstCorrectNickname: game.firstCorrectNickname,
    };

    game.roundResults.push(roundResult);
    await this.saveGame(game);

    return roundResult;
  }

  getSkipVoteStatus(game: GameState, totalPlayers: number): { count: number; total: number; percent: number } {
    const count = game.skipVotes.size;
    const percent = totalPlayers > 0 ? Math.round((count / totalPlayers) * 100) : 0;
    return { count, total: totalPlayers, percent };
  }

  async endRound(roomId: string): Promise<RoundResult> {
    const game = await this.getGame(roomId);

    if (game.phase !== 'playing') {
      throw new BadRequestException('Not in playing phase');
    }

    game.phase = 'revealing';

    const roundResult: RoundResult = {
      songIndex: game.currentRound,
      song: game.currentSong!,
      answers: Array.from(game.answers.values()),
      correctAnswer: `${game.currentSong!.title} - ${game.currentSong!.artist}`,
      firstCorrectPlayerId: game.firstCorrectPlayerId,
      firstCorrectNickname: game.firstCorrectNickname,
    };

    game.roundResults.push(roundResult);
    await this.saveGame(game);

    return roundResult;
  }

  // Quick end round without going through revealing phase - used when first correct answer happens
  async endRoundQuick(roomId: string): Promise<RoundResult> {
    const game = await this.getGame(roomId);

    // Set phase to prevent more answers
    game.phase = 'round_ended';

    const roundResult: RoundResult = {
      songIndex: game.currentRound,
      song: game.currentSong!,
      answers: Array.from(game.answers.values()),
      correctAnswer: `${game.currentSong!.title} - ${game.currentSong!.artist}`,
      firstCorrectPlayerId: game.firstCorrectPlayerId,
      firstCorrectNickname: game.firstCorrectNickname,
    };

    game.roundResults.push(roundResult);
    await this.saveGame(game);

    return roundResult;
  }

  async showLeaderboard(roomId: string): Promise<GameState> {
    const game = await this.getGame(roomId);
    game.phase = 'leaderboard';
    await this.saveGame(game);
    return game;
  }

  async nextRound(roomId: string): Promise<GameState> {
    const game = await this.getGame(roomId);
    game.currentRound++;

    if (game.currentRound >= game.totalRounds) {
      game.phase = 'finished';
    } else {
      game.phase = 'countdown';
    }

    await this.saveGame(game);
    return game;
  }

  async getLeaderboard(
    roomId: string,
    players: RoomPlayer[],
  ): Promise<LeaderboardEntry[]> {
    const game = await this.getGame(roomId);

    const leaderboard: LeaderboardEntry[] = players
      .map((player) => {
        const score = game.scores.get(player.id) || 0;
        const correctAnswers = game.roundResults.filter((r) =>
          r.answers.some((a) => a.playerId === player.id && a.isCorrect),
        ).length;

        return {
          rank: 0,
          playerId: player.id,
          nickname: player.nickname,
          avatarUrl: player.avatarUrl,
          score,
          correctAnswers,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  }

  async getGameEndResult(
    roomId: string,
    quizTitle: string,
    players: RoomPlayer[],
    startedAt: number,
  ): Promise<GameEndResult> {
    const game = await this.getGame(roomId);
    const leaderboard = await this.getLeaderboard(roomId, players);

    const roundResults: RoundResultResponse[] = game.roundResults.map((r) => ({
      songIndex: r.songIndex,
      song: {
        title: r.song.title,
        artist: r.song.artist,
      },
      correctAnswer: r.correctAnswer,
      firstCorrectPlayerId: r.firstCorrectPlayerId,
      firstCorrectNickname: r.firstCorrectNickname,
      playerResults: r.answers.map((a) => {
        const player = players.find((p) => p.id === a.playerId);
        return {
          playerId: a.playerId,
          nickname: player?.nickname || 'Unknown',
          answer: a.answer,
          isCorrect: a.isCorrect,
          points: a.points,
          timeBonus: a.timeBonus,
          totalScore: game.scores.get(a.playerId) || 0,
        };
      }),
    }));

    return {
      roomId,
      quizTitle,
      leaderboard,
      roundResults,
      duration: Date.now() - startedAt,
    };
  }

  toResponse(
    game: GameState,
    playerId: string,
    players: RoomPlayer[],
  ): GameStateResponse {
    const scores = players
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        score: game.scores.get(p.id) || 0,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      roomId: game.roomId,
      phase: game.phase,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      currentSong: game.currentSong
        ? {
            audioUrl: game.currentSong.audioUrl,
            sourceType: game.currentSong.sourceType || 'upload',
            previewStart: game.currentSong.previewStart,
            previewDuration: game.currentSong.previewDuration,
            timeLimit: game.currentSong.timeLimit,
            matchMode: game.currentSong.matchMode || 'title_and_artist',
          }
        : null,
      roundStartTime: game.roundStartTime,
      roundEndTime: game.roundEndTime,
      hasAnswered: game.answers.has(playerId),
      scores,
    };
  }

  private checkAnswer(answer: string, song: GameSong): boolean {
    const title = song.title.toLowerCase();
    const artist = song.artist.toLowerCase();
    const matchMode = song.matchMode || 'title_and_artist';
    const alternativeAnswers = song.alternativeAnswers || [];

    // First check alternative answers (always checked regardless of match mode)
    for (const altAnswer of alternativeAnswers) {
      const normalizedAlt = altAnswer.toLowerCase().trim();
      if (this.fuzzyMatch(answer, normalizedAlt) > 0.8) {
        return true;
      }
    }

    // Check based on match mode
    switch (matchMode) {
      case 'title_only':
        // Only title needs to match
        if (this.fuzzyMatch(answer, title) > 0.8) {
          return true;
        }
        // Also check if title is contained in the answer
        if (answer.includes(title)) {
          return true;
        }
        break;

      case 'exact':
        // Must match the primary answer format: "title - artist"
        const exactFormat = `${title} - ${artist}`;
        if (this.fuzzyMatch(answer, exactFormat) > 0.85) {
          return true;
        }
        break;

      case 'title_and_artist':
      default:
        // Both title and artist required (current default behavior)
        // Check for exact match
        if (answer.includes(title) && answer.includes(artist)) {
          return true;
        }

        // Check for title match with some tolerance
        if (this.fuzzyMatch(answer, title) > 0.8) {
          return true;
        }

        // Check for combined match
        const combined = `${title} ${artist}`;
        if (this.fuzzyMatch(answer, combined) > 0.7) {
          return true;
        }
        break;
    }

    return false;
  }

  private fuzzyMatch(str1: string, str2: string): number {
    // Simple Levenshtein-based similarity
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  }

  private async fetchQuizData(quizId: string): Promise<{
    songs: GameSong[];
    hintsEnabled: boolean;
  }> {
    const quizServiceUrl = this.configService.get<string>('QUIZ_SERVICE_URL');
    const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

    try {
      const response = await axios.post(
        `${quizServiceUrl}/quiz/internal/get-quiz`,
        { quizId },
        {
          headers: {
            'X-Internal-Key': internalKey,
          },
        },
      );

      if (!response.data.found) {
        throw new BadRequestException('Quiz not found');
      }

      const quiz = response.data.quiz;
      const songs = quiz.songs.map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        audioUrl: song.audioUrl,
        sourceType: song.sourceType || 'upload',
        previewStart: song.startTime || 0,
        previewDuration: song.playDuration || 10,
        timeLimit: song.timeLimit || 30,
        matchMode: song.matchMode || 'title_and_artist',
        alternativeAnswers: song.alternativeAnswers || [],
        genre: song.genre || null,
        releaseYear: song.releaseYear || null,
        hint: song.hint || null,
      }));

      return {
        songs,
        hintsEnabled: quiz.hintsEnabled ?? false,
      };
    } catch (error) {
      console.error('Failed to fetch quiz data:', error);
      throw new BadRequestException('Failed to load quiz data');
    }
  }

  // Check if hint should be revealed based on elapsed time
  async checkAndRevealHint(roomId: string): Promise<{ revealed: boolean; hint: string | null; penaltyPercent: number }> {
    const game = await this.getGame(roomId);

    // Skip if hints not enabled, already revealed, no hint available, or not in playing phase
    if (!game.hintsEnabled || game.hintRevealed || game.phase !== 'playing' || !game.currentSong?.hint) {
      return { revealed: false, hint: null, penaltyPercent: 0 };
    }

    const elapsedSeconds = Math.floor((Date.now() - game.roundStartTime!) / 1000);

    if (elapsedSeconds >= game.hintDelaySeconds) {
      game.hintRevealed = true;
      await this.saveGame(game);
      return {
        revealed: true,
        hint: game.currentSong.hint,
        penaltyPercent: game.hintPenaltyPercent,
      };
    }

    return { revealed: false, hint: null, penaltyPercent: 0 };
  }

  private async saveGame(game: GameState): Promise<void> {
    // Convert Maps and Sets to objects/arrays for JSON serialization
    const serializable = {
      ...game,
      answers: Object.fromEntries(game.answers),
      scores: Object.fromEntries(game.scores),
      skipVotes: Array.from(game.skipVotes),
      playbackErrorReports: Array.from(game.playbackErrorReports || []),
    };

    await this.redis.setex(
      `${this.gamePrefix}${game.roomId}`,
      this.gameTTL,
      JSON.stringify(serializable),
    );
  }

  async deleteGame(roomId: string): Promise<void> {
    await this.redis.del(`${this.gamePrefix}${roomId}`);
  }
}
