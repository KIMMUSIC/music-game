import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RoomService } from '../services/room.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateRoomDto } from '../entities/room.types';

interface RequestWithUser extends Request {
  user: { id: string; nickname: string; avatarUrl: string | null };
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Post()
  async createRoom(
    @Req() req: RequestWithUser,
    @Body() dto: CreateRoomDto & { quizTitle: string },
  ) {
    const room = await this.roomService.createRoom(
      req.user.id,
      req.user.nickname,
      req.user.avatarUrl,
      dto,
      dto.quizTitle,
    );

    return this.roomService.toResponse(room);
  }

  @Get('current')
  async getCurrentRoom(@Req() req: RequestWithUser) {
    const room = await this.roomService.getPlayerRoom(req.user.id);

    if (!room) {
      return { inRoom: false };
    }

    return {
      inRoom: true,
      room: this.roomService.toResponse(room),
    };
  }

  @Get('code/:code')
  async getRoomByCode(@Param('code') code: string) {
    const room = await this.roomService.getRoomByCode(code.toUpperCase());
    return this.roomService.toResponse(room);
  }

  @Get(':id')
  async getRoom(@Param('id') id: string) {
    const room = await this.roomService.getRoom(id);
    return this.roomService.toResponse(room);
  }

  @Post(':id/join')
  async joinRoom(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const existingRoom = await this.roomService.getRoom(id);
    const room = await this.roomService.joinRoom(
      existingRoom.code,
      req.user.id,
      req.user.nickname,
      req.user.avatarUrl,
    );

    return this.roomService.toResponse(room);
  }

  @Post('join')
  async joinRoomByCode(
    @Req() req: RequestWithUser,
    @Body('code') code: string,
  ) {
    const room = await this.roomService.joinRoom(
      code.toUpperCase(),
      req.user.id,
      req.user.nickname,
      req.user.avatarUrl,
    );

    return this.roomService.toResponse(room);
  }

  @Post(':id/leave')
  async leaveRoom(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const room = await this.roomService.leaveRoom(id, req.user.id);

    if (!room) {
      return { success: true, roomClosed: true };
    }

    return { success: true, room: this.roomService.toResponse(room) };
  }
}
