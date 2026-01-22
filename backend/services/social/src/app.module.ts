import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { FriendRequest } from './entities/friend-request.entity';
import { FriendService } from './services/friend.service';
import { FriendController } from './controllers/friend.controller';
import { HealthController } from './controllers/health.controller';
import { FriendGateway } from './gateways/friend.gateway';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'musicquiz'),
        entities: [Friendship, FriendRequest],
        synchronize: true, // Enable for initial deployment - disable after tables created
        logging: configService.get('NODE_ENV') === 'development',
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Friendship, FriendRequest]),
  ],
  controllers: [FriendController, HealthController],
  providers: [FriendService, FriendGateway, JwtAuthGuard],
})
export class AppModule {}
