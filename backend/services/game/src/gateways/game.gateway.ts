import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GameService } from '../services/game.service';
import { RoomService } from '../services/room.service';
import { SubmitAnswerDto } from '../entities/game.types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  nickname?: string;
  avatarUrl?: string | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private roundTimers: Map<string, NodeJS.Timeout> = new Map();
  private phaseTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private gameService: GameService,
    private roomService: RoomService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const user = await this.validateToken(token);
      if (!user) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.nickname = user.nickname;
      client.avatarUrl = user.avatarUrl;

      // Check if user is in a game
      const room = await this.roomService.getPlayerRoom(user.id);
      if (room && room.status === 'playing') {
        client.join(`game:${room.id}`);

        // Send current game state
        try {
          const game = await this.gameService.getGame(room.id);
          const gameState = this.gameService.toResponse(
            game,
            user.id,
            room.players,
          );
          client.emit('game:state', gameState);
        } catch {
          // Game might not be initialized yet
        }
      }
    } catch (error) {
      console.error('Game connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Player disconnected during game - could implement reconnection logic
  }

  @SubscribeMessage('game:join')
  async handleJoinGame(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const room = await this.roomService.getRoom(data.roomId);

      if (!room.players.some((p) => p.id === client.userId)) {
        return { error: 'Not in this room' };
      }

      client.join(`game:${room.id}`);

      try {
        const game = await this.gameService.getGame(room.id);
        const gameState = this.gameService.toResponse(
          game,
          client.userId!,
          room.players,
        );
        return { success: true, game: gameState };
      } catch {
        return { success: true, game: null };
      }
    } catch (error: any) {
      return { error: error.message || 'Failed to join game' };
    }
  }

  @SubscribeMessage('game:submit_answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubmitAnswerDto & { roomId: string },
  ) {
    try {
      const result = await this.gameService.submitAnswer(
        data.roomId,
        client.userId!,
        client.nickname!,
        data.answer,
      );

      // Notify room that player answered (without revealing if correct)
      this.server.to(`game:${data.roomId}`).emit('game:player_answered', {
        playerId: client.userId,
        nickname: client.nickname,
      });

      return { success: true, submitted: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to submit answer' };
    }
  }

  // Called by room gateway when game starts
  async startGame(roomId: string) {
    try {
      const room = await this.roomService.getRoom(roomId);
      const game = await this.gameService.initializeGame(room);

      // Notify all players game is starting
      this.server.to(`game:${roomId}`).emit('game:started', {
        totalRounds: game.totalRounds,
      });

      // Start countdown for first round
      await this.startCountdown(roomId, room);
    } catch (error) {
      console.error('Failed to start game:', error);
      this.server.to(`game:${roomId}`).emit('game:error', {
        message: 'Failed to start game',
      });
    }
  }

  private async startCountdown(roomId: string, room: any) {
    const game = await this.gameService.getGame(roomId);

    this.server.to(`game:${roomId}`).emit('game:countdown', {
      round: game.currentRound + 1,
      totalRounds: game.totalRounds,
      startsIn: 3,
    });

    // Clear any existing timers
    this.clearTimers(roomId);

    // Start round after 3 seconds
    const countdownTimer = setTimeout(async () => {
      await this.startRound(roomId, room);
    }, 3000);

    this.phaseTimers.set(`countdown:${roomId}`, countdownTimer);
  }

  private async startRound(roomId: string, room: any) {
    try {
      const game = await this.gameService.startRound(roomId);

      // Emit round started with song info (include timeLimit per song)
      this.server.to(`game:${roomId}`).emit('game:round_started', {
        round: game.currentRound + 1,
        totalRounds: game.totalRounds,
        song: {
          audioUrl: game.currentSong!.audioUrl,
          sourceType: game.currentSong!.sourceType || 'upload',
          previewStart: game.currentSong!.previewStart,
          previewDuration: game.currentSong!.previewDuration,
          timeLimit: game.currentSong!.timeLimit,
        },
        endTime: game.roundEndTime,
      });

      // Set timer for round end (use per-song timeLimit)
      const roundTimer = setTimeout(async () => {
        await this.endRound(roomId, room);
      }, game.currentSong!.timeLimit * 1000);

      this.roundTimers.set(roomId, roundTimer);
    } catch (error) {
      console.error('Failed to start round:', error);
    }
  }

  private async endRound(roomId: string, room: any) {
    try {
      const roundResult = await this.gameService.endRound(roomId);

      // Build result response for live score update
      const playerResults = roundResult.answers.map((a) => {
        const player = room.players.find((p: any) => p.id === a.playerId);
        return {
          playerId: a.playerId,
          nickname: player?.nickname || 'Unknown',
          answer: a.answer,
          isCorrect: a.isCorrect,
          points: a.points,
          timeBonus: a.timeBonus,
        };
      });

      // Update live scores
      const leaderboard = await this.gameService.getLeaderboard(roomId, room.players);
      this.server.to(`game:${roomId}`).emit('game:score_update', {
        leaderboard: leaderboard.map((e) => ({
          playerId: e.playerId,
          nickname: e.nickname,
          score: e.score,
          correctAnswers: e.correctAnswers,
        })),
      });

      // Skip revealing and leaderboard phases - go directly to next round
      // Small delay to let score update show
      const nextRoundTimer = setTimeout(async () => {
        await this.proceedToNextRound(roomId, room);
      }, 500);

      this.phaseTimers.set(`reveal:${roomId}`, nextRoundTimer);
    } catch (error) {
      console.error('Failed to end round:', error);
    }
  }

  private async showLeaderboard(roomId: string, room: any) {
    try {
      await this.gameService.showLeaderboard(roomId);
      const leaderboard = await this.gameService.getLeaderboard(
        roomId,
        room.players,
      );

      this.server.to(`game:${roomId}`).emit('game:leaderboard', {
        leaderboard,
      });

      // Move to next round after 5 seconds
      const nextRoundTimer = setTimeout(async () => {
        await this.proceedToNextRound(roomId, room);
      }, 5000);

      this.phaseTimers.set(`leaderboard:${roomId}`, nextRoundTimer);
    } catch (error) {
      console.error('Failed to show leaderboard:', error);
    }
  }

  private async proceedToNextRound(roomId: string, room: any) {
    try {
      const game = await this.gameService.nextRound(roomId);

      if (game.phase === 'finished') {
        await this.endGame(roomId, room);
      } else {
        await this.startCountdown(roomId, room);
      }
    } catch (error) {
      console.error('Failed to proceed to next round:', error);
    }
  }

  private async endGame(roomId: string, room: any) {
    try {
      this.clearTimers(roomId);

      const result = await this.gameService.getGameEndResult(
        roomId,
        room.quizTitle,
        room.players,
        room.startedAt,
      );

      // Update room status
      room.status = 'finished';
      // Note: We'd need to add a method to RoomService to update status

      this.server.to(`game:${roomId}`).emit('game:finished', result);

      // Clean up game state after some time
      setTimeout(async () => {
        await this.gameService.deleteGame(roomId);
      }, 60000); // Keep for 1 minute for reconnections
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  }

  private clearTimers(roomId: string) {
    const roundTimer = this.roundTimers.get(roomId);
    if (roundTimer) {
      clearTimeout(roundTimer);
      this.roundTimers.delete(roomId);
    }

    ['countdown', 'reveal', 'leaderboard'].forEach((phase) => {
      const timer = this.phaseTimers.get(`${phase}:${roomId}`);
      if (timer) {
        clearTimeout(timer);
        this.phaseTimers.delete(`${phase}:${roomId}`);
      }
    });
  }

  private async validateToken(
    token: string,
  ): Promise<{ id: string; nickname: string; avatarUrl: string | null } | null> {
    try {
      const authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL');
      const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

      const response = await axios.get(
        `${authServiceUrl}/api/internal/auth/validate`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Internal-Key': internalKey,
          },
        },
      );

      return response.data;
    } catch {
      return null;
    }
  }
}
