import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const dbSslMode = configService.get<string>('DB_SSL_MODE', 'require');

  // SSL configuration for production
  // Set DB_SSL_MODE=disable to disable SSL (not recommended)
  // Set DB_SSL_MODE=no-verify to disable certificate verification (for AWS RDS without CA bundle)
  // Set DB_SSL_MODE=require (default) to require SSL with verification
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
    url: configService.get<string>('DATABASE_URL'),
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: configService.get<string>('NODE_ENV') === 'development',
    ssl: sslConfig,
  };
};

export const databaseConfig = () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
});
