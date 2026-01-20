import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

interface SessionData {
  userId: string;
  createdAt: number;
  lastAccessedAt: number;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class SessionService {
  private readonly sessionPrefix = 'session:';
  private readonly userSessionsPrefix = 'user_sessions:';
  private readonly sessionTTL: number;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private configService: ConfigService,
  ) {
    // Default 7 days in seconds
    this.sessionTTL = parseInt(
      this.configService.get<string>('SESSION_TTL') || '604800',
      10,
    );
  }

  async createSession(
    userId: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<string> {
    const sessionId = uuidv4();
    const now = Date.now();

    const sessionData: SessionData = {
      userId,
      createdAt: now,
      lastAccessedAt: now,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    };

    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;

    // Store session data
    await this.redis.setex(
      sessionKey,
      this.sessionTTL,
      JSON.stringify(sessionData),
    );

    // Add session to user's session set
    await this.redis.sadd(userSessionsKey, sessionId);
    await this.redis.expire(userSessionsKey, this.sessionTTL);

    return sessionId;
  }

  async validateSession(
    sessionId: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const data = await this.redis.get(sessionKey);

    if (!data) {
      return { valid: false };
    }

    const sessionData: SessionData = JSON.parse(data);

    // Update last accessed time
    sessionData.lastAccessedAt = Date.now();
    await this.redis.setex(
      sessionKey,
      this.sessionTTL,
      JSON.stringify(sessionData),
    );

    return { valid: true, userId: sessionData.userId };
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;

    await this.redis.del(sessionKey);
    await this.redis.srem(userSessionsKey, sessionId);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    const sessionIds = await this.redis.smembers(userSessionsKey);

    if (sessionIds.length > 0) {
      const sessionKeys = sessionIds.map((id) => `${this.sessionPrefix}${id}`);
      await this.redis.del(...sessionKeys);
      await this.redis.del(userSessionsKey);
    }
  }

  async getUserSessions(userId: string): Promise<string[]> {
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    return this.redis.smembers(userSessionsKey);
  }
}
