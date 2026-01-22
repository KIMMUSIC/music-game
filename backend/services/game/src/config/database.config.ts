import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const dbSslMode = configService.get<string>('DB_SSL_MODE', 'require');

  let sslConfig: boolean | { rejectUnauthorized: boolean } = false;
  if (isProduction) {
    if (dbSslMode === 'disable') {
      sslConfig = false;
    } else if (dbSslMode === 'no-verify') {
      sslConfig = { rejectUnauthorized: false };
    } else {
      sslConfig = { rejectUnauthorized: true };
    }
  }

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'musicquiz'),
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: !isProduction, // Disable in production
    logging: !isProduction,
    ssl: sslConfig,
  };
};
