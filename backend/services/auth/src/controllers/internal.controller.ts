import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { InternalGuard } from '../../../../shared/guards/internal.guard';

interface ValidateTokenDto {
  token: string;
}

interface GetUserDto {
  userId: string;
}

@Controller('internal')
@UseGuards(InternalGuard)
export class InternalController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Post('validate-token')
  async validateToken(@Body() dto: ValidateTokenDto) {
    const result = await this.authService.validateToken(dto.token);
    return result;
  }

  @Post('get-user')
  async getUser(@Body() dto: GetUserDto) {
    const user = await this.userService.findById(dto.userId);

    if (!user) {
      return { found: false };
    }

    return {
      found: true,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  @Post('search-users')
  async searchUsers(@Body() dto: { query: string; excludeUserId?: string; limit?: number }) {
    let users = await this.userService.searchByNickname(
      dto.query,
      dto.limit || 10,
    );

    // Filter out the excluded user if provided
    if (dto.excludeUserId) {
      users = users.filter((u) => u.id !== dto.excludeUserId);
    }

    return {
      users: users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        avatarUrl: u.avatarUrl,
      })),
    };
  }

  @Post('get-users-batch')
  async getUsersBatch(@Body() dto: { userIds: string[] }) {
    if (!dto.userIds || dto.userIds.length === 0) {
      return { users: [] };
    }

    const users = await this.userService.findByIds(dto.userIds);

    return {
      users: users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        avatarUrl: u.avatarUrl,
      })),
    };
  }
}
