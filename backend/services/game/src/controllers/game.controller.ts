import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GameService } from '../services/game.service';
import { RoomService } from '../services/room.service';
import { SubmitAnswerDto } from '../entities/game.types';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
}

@Controller('api/game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(
    private gameService: GameService,
    private roomService: RoomService,
  ) {}

  @Get('rooms/:roomId/game')
  async getGameState(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomService.getRoom(roomId);

    // Verify player is in the room
    if (!room.players.some((p) => p.id === req.user.id)) {
      throw new Error('Not in this room');
    }

    const game = await this.gameService.getGame(roomId);
    return this.gameService.toResponse(game, req.user.id, room.players);
  }

  @Post('rooms/:roomId/answer')
  async submitAnswer(
    @Param('roomId') roomId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomService.getRoom(roomId);

    // Verify player is in the room
    if (!room.players.some((p) => p.id === req.user.id)) {
      throw new Error('Not in this room');
    }

    const result = await this.gameService.submitAnswer(
      roomId,
      req.user.id,
      req.user.nickname,
      dto.answer,
    );

    return {
      submitted: true,
      isCorrect: result.playerAnswer.isCorrect,
      points: result.playerAnswer.points,
    };
  }

  @Get('rooms/:roomId/leaderboard')
  async getLeaderboard(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomService.getRoom(roomId);

    // Verify player is in the room
    if (!room.players.some((p) => p.id === req.user.id)) {
      throw new Error('Not in this room');
    }

    const leaderboard = await this.gameService.getLeaderboard(
      roomId,
      room.players,
    );

    return { leaderboard };
  }

  @Get('rooms/:roomId/results')
  async getGameResults(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomService.getRoom(roomId);

    // Verify player is in the room
    if (!room.players.some((p) => p.id === req.user.id)) {
      throw new Error('Not in this room');
    }

    const results = await this.gameService.getGameEndResult(
      roomId,
      room.quizTitle,
      room.players,
      room.startedAt!,
    );

    return results;
  }
}
