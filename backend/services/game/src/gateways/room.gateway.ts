import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RoomService } from '../services/room.service';
import { GameService } from '../services/game.service';
import { GameHistoryService } from '../services/game-history.service';
import { ChatService } from '../services/chat.service';
import { RoomSettings } from '../entities/room.types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  nickname?: string;
  avatarUrl?: string | null;
  roomId?: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow localhost for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
        return;
      }
      // Allow production domain
      if (origin.includes('musicquiz.cloud')) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  },
  namespace: '/room',
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private authServiceUrl: string;
  private internalApiKey: string;
  private roundTimers: Map<string, NodeJS.Timeout> = new Map(); // Store round timers by roomId

  constructor(
    private roomService: RoomService,
    private gameService: GameService,
    private gameHistoryService: GameHistoryService,
    private chatService: ChatService,
    private configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>(
      'AUTH_SERVICE_URL',
      'http://localhost:3001',
    );
    const apiKey = this.configService.get<string>('INTERNAL_API_KEY');
    if (!apiKey) {
      console.warn('WARNING: INTERNAL_API_KEY is not set. Service-to-service authentication may fail.');
    }
    this.internalApiKey = apiKey || '';
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      // Validate token with auth service
      const tokenResponse = await axios.post(
        `${this.authServiceUrl}/auth/internal/validate-token`,
        { token },
        { headers: { 'X-Internal-Key': this.internalApiKey } },
      );

      if (!tokenResponse.data.valid) {
        client.disconnect();
        return;
      }

      // Get user info
      const userResponse = await axios.post(
        `${this.authServiceUrl}/auth/internal/get-user`,
        { userId: tokenResponse.data.userId },
        { headers: { 'X-Internal-Key': this.internalApiKey } },
      );

      if (!userResponse.data.found) {
        client.disconnect();
        return;
      }

      client.userId = userResponse.data.user.id;
      client.nickname = userResponse.data.user.nickname;
      client.avatarUrl = userResponse.data.user.avatarUrl;

      const userId = client.userId;
      if (!userId) {
        client.disconnect();
        return;
      }

      // Check if player is already in a room
      const existingRoom = await this.roomService.getPlayerRoom(userId);
      if (existingRoom) {
        client.roomId = existingRoom.id;
        client.join(existingRoom.id);
        client.emit('room:rejoined', this.roomService.toResponse(existingRoom));

        // If room is playing, also send game state
        if (existingRoom.status === 'playing') {
          try {
            const game = await this.gameService.getGame(existingRoom.id);
            if (game) {
              client.emit('game:state', {
                roomId: existingRoom.id,
                phase: game.phase,
                currentRound: game.currentRound + 1,
                totalRounds: game.totalRounds,
                currentSong: game.currentSong ? {
                  audioUrl: game.currentSong.audioUrl,
                  sourceType: game.currentSong.sourceType || 'upload',
                  previewStart: game.currentSong.previewStart,
                  previewDuration: game.currentSong.previewDuration,
                  timeLimit: game.currentSong.timeLimit,
                } : null,
                roundEndTime: game.roundEndTime,
                skipVotingEnabled: game.skipVotingEnabled,
                totalPlayers: existingRoom.players.length,
              });
            }
          } catch (e) {
            // Game state might not exist yet
          }
        }
      }

      client.emit('connected', { userId: client.userId });
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId && client.roomId) {
      try {
        const room = await this.roomService.leaveRoom(
          client.roomId,
          client.userId,
        );

        if (room) {
          this.server
            .to(client.roomId)
            .emit('room:player_left', {
              playerId: client.userId,
              room: this.roomService.toResponse(room),
            });
        } else {
          this.server.to(client.roomId).emit('room:closed');
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  }

  @SubscribeMessage('room:create')
  async handleCreateRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { quizId: string; quizTitle: string; maxPlayers?: number },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const room = await this.roomService.createRoom(
        client.userId,
        client.nickname!,
        client.avatarUrl || null,
        { quizId: data.quizId, maxPlayers: data.maxPlayers },
        data.quizTitle,
      );

      client.roomId = room.id;
      client.join(room.id);

      return { success: true, room: this.roomService.toResponse(room) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create room' };
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { code: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const room = await this.roomService.joinRoom(
        data.code,
        client.userId,
        client.nickname!,
        client.avatarUrl || null,
      );

      client.roomId = room.id;
      client.join(room.id);

      // Notify other players
      client.to(room.id).emit('room:player_joined', {
        player: {
          id: client.userId,
          nickname: client.nickname,
          avatarUrl: client.avatarUrl,
          isHost: false,
          isReady: false,
          score: 0,
        },
        room: this.roomService.toResponse(room),
      });

      return { success: true, room: this.roomService.toResponse(room) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to join room' };
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.leaveRoom(
        client.roomId,
        client.userId,
      );

      client.leave(client.roomId);

      if (room) {
        this.server.to(client.roomId).emit('room:player_left', {
          playerId: client.userId,
          room: this.roomService.toResponse(room),
        });
      } else {
        this.server.to(client.roomId).emit('room:closed');
      }

      client.roomId = undefined;
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to leave room' };
    }
  }

  @SubscribeMessage('room:ready')
  async handleReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { isReady: boolean },
  ) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.setPlayerReady(
        client.roomId,
        client.userId,
        data.isReady,
      );

      this.server.to(client.roomId).emit('room:player_ready', {
        playerId: client.userId,
        isReady: data.isReady,
        room: this.roomService.toResponse(room),
      });

      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update ready status' };
    }
  }

  @SubscribeMessage('room:kick')
  async handleKick(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { playerId: string },
  ) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.kickPlayer(
        client.roomId,
        client.userId,
        data.playerId,
      );

      // Notify kicked player
      const sockets = await this.server.in(client.roomId).fetchSockets();
      const kickedSocket = sockets.find(
        (s) => (s as unknown as AuthenticatedSocket).userId === data.playerId,
      );

      if (kickedSocket) {
        kickedSocket.emit('room:kicked');
        kickedSocket.leave(client.roomId);
        (kickedSocket as unknown as AuthenticatedSocket).roomId = undefined;
      }

      this.server.to(client.roomId).emit('room:player_kicked', {
        playerId: data.playerId,
        room: this.roomService.toResponse(room),
      });

      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to kick player' };
    }
  }

  @SubscribeMessage('room:update_settings')
  async handleUpdateSettings(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { settings: Partial<RoomSettings> },
  ) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.updateSettings(
        client.roomId,
        client.userId,
        data.settings,
      );

      this.server.to(client.roomId).emit('room:settings_updated', {
        settings: room.settings,
        room: this.roomService.toResponse(room),
      });

      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update settings' };
    }
  }

  @SubscribeMessage('room:start')
  async handleStartGame(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.startGame(
        client.roomId,
        client.userId,
      );

      // Notify room that game is starting
      this.server.to(client.roomId).emit('room:game_starting', {
        room: this.roomService.toResponse(room),
      });

      // Initialize game state and start the game flow
      const game = await this.gameService.initializeGame(room);

      // Notify game namespace that game has started
      this.server.to(client.roomId).emit('game:initialized', {
        roomId: room.id,
        totalRounds: game.totalRounds,
        skipVotingEnabled: game.skipVotingEnabled,
        totalPlayers: room.players.length,
      });

      // Send initial leaderboard with all players at 0 points
      const initialLeaderboard = await this.gameService.getLeaderboard(room.id, room.players);
      this.server.to(client.roomId).emit('game:score_update', {
        leaderboard: initialLeaderboard.map((entry) => ({
          playerId: entry.playerId,
          nickname: entry.nickname,
          score: entry.score,
          rank: entry.rank,
          correctCount: entry.correctAnswers,
          previousRank: entry.rank,
        })),
      });

      // Start the first countdown after a short delay
      setTimeout(() => {
        this.startGameCountdown(room.id);
      }, 1000);

      return { success: true, room: this.roomService.toResponse(room) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to start game' };
    }
  }

  @SubscribeMessage('game:get_state')
  async handleGetGameState(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.getRoom(client.roomId);
      if (room.status !== 'playing') {
        return { error: 'Game not in progress' };
      }

      const game = await this.gameService.getGame(client.roomId);
      if (!game) {
        return { error: 'Game not found' };
      }

      return {
        success: true,
        state: {
          roomId: client.roomId,
          phase: game.phase,
          currentRound: game.currentRound + 1,
          totalRounds: game.totalRounds,
          currentSong: game.currentSong ? {
            audioUrl: game.currentSong.audioUrl,
            sourceType: game.currentSong.sourceType || 'upload',
            previewStart: game.currentSong.previewStart,
            previewDuration: game.currentSong.previewDuration,
            timeLimit: game.currentSong.timeLimit,
            matchMode: game.currentSong.matchMode,
          } : null,
          roundEndTime: game.roundEndTime,
          someoneGotIt: game.firstCorrectPlayerId !== null,
          // Hint info for reconnection
          currentHint: game.hintRevealed && game.currentSong?.hint ? game.currentSong.hint : null,
          hintPenaltyPercent: game.hintRevealed ? game.hintPenaltyPercent : 0,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get game state' };
    }
  }

  @SubscribeMessage('game:submit_answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; answer: string },
  ) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.getRoom(data.roomId);
      const { playerAnswer, isFirstCorrect } = await this.gameService.submitAnswer(
        data.roomId,
        client.userId,
        client.nickname!,
        data.answer,
      );

      // Notify room that player answered
      this.server.to(data.roomId).emit('game:player_answered', {
        playerId: client.userId,
        nickname: client.nickname,
      });

      // If this is the first correct answer, end round immediately
      if (isFirstCorrect) {
        const game = await this.gameService.getGame(data.roomId);

        // Clear the round timer since someone got the answer
        this.clearRoundTimer(data.roomId);

        // Emit correct answer event with winner info and correct answer
        this.server.to(data.roomId).emit('game:correct_answer', {
          round: game.currentRound + 1,
          playerId: client.userId,
          nickname: client.nickname,
          points: playerAnswer.points,
          song: {
            title: game.currentSong!.title,
            artist: game.currentSong!.artist,
          },
        });

        // Mark round as ended (but don't go through revealing/leaderboard phases)
        await this.gameService.endRoundQuick(data.roomId);

        // Emit live score update
        const leaderboard = await this.gameService.getLeaderboard(data.roomId, room.players);
        this.server.to(data.roomId).emit('game:score_update', {
          leaderboard: leaderboard.map((entry) => ({
            playerId: entry.playerId,
            nickname: entry.nickname,
            score: entry.score,
            rank: entry.rank,
            correctCount: entry.correctAnswers,
            previousRank: entry.rank,
          })),
        });

        // Proceed to next round after short delay (2 seconds)
        setTimeout(async () => {
          await this.proceedToNextRoundQuick(data.roomId);
        }, 2000);
      } else {
        // Emit live score update if enabled (for incorrect answers too, to show attempts)
        if (room.settings.liveScoreDisplay !== 'hidden') {
          const game = await this.gameService.getGame(data.roomId);
          const leaderboard = await this.gameService.getLeaderboard(data.roomId, room.players);

          const scoreUpdate = leaderboard.map((entry, index) => ({
            playerId: entry.playerId,
            nickname: entry.nickname,
            score: entry.score,
            rank: entry.rank,
            correctCount: entry.correctAnswers,
            previousRank: entry.rank,
          }));

          this.server.to(data.roomId).emit('game:score_update', {
            leaderboard: scoreUpdate,
          });
        }
      }

      return { success: true, submitted: true, isCorrect: playerAnswer.isCorrect };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to submit answer' };
    }
  }

  @SubscribeMessage('game:vote_skip')
  async handleVoteSkip(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.getRoom(data.roomId);

      if (!room.settings.skipVotingEnabled) {
        return { error: 'Skip voting is not enabled' };
      }

      const totalPlayers = room.players.length;
      const { voted, skipVoteCount, shouldSkip } = await this.gameService.voteSkip(
        data.roomId,
        client.userId,
        totalPlayers,
      );

      if (!voted) {
        return { success: true, alreadyVoted: true };
      }

      // Broadcast skip vote update to all players
      const game = await this.gameService.getGame(data.roomId);
      const skipStatus = this.gameService.getSkipVoteStatus(game, totalPlayers);

      this.server.to(data.roomId).emit('game:skip_vote_update', skipStatus);

      // If threshold reached, execute skip
      if (shouldSkip) {
        // Clear the round timer since round is being skipped
        this.clearRoundTimer(data.roomId);

        this.server.to(data.roomId).emit('game:skip_executed', {
          reason: skipStatus.percent >= 100 ? 'unanimous' : 'threshold',
        });

        // Skip the round
        const roundResult = await this.gameService.skipRound(data.roomId);

        // Emit round skipped/timeout event
        this.server.to(data.roomId).emit('game:round_timeout', {
          round: roundResult.songIndex + 1,
          song: {
            title: roundResult.song.title,
            artist: roundResult.song.artist,
          },
          correctAnswer: roundResult.correctAnswer,
          skipped: true,
        });

        // Emit live score update
        const leaderboard = await this.gameService.getLeaderboard(data.roomId, room.players);
        this.server.to(data.roomId).emit('game:score_update', {
          leaderboard: leaderboard.map((entry) => ({
            playerId: entry.playerId,
            nickname: entry.nickname,
            score: entry.score,
            rank: entry.rank,
            correctCount: entry.correctAnswers,
            previousRank: entry.rank,
          })),
        });

        // Proceed to next round after short delay
        setTimeout(async () => {
          await this.proceedToNextRoundQuick(data.roomId);
        }, 2000);
      }

      return { success: true, voted: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to vote skip' };
    }
  }

  @SubscribeMessage('game:report_playback_error')
  async handlePlaybackError(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.getRoom(data.roomId);
      const totalPlayers = room.players.length;

      const { reported, errorCount, shouldSkip } = await this.gameService.reportPlaybackError(
        data.roomId,
        client.userId,
        totalPlayers,
      );

      if (!reported) {
        return { success: true, alreadyReported: true };
      }

      // Notify others about the playback error
      this.server.to(data.roomId).emit('game:playback_error_reported', {
        playerId: client.userId,
        errorCount,
        totalPlayers,
        percent: Math.round((errorCount / totalPlayers) * 100),
      });

      // If threshold reached (50%+ players can't play), auto-skip
      if (shouldSkip) {
        // Clear the round timer
        this.clearRoundTimer(data.roomId);

        this.server.to(data.roomId).emit('game:skip_executed', {
          reason: 'playback_error',
        });

        // Skip the round
        const roundResult = await this.gameService.skipRound(data.roomId);

        // Emit round skipped/timeout event
        this.server.to(data.roomId).emit('game:round_timeout', {
          round: roundResult.songIndex + 1,
          song: {
            title: roundResult.song.title,
            artist: roundResult.song.artist,
          },
          correctAnswer: roundResult.correctAnswer,
          skipped: true,
          skipReason: 'playback_error',
        });

        // Emit live score update
        const leaderboard = await this.gameService.getLeaderboard(data.roomId, room.players);
        this.server.to(data.roomId).emit('game:score_update', {
          leaderboard: leaderboard.map((entry) => ({
            playerId: entry.playerId,
            nickname: entry.nickname,
            score: entry.score,
            rank: entry.rank,
            correctCount: entry.correctAnswers,
            previousRank: entry.rank,
          })),
        });

        // Proceed to next round after short delay
        setTimeout(async () => {
          await this.proceedToNextRoundQuick(data.roomId);
        }, 2000);
      }

      return { success: true, reported: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to report playback error' };
    }
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { content: string; type?: 'message' | 'emoji' },
  ) {
    if (!client.userId || !client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const room = await this.roomService.getRoom(client.roomId);

      // Check if chat is enabled
      if (!room.settings.chatEnabled) {
        return { error: 'Chat is disabled in this room' };
      }

      const message = await this.chatService.sendMessage(
        client.roomId,
        client.userId,
        client.nickname!,
        data.content,
        data.type || 'message',
      );

      // Broadcast message to other players in the room (exclude sender)
      client.to(client.roomId).emit('chat:message', message);

      return { success: true, message };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to send message' };
    }
  }

  @SubscribeMessage('chat:history')
  async handleChatHistory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { limit?: number },
  ) {
    if (!client.roomId) {
      return { error: 'Not in a room' };
    }

    try {
      const messages = await this.chatService.getChatHistory(
        client.roomId,
        data.limit || 50,
      );

      return { success: true, messages };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get chat history' };
    }
  }

  private async startGameCountdown(roomId: string) {
    try {
      const room = await this.roomService.getRoom(roomId);
      const game = await this.gameService.getGame(roomId);

      // Emit countdown
      this.server.to(roomId).emit('game:countdown', {
        round: game.currentRound + 1,
        totalRounds: game.totalRounds,
        startsIn: 3,
      });

      // Start round after 3 seconds
      setTimeout(async () => {
        await this.startRound(roomId);
      }, 3000);
    } catch (error) {
      console.error('Failed to start game countdown:', error);
    }
  }

  private async startRound(roomId: string) {
    try {
      const room = await this.roomService.getRoom(roomId);
      const game = await this.gameService.startRound(roomId);

      // Emit round started with song info (include matchMode and timeLimit for frontend)
      this.server.to(roomId).emit('game:round_started', {
        round: game.currentRound + 1,
        totalRounds: game.totalRounds,
        song: {
          audioUrl: game.currentSong!.audioUrl,
          sourceType: game.currentSong!.sourceType || 'upload',
          previewStart: game.currentSong!.previewStart,
          previewDuration: game.currentSong!.previewDuration,
          timeLimit: game.currentSong!.timeLimit,
          matchMode: game.currentSong!.matchMode || 'title_and_artist',
        },
        endTime: game.roundEndTime,
        hintsEnabled: game.hintsEnabled,
        currentPenaltyPercent: 0,
      });

      // Set up hint timing if hints are enabled and current song has a hint
      if (game.hintsEnabled && game.currentSong?.hint) {
        this.startHintTimer(roomId, game.hintDelaySeconds);
      }

      // Clear any existing timer for this room
      this.clearRoundTimer(roomId);

      // Set timer for round end (use per-song timeLimit)
      const timer = setTimeout(async () => {
        await this.endRound(roomId);
      }, game.currentSong!.timeLimit * 1000);
      this.roundTimers.set(roomId, timer);
    } catch (error) {
      console.error('Failed to start round:', error);
    }
  }

  private clearRoundTimer(roomId: string) {
    const timer = this.roundTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roundTimers.delete(roomId);
    }
  }

  private startHintTimer(roomId: string, delaySeconds: number) {
    setTimeout(async () => {
      try {
        const result = await this.gameService.checkAndRevealHint(roomId);
        if (result.revealed && result.hint) {
          const game = await this.gameService.getGame(roomId);
          this.server.to(roomId).emit('game:hint', {
            round: game.currentRound + 1,
            hint: result.hint,
            penaltyPercent: result.penaltyPercent,
          });
        }
      } catch (error) {
        console.error('Failed to reveal hint:', error);
      }
    }, delaySeconds * 1000);
  }

  private async endRound(roomId: string) {
    try {
      const game = await this.gameService.getGame(roomId);

      // If round already ended (someone got correct answer), skip
      if (game.phase !== 'playing') {
        return;
      }

      // Clean up the timer entry (it just fired, but clean the Map)
      this.roundTimers.delete(roomId);

      const room = await this.roomService.getRoom(roomId);
      const roundResult = await this.gameService.endRound(roomId);

      // Emit timeout event - no one got the answer
      this.server.to(roomId).emit('game:round_timeout', {
        round: roundResult.songIndex + 1,
        song: {
          title: roundResult.song.title,
          artist: roundResult.song.artist,
        },
        correctAnswer: roundResult.correctAnswer,
      });

      // Emit live score update
      const leaderboard = await this.gameService.getLeaderboard(roomId, room.players);
      this.server.to(roomId).emit('game:score_update', {
        leaderboard: leaderboard.map((entry) => ({
          playerId: entry.playerId,
          nickname: entry.nickname,
          score: entry.score,
          rank: entry.rank,
          correctCount: entry.correctAnswers,
          previousRank: entry.rank,
        })),
      });

      // Proceed to next round after short delay (2 seconds)
      setTimeout(async () => {
        await this.proceedToNextRoundQuick(roomId);
      }, 2000);
    } catch (error) {
      console.error('Failed to end round:', error);
    }
  }

  private async showLeaderboard(roomId: string) {
    try {
      const room = await this.roomService.getRoom(roomId);
      await this.gameService.showLeaderboard(roomId);
      const leaderboard = await this.gameService.getLeaderboard(
        roomId,
        room.players,
      );

      this.server.to(roomId).emit('game:leaderboard', {
        leaderboard,
      });

      // Move to next round after 5 seconds
      setTimeout(async () => {
        await this.proceedToNextRound(roomId);
      }, 5000);
    } catch (error) {
      console.error('Failed to show leaderboard:', error);
    }
  }

  private async proceedToNextRound(roomId: string) {
    try {
      const game = await this.gameService.nextRound(roomId);

      if (game.phase === 'finished') {
        await this.endGame(roomId);
      } else {
        await this.startGameCountdown(roomId);
      }
    } catch (error) {
      console.error('Failed to proceed to next round:', error);
    }
  }

  // Quick transition to next round without leaderboard phase
  private async proceedToNextRoundQuick(roomId: string) {
    try {
      const game = await this.gameService.nextRound(roomId);

      if (game.phase === 'finished') {
        await this.endGame(roomId);
      } else {
        // Emit "next question" event - stay on same screen with brief transition
        this.server.to(roomId).emit('game:next_question', {
          round: game.currentRound + 1,
          totalRounds: game.totalRounds,
        });

        // Start next round after 1 second
        setTimeout(async () => {
          await this.startRound(roomId);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to proceed to next round:', error);
    }
  }

  private async endGame(roomId: string) {
    try {
      const room = await this.roomService.getRoom(roomId);
      const result = await this.gameService.getGameEndResult(
        roomId,
        room.quizTitle,
        room.players,
        room.startedAt!,
      );

      // Save game results to database
      try {
        await this.gameHistoryService.saveGameResult(
          result,
          room.players,
          room.hostId,
        );
      } catch (saveError) {
        console.error('Failed to save game result:', saveError);
        // Continue even if save fails - don't block the game end
      }

      // Update room status to finished
      await this.roomService.finishGame(roomId);

      this.server.to(roomId).emit('game:finished', result);

      // Delete room after a short delay (let clients see the results first)
      setTimeout(async () => {
        try {
          // Notify all clients that room is closed
          this.server.to(roomId).emit('room:closed');
          // Delete the room
          await this.roomService.deleteRoom(roomId);
          // Clean up game state
          await this.gameService.deleteGame(roomId);
        } catch (error) {
          console.error('Failed to delete room after game:', error);
        }
      }, 5000); // 5 seconds to view results
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  }

  // Called by game gateway for answer submission
  async handleAnswerSubmission(roomId: string, playerId: string, nickname: string) {
    this.server.to(roomId).emit('game:player_answered', {
      playerId,
      nickname,
    });
  }

  // Called when first correct answer is submitted in first_correct_only mode
  emitFirstCorrect(roomId: string, round: number, playerId: string, nickname: string) {
    this.server.to(roomId).emit('game:first_correct', {
      round,
      playerId,
      nickname,
    });
  }
}
