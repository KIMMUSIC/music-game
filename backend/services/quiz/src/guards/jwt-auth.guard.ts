import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import axios from 'axios';

interface TokenValidationResult {
  valid: boolean;
  userId?: string;
}

interface UserInfo {
  found: boolean;
  user?: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private authServiceUrl: string;
  private internalApiKey: string;

  constructor(private configService: ConfigService) {
    this.authServiceUrl = this.configService.get<string>(
      'AUTH_SERVICE_URL',
      'http://localhost:3001',
    );
    this.internalApiKey = this.configService.get<string>(
      'INTERNAL_API_KEY',
      '',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Validate token with auth service
      const tokenResponse = await axios.post<TokenValidationResult>(
        `${this.authServiceUrl}/auth/internal/validate-token`,
        { token },
        {
          headers: { 'X-Internal-Key': this.internalApiKey },
        },
      );

      if (!tokenResponse.data.valid || !tokenResponse.data.userId) {
        throw new UnauthorizedException('Invalid token');
      }

      // Get user info
      const userResponse = await axios.post<UserInfo>(
        `${this.authServiceUrl}/auth/internal/get-user`,
        { userId: tokenResponse.data.userId },
        {
          headers: { 'X-Internal-Key': this.internalApiKey },
        },
      );

      if (!userResponse.data.found || !userResponse.data.user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach user to request
      (request as Request & { user: UserInfo['user'] }).user =
        userResponse.data.user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }

  private extractToken(request: Request): string | null {
    // Check cookie first
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) {
      return cookieToken;
    }

    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }
}
