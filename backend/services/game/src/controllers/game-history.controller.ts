import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GameHistoryService } from '../services/game-history.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
}

@Controller('api/game-history')
export class GameHistoryController {
  constructor(private gameHistoryService: GameHistoryService) {}

  @Get('my-games')
  @UseGuards(JwtAuthGuard)
  async getMyGameHistory(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.gameHistoryService.getPlayerHistory(
      req.user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );

    return result;
  }

  @Get('my-stats')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Req() req: AuthenticatedRequest) {
    const stats = await this.gameHistoryService.getPlayerStats(req.user.id);
    return stats;
  }

  @Get('players/:playerId/games')
  async getPlayerGameHistory(
    @Param('playerId') playerId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.gameHistoryService.getPlayerHistory(
      playerId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );

    return result;
  }

  @Get('players/:playerId/stats')
  async getPlayerStats(@Param('playerId') playerId: string) {
    const stats = await this.gameHistoryService.getPlayerStats(playerId);
    return stats;
  }

  @Get('games/:gameId')
  @UseGuards(JwtAuthGuard)
  async getGameDetails(@Param('gameId') gameId: string) {
    const game = await this.gameHistoryService.getGameDetails(gameId);

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  @Get('leaderboard/global')
  async getGlobalLeaderboard(@Query('limit') limit?: string) {
    const leaderboard = await this.gameHistoryService.getGlobalLeaderboard(
      limit ? parseInt(limit) : 50,
    );

    return { leaderboard };
  }

  @Get('leaderboard/quiz/:quizId')
  async getQuizLeaderboard(
    @Param('quizId') quizId: string,
    @Query('limit') limit?: string,
  ) {
    const leaderboard = await this.gameHistoryService.getQuizLeaderboard(
      quizId,
      limit ? parseInt(limit) : 20,
    );

    return { leaderboard };
  }

  @Get('recent')
  async getRecentGames(@Query('limit') limit?: string) {
    const games = await this.gameHistoryService.getRecentGames(
      limit ? parseInt(limit) : 10,
    );

    return { games };
  }
}
