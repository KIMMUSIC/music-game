import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'emoji';
}

@Injectable()
export class ChatService {
  private readonly chatPrefix = 'room:chat:';
  private readonly rateLimitPrefix = 'chat:ratelimit:';
  private readonly chatTTL = 3600 * 3; // 3 hours
  private readonly maxMessages = 100;
  private readonly maxMessageLength = 200;
  private readonly rateLimit = { messages: 3, windowSeconds: 5 };

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async sendMessage(
    roomId: string,
    playerId: string,
    nickname: string,
    content: string,
    type: 'message' | 'emoji' = 'message',
  ): Promise<ChatMessage> {
    // Validate message length
    if (content.length > this.maxMessageLength) {
      throw new BadRequestException(`Message exceeds ${this.maxMessageLength} characters`);
    }

    // Check rate limit
    const rateLimitKey = `${this.rateLimitPrefix}${roomId}:${playerId}`;
    const messageCount = await this.redis.incr(rateLimitKey);

    if (messageCount === 1) {
      await this.redis.expire(rateLimitKey, this.rateLimit.windowSeconds);
    }

    if (messageCount > this.rateLimit.messages) {
      throw new BadRequestException('Rate limit exceeded. Please wait a few seconds.');
    }

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      playerId,
      nickname,
      content: content.trim(),
      timestamp: Date.now(),
      type,
    };

    // Store message in Redis list
    const chatKey = `${this.chatPrefix}${roomId}`;
    await this.redis.lpush(chatKey, JSON.stringify(message));
    await this.redis.ltrim(chatKey, 0, this.maxMessages - 1);
    await this.redis.expire(chatKey, this.chatTTL);

    return message;
  }

  async getChatHistory(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
    const chatKey = `${this.chatPrefix}${roomId}`;
    const messages = await this.redis.lrange(chatKey, 0, limit - 1);

    return messages
      .map((msg) => JSON.parse(msg) as ChatMessage)
      .reverse(); // Oldest first
  }

  async sendSystemMessage(roomId: string, content: string): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: `${Date.now()}-system`,
      roomId,
      playerId: 'system',
      nickname: 'System',
      content,
      timestamp: Date.now(),
      type: 'system',
    };

    const chatKey = `${this.chatPrefix}${roomId}`;
    await this.redis.lpush(chatKey, JSON.stringify(message));
    await this.redis.ltrim(chatKey, 0, this.maxMessages - 1);
    await this.redis.expire(chatKey, this.chatTTL);

    return message;
  }

  async clearChat(roomId: string): Promise<void> {
    await this.redis.del(`${this.chatPrefix}${roomId}`);
  }
}
