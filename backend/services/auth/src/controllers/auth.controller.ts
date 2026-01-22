import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OAuthProfile } from '../strategies/google.strategy';

interface RequestWithUser extends Request {
  user: OAuthProfile | { id: string; nickname: string };
}

@Controller()
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: RequestWithUser, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoAuth() {
    // Initiates Kakao OAuth flow
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoCallback(@Req() req: RequestWithUser, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  @Post('guest/login')
  @HttpCode(HttpStatus.OK)
  async guestLogin(
    @Body('nickname') nickname: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!nickname || nickname.trim().length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Nickname is required',
      });
    }

    try {
      const user = await this.userService.createGuestUser(nickname);

      const tokens = await this.authService.generateTokens(user, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      return res.json({
        token: tokens.accessToken,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already taken')) {
        return res.status(HttpStatus.CONFLICT).json({
          error: 'Nickname already taken',
        });
      }
      throw error;
    }
  }

  @Get('guest/check-nickname')
  async checkNickname(@Req() req: Request, @Res() res: Response) {
    const nickname = req.query.nickname as string;

    if (!nickname || nickname.trim().length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Nickname is required',
      });
    }

    const existingUser = await this.userService.findByNickname(nickname.trim());

    return res.json({
      available: !existingUser,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: RequestWithUser) {
    const userId = (req.user as { id: string }).id;
    const user = await this.userService.findById(userId);

    if (!user) {
      return { error: 'User not found' };
    }

    return {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  @Put('me/nickname')
  @UseGuards(JwtAuthGuard)
  async updateNickname(
    @Req() req: RequestWithUser,
    @Body('nickname') nickname: string,
  ) {
    const userId = (req.user as { id: string }).id;
    const user = await this.userService.updateNickname(userId, nickname);

    return {
      id: user.id,
      nickname: user.nickname,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response) {
    // Clear cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
    });

    return res.json({ message: 'Logged out successfully' });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        error: 'Refresh token not found',
      });
    }

    const tokens = await this.authService.refreshAccessToken(refreshToken);

    if (!tokens) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        error: 'Invalid refresh token',
      });
    }

    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.json({ message: 'Token refreshed' });
  }

  private async handleOAuthCallback(req: RequestWithUser, res: Response) {
    const profile = req.user as OAuthProfile;
    const user = await this.authService.validateOAuthUser(profile);

    const tokens = await this.authService.generateTokens(user, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    // Pass token in URL for cross-origin cookie issue in development
    // Use /oauth-callback to avoid ALB routing conflict with /auth/*
    return res.redirect(`${frontendUrl}/oauth-callback?token=${tokens.accessToken}`);
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
