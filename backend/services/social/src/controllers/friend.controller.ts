import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { FriendService } from '../services/friend.service';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  async getFriends(@Req() req: AuthenticatedRequest) {
    const friends = await this.friendService.getFriends(req.user.id);
    return { friends };
  }

  @Get('count')
  async getFriendCount(@Req() req: AuthenticatedRequest) {
    const count = await this.friendService.getFriendCount(req.user.id);
    return { count };
  }

  @Get('requests')
  async getPendingRequests(@Req() req: AuthenticatedRequest) {
    return this.friendService.getPendingRequests(req.user.id);
  }

  @Post('requests')
  async sendFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() body: { receiverId: string; message?: string },
  ) {
    const request = await this.friendService.sendFriendRequest(
      req.user.id,
      body.receiverId,
      body.message,
    );
    return { request };
  }

  @Post('requests/:requestId/accept')
  @HttpCode(HttpStatus.OK)
  async acceptFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.friendService.acceptFriendRequest(
      requestId,
      req.user.id,
    );
    return { request };
  }

  @Post('requests/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.friendService.rejectFriendRequest(
      requestId,
      req.user.id,
    );
    return { request };
  }

  @Delete('requests/:requestId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    await this.friendService.cancelFriendRequest(requestId, req.user.id);
  }

  @Delete(':friendId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFriend(
    @Req() req: AuthenticatedRequest,
    @Param('friendId') friendId: string,
  ) {
    await this.friendService.removeFriend(req.user.id, friendId);
  }

  @Get('check/:userId')
  async checkFriendship(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const areFriends = await this.friendService.areFriends(req.user.id, userId);
    return { areFriends };
  }

  @Get('search')
  async searchUsers(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
  ) {
    if (!query || query.length < 2) {
      return { users: [] };
    }
    const users = await this.friendService.searchUsers(query, req.user.id);
    return { users };
  }
}
