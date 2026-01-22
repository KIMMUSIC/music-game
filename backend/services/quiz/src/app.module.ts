import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Quiz } from './entities/quiz.entity';
import { Song } from './entities/song.entity';

// Controllers
import { QuizController } from './controllers/quiz.controller';
import { InternalController } from './controllers/internal.controller';
import { HealthController } from './controllers/health.controller';

// Services
import { QuizService } from './services/quiz.service';
import { S3Service } from './services/s3.service';
import { LocalStorageService } from './services/local-storage.service';
import { StorageService } from './services/storage.service';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InternalGuard } from '../../../shared/guards/internal.guard';

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
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'musicquiz'),
        entities: [Quiz, Song],
        synchronize: true, // Enable for initial deployment - disable after tables created
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Quiz, Song]),
  ],
  controllers: [HealthController, QuizController, InternalController],
  providers: [
    QuizService,
    S3Service,
    LocalStorageService,
    StorageService,
    JwtAuthGuard,
    InternalGuard,
  ],
})
export class AppModule {}
