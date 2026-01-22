import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  RoomState,
  RoomPlayer,
  RoomSettings,
  RoomResponse,
  CreateRoomDto,
} from '../entities/room.types';

@Injectable()
export class RoomService {
  private readonly roomPrefix = 'room:';
  private readonly codePrefix = 'room_code:';
  private readonly playerRoomPrefix = 'player_room:';
  private readonly roomTTL = 3600 * 3; // 3 hours

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private configService: ConfigService,
  ) {}

  async createRoom(
    hostId: string,
    hostNickname: string,
    hostAvatarUrl: string | null,
    dto: CreateRoomDto,
    quizTitle: string,
  ): Promise<RoomState> {
    const roomId = uuidv4();
    const code = this.generateRoomCode();

    const defaultSettings: RoomSettings = {
      timeLimit: 10,
      showLeaderboard: true,
      allowLateJoin: false,
      liveScoreDisplay: 'hidden',
      chatEnabled: true,
      skipVotingEnabled: false,
      skipThresholdPercent: 100,
      autoSkipSeconds: null,
    };

    const hostPlayer: RoomPlayer = {
      id: hostId,
      nickname: hostNickname,
      avatarUrl: hostAvatarUrl,
      isHost: true,
      isReady: true,
      score: 0,
      joinedAt: Date.now(),
    };

    const room: RoomState = {
      id: roomId,
      code,
      hostId,
      quizId: dto.quizId,
      quizTitle,
      status: 'waiting',
      maxPlayers: dto.maxPlayers || 8,
      players: [hostPlayer],
      currentSongIndex: -1,
      settings: { ...defaultSettings, ...dto.settings },
      createdAt: Date.now(),
      startedAt: null,
    };

    // Store room state
    await this.redis.setex(
      `${this.roomPrefix}${roomId}`,
      this.roomTTL,
      JSON.stringify(room),
    );

    // Map code to room ID
    await this.redis.setex(`${this.codePrefix}${code}`, this.roomTTL, roomId);

    // Map player to room
    await this.redis.setex(
      `${this.playerRoomPrefix}${hostId}`,
      this.roomTTL,
      roomId,
    );

    return room;
  }

  async getRoom(roomId: string): Promise<RoomState> {
    const data = await this.redis.get(`${this.roomPrefix}${roomId}`);

    if (!data) {
      throw new NotFoundException('Room not found');
    }

    return JSON.parse(data);
  }

  async getRoomByCode(code: string): Promise<RoomState> {
    const roomId = await this.redis.get(`${this.codePrefix}${code}`);

    if (!roomId) {
      throw new NotFoundException('Room not found');
    }

    return this.getRoom(roomId);
  }

  async getPlayerRoom(playerId: string): Promise<RoomState | null> {
    const roomId = await this.redis.get(`${this.playerRoomPrefix}${playerId}`);

    if (!roomId) {
      return null;
    }

    try {
      return await this.getRoom(roomId);
    } catch {
      // Room might have expired
      await this.redis.del(`${this.playerRoomPrefix}${playerId}`);
      return null;
    }
  }

  async joinRoom(
    code: string,
    playerId: string,
    playerNickname: string,
    playerAvatarUrl: string | null,
  ): Promise<RoomState> {
    const room = await this.getRoomByCode(code);

    if (room.status !== 'waiting') {
      throw new BadRequestException('Game has already started');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException('Room is full');
    }

    // Check if player is already in the room
    const existingPlayer = room.players.find((p) => p.id === playerId);
    if (existingPlayer) {
      return room; // Already in room
    }

    // Check if player is in another room
    const currentRoom = await this.getPlayerRoom(playerId);
    if (currentRoom && currentRoom.id !== room.id) {
      throw new BadRequestException('You are already in another room');
    }

    const newPlayer: RoomPlayer = {
      id: playerId,
      nickname: playerNickname,
      avatarUrl: playerAvatarUrl,
      isHost: false,
      isReady: false,
      score: 0,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);
    await this.saveRoom(room);

    // Map player to room
    await this.redis.setex(
      `${this.playerRoomPrefix}${playerId}`,
      this.roomTTL,
      room.id,
    );

    return room;
  }

  async leaveRoom(roomId: string, playerId: string): Promise<RoomState | null> {
    const room = await this.getRoom(roomId);

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return room;
    }

    room.players.splice(playerIndex, 1);

    // Remove player-room mapping
    await this.redis.del(`${this.playerRoomPrefix}${playerId}`);

    // If no players left, delete room
    if (room.players.length === 0) {
      await this.redis.del(`${this.roomPrefix}${room.id}`);
      await this.redis.del(`${this.codePrefix}${room.code}`);
      return null;
    }

    // If host left, assign new host
    if (room.hostId === playerId) {
      const newHost = room.players[0];
      newHost.isHost = true;
      newHost.isReady = true;
      room.hostId = newHost.id;
    }

    await this.saveRoom(room);
    return room;
  }

  async setPlayerReady(
    roomId: string,
    playerId: string,
    isReady: boolean,
  ): Promise<RoomState> {
    const room = await this.getRoom(roomId);

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      throw new NotFoundException('Player not found in room');
    }

    player.isReady = isReady;
    await this.saveRoom(room);

    return room;
  }

  async kickPlayer(
    roomId: string,
    hostId: string,
    playerId: string,
  ): Promise<RoomState> {
    const room = await this.getRoom(roomId);

    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the host can kick players');
    }

    if (playerId === hostId) {
      throw new BadRequestException('Cannot kick yourself');
    }

    return this.leaveRoom(roomId, playerId) as Promise<RoomState>;
  }

  async startGame(roomId: string, hostId: string): Promise<RoomState> {
    const room = await this.getRoom(roomId);

    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the host can start the game');
    }

    if (room.status !== 'waiting') {
      throw new BadRequestException('Game has already started');
    }

    const allReady = room.players.every((p) => p.isReady);
    if (!allReady) {
      throw new BadRequestException('Not all players are ready');
    }

    if (room.players.length < 1) {
      throw new BadRequestException('Need at least 1 player to start');
    }

    room.status = 'playing';
    room.startedAt = Date.now();
    room.currentSongIndex = 0;

    await this.saveRoom(room);
    return room;
  }

  async updateSettings(
    roomId: string,
    hostId: string,
    settings: Partial<RoomSettings>,
  ): Promise<RoomState> {
    const room = await this.getRoom(roomId);

    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the host can update settings');
    }

    if (room.status !== 'waiting') {
      throw new BadRequestException('Cannot change settings after game starts');
    }

    room.settings = { ...room.settings, ...settings };
    await this.saveRoom(room);

    return room;
  }

  toResponse(room: RoomState): RoomResponse {
    return {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      quizId: room.quizId,
      quizTitle: room.quizTitle,
      status: room.status,
      maxPlayers: room.maxPlayers,
      playerCount: room.players.length,
      players: room.players.map(({ joinedAt, ...player }) => player),
      settings: room.settings,
    };
  }

  private async saveRoom(room: RoomState): Promise<void> {
    await this.redis.setex(
      `${this.roomPrefix}${room.id}`,
      this.roomTTL,
      JSON.stringify(room),
    );
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      // Remove all player-room mappings
      for (const player of room.players) {
        await this.redis.del(`${this.playerRoomPrefix}${player.id}`);
      }
      await this.redis.del(`${this.roomPrefix}${room.id}`);
      await this.redis.del(`${this.codePrefix}${room.code}`);
    } catch {
      // Room might already be deleted, ignore
    }
  }

  async finishGame(roomId: string): Promise<RoomState> {
    const room = await this.getRoom(roomId);
    room.status = 'finished';
    await this.saveRoom(room);
    return room;
  }

  async resetForNewGame(roomId: string): Promise<RoomState> {
    const room = await this.getRoom(roomId);
    room.status = 'waiting';
    room.startedAt = null;
    room.currentSongIndex = 0;
    // Reset all players' ready status
    room.players.forEach((player) => {
      player.isReady = false;
    });
    await this.saveRoom(room);
    return room;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
