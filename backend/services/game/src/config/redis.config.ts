import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export const getRedisConfig = (configService: ConfigService): RedisOptions => {
  const url = configService.get<string>('REDIS_URL', 'redis://localhost:6379');

  // Parse Redis URL
  const urlParts = new URL(url);

  return {
    host: urlParts.hostname,
    port: parseInt(urlParts.port, 10) || 6379,
    password: urlParts.password || undefined,
    db: parseInt(urlParts.pathname?.slice(1), 10) || 0,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };
};

export const createRedisClient = (configService: ConfigService): Redis => {
  return new Redis(getRedisConfig(configService));
};

export const redisConfig = () => ({
  redis: {
    url: process.env.REDIS_URL,
  },
});
