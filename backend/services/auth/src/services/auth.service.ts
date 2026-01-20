import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { SessionService } from './session.service';
import { OAuthProfile } from '../strategies/google.strategy';
import { User } from '../entities/user.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenValidationResult {
  valid: boolean;
  userId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private sessionService: SessionService,
    private configService: ConfigService,
  ) {}

  async validateOAuthUser(profile: OAuthProfile): Promise<User> {
    let user = await this.userService.findByOAuth(profile.provider, profile.id);

    if (user) {
      // Update last login for existing user
      user = await this.userService.updateLastLogin(user.id);
    } else {
      // Create new user
      user = await this.userService.createFromOAuth(profile);
    }

    return user;
  }

  async generateTokens(
    user: User,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      nickname: user.nickname,
    };

    // Create session in Redis
    const sessionId = await this.sessionService.createSession(
      user.id,
      metadata,
    );

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, sessionId },
      {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = this.jwtService.verify(token);
      return { valid: true, userId: payload.sub };
    } catch {
      return { valid: false };
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      // Validate session is still active
      const sessionResult = await this.sessionService.validateSession(
        payload.sessionId,
      );

      if (!sessionResult.valid) {
        return null;
      }

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        return null;
      }

      // Generate new access token
      const accessToken = this.jwtService.sign(
        { sub: user.id, nickname: user.nickname },
        {
          expiresIn:
            this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m',
        },
      );

      return { accessToken, refreshToken };
    } catch {
      return null;
    }
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessionService.deleteSession(userId, sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.deleteAllUserSessions(userId);
  }
}
