import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3002);
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:5173',
  );

  app.use(cookieParser());

  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Internal-Key',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serve static files from uploads directory (for local development)
  const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.setGlobalPrefix('quiz');

  await app.listen(port);
  console.log(`Quiz Service running on port ${port}`);

  // Log if using local storage
  const awsKeyId = configService.get<string>('AWS_ACCESS_KEY_ID', '');
  if (!awsKeyId) {
    console.log(`Local file storage enabled. Uploads directory: ${uploadsDir}`);
  }
}
bootstrap();
