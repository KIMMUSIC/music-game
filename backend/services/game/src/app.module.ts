import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';

// Config
import { getDatabaseConfig } from './config/database.config';

// Entities
import { GameResult } from './entities/game-result.entity';
import { PlayerGameResult } from './entities/player-game-result.entity';

// Controllers
import { RoomController } from './controllers/room.controller';
import { GameController } from './controllers/game.controller';
import { GameHistoryController } from './controllers/game-history.controller';

// Services
import { RoomService } from './services/room.service';
import { GameService } from './services/game.service';
import { GameHistoryService } from './services/game-history.service';
import { ChatService } from './services/chat.service';

// Gateways
import { RoomGateway } from './gateways/room.gateway';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([GameResult, PlayerGameResult]),
  ],
  controllers: [RoomController, GameController, GameHistoryController],
  providers: [
    RoomService,
    GameService,
    GameHistoryService,
    ChatService,
    RoomGateway,
    JwtAuthGuard,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
