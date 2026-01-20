import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResult } from '../entities/game-result.entity';
import { PlayerGameResult } from '../entities/player-game-result.entity';
import { GameEndResult, LeaderboardEntry, RoundResultResponse } from '../entities/game.types';
import { RoomPlayer } from '../entities/room.types';

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
  playedAt: Date;
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

@Injectable()
export class GameHistoryService {
  constructor(
    @InjectRepository(GameResult)
    private gameResultRepository: Repository<GameResult>,
    @InjectRepository(PlayerGameResult)
    private playerResultRepository: Repository<PlayerGameResult>,
  ) {}

  async saveGameResult(
    result: GameEndResult,
    players: RoomPlayer[],
    hostId: string,
  ): Promise<GameResult> {
    const gameResult = this.gameResultRepository.create({
      roomId: result.roomId,
      quizId: result.roomId, // Will be updated with actual quizId
      quizTitle: result.quizTitle,
      hostId,
      winnerId: result.leaderboard[0]?.playerId || null,
      playerCount: result.leaderboard.length,
      totalRounds: result.roundResults.length,
      durationMs: result.duration,
      roundData: result.roundResults.map((r) => ({
        songTitle: r.song.title,
        songArtist: r.song.artist,
        correctAnswers: r.playerResults.filter((p) => p.isCorrect).length,
      })),
    });

    const savedGame = await this.gameResultRepository.save(gameResult);

    // Save player results
    const playerResults = result.leaderboard.map((entry, index) => {
      const player = players.find((p) => p.id === entry.playerId);
      const answerDetails = result.roundResults.map((round, roundIndex) => {
        const playerResult = round.playerResults.find(
          (p) => p.playerId === entry.playerId,
        );
        return {
          round: roundIndex + 1,
          answer: playerResult?.answer || '',
          isCorrect: playerResult?.isCorrect || false,
          points: playerResult?.points || 0,
          responseTimeMs: 0, // Would need to track this during gameplay
        };
      });

      return this.playerResultRepository.create({
        gameResultId: savedGame.id,
        playerId: entry.playerId,
        playerNickname: entry.nickname,
        playerAvatarUrl: entry.avatarUrl,
        rank: entry.rank,
        score: entry.score,
        correctAnswers: entry.correctAnswers,
        totalAnswers: result.roundResults.length,
        isWinner: index === 0,
        answerDetails,
      });
    });

    await this.playerResultRepository.save(playerResults);

    return savedGame;
  }

  async getPlayerHistory(
    playerId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ games: GameHistoryItem[]; total: number }> {
    const [results, total] = await this.playerResultRepository.findAndCount({
      where: { playerId },
      relations: ['gameResult'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const games: GameHistoryItem[] = results.map((result) => ({
      id: result.gameResult.id,
      quizTitle: result.gameResult.quizTitle,
      playedAt: result.gameResult.playedAt,
      playerCount: result.gameResult.playerCount,
      rank: result.rank,
      score: result.score,
      correctAnswers: result.correctAnswers,
      totalRounds: result.gameResult.totalRounds,
      isWinner: result.isWinner,
    }));

    return { games, total };
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const results = await this.playerResultRepository.find({
      where: { playerId },
      order: { createdAt: 'DESC' },
    });

    if (results.length === 0) {
      return {
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        averageScore: 0,
        totalCorrectAnswers: 0,
        averageAccuracy: 0,
        averageResponseTimeMs: null,
        winRate: 0,
        bestScore: 0,
        currentStreak: 0,
      };
    }

    const totalGames = results.length;
    const totalWins = results.filter((r) => r.isWinner).length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const totalCorrectAnswers = results.reduce(
      (sum, r) => sum + r.correctAnswers,
      0,
    );
    const totalAnswers = results.reduce((sum, r) => sum + r.totalAnswers, 0);
    const bestScore = Math.max(...results.map((r) => r.score));

    // Calculate current win streak
    let currentStreak = 0;
    for (const result of results) {
      if (result.isWinner) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate average response time
    const responseTimes = results
      .filter((r) => r.averageResponseTimeMs !== null)
      .map((r) => r.averageResponseTimeMs!);
    const averageResponseTimeMs =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          )
        : null;

    return {
      totalGames,
      totalWins,
      totalScore,
      averageScore: Math.round(totalScore / totalGames),
      totalCorrectAnswers,
      averageAccuracy:
        totalAnswers > 0
          ? Math.round((totalCorrectAnswers / totalAnswers) * 100)
          : 0,
      averageResponseTimeMs,
      winRate: Math.round((totalWins / totalGames) * 100),
      bestScore,
      currentStreak,
    };
  }

  async getGameDetails(gameId: string): Promise<GameResult | null> {
    return this.gameResultRepository.findOne({
      where: { id: gameId },
      relations: ['playerResults'],
    });
  }

  async getGlobalLeaderboard(
    limit: number = 50,
  ): Promise<GlobalLeaderboardEntry[]> {
    const results = await this.playerResultRepository
      .createQueryBuilder('pr')
      .select('pr.player_id', 'playerId')
      .addSelect('pr.player_nickname', 'nickname')
      .addSelect('pr.player_avatar_url', 'avatarUrl')
      .addSelect('SUM(pr.score)', 'totalScore')
      .addSelect('COUNT(*)', 'gamesPlayed')
      .addSelect('SUM(CASE WHEN pr.is_winner THEN 1 ELSE 0 END)', 'wins')
      .groupBy('pr.player_id')
      .addGroupBy('pr.player_nickname')
      .addGroupBy('pr.player_avatar_url')
      .orderBy('SUM(pr.score)', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      playerId: r.playerId,
      nickname: r.nickname,
      avatarUrl: r.avatarUrl,
      totalScore: parseInt(r.totalScore) || 0,
      gamesPlayed: parseInt(r.gamesPlayed) || 0,
      wins: parseInt(r.wins) || 0,
      averageScore:
        parseInt(r.gamesPlayed) > 0
          ? Math.round(parseInt(r.totalScore) / parseInt(r.gamesPlayed))
          : 0,
    }));
  }

  async getQuizLeaderboard(
    quizId: string,
    limit: number = 20,
  ): Promise<GlobalLeaderboardEntry[]> {
    const results = await this.playerResultRepository
      .createQueryBuilder('pr')
      .innerJoin('pr.gameResult', 'gr')
      .select('pr.player_id', 'playerId')
      .addSelect('pr.player_nickname', 'nickname')
      .addSelect('pr.player_avatar_url', 'avatarUrl')
      .addSelect('MAX(pr.score)', 'totalScore')
      .addSelect('COUNT(*)', 'gamesPlayed')
      .addSelect('SUM(CASE WHEN pr.is_winner THEN 1 ELSE 0 END)', 'wins')
      .where('gr.quiz_id = :quizId', { quizId })
      .groupBy('pr.player_id')
      .addGroupBy('pr.player_nickname')
      .addGroupBy('pr.player_avatar_url')
      .orderBy('MAX(pr.score)', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      playerId: r.playerId,
      nickname: r.nickname,
      avatarUrl: r.avatarUrl,
      totalScore: parseInt(r.totalScore) || 0,
      gamesPlayed: parseInt(r.gamesPlayed) || 0,
      wins: parseInt(r.wins) || 0,
      averageScore:
        parseInt(r.gamesPlayed) > 0
          ? Math.round(parseInt(r.totalScore) / parseInt(r.gamesPlayed))
          : 0,
    }));
  }

  async getRecentGames(limit: number = 10): Promise<GameResult[]> {
    return this.gameResultRepository.find({
      relations: ['playerResults'],
      order: { playedAt: 'DESC' },
      take: limit,
    });
  }
}
