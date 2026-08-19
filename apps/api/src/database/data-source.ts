import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load env for CLI usage (outside NestJS DI)
dotenv.config({ path: join(process.cwd(), 'apps/api/.env') });
dotenv.config({ path: join(process.cwd(), '.env') });
dotenv.config({ path: join(__dirname, '../../.env') });

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USERNAME'],
  password: process.env['DB_PASSWORD'],
  database: process.env['DB_DATABASE'],
  entities: [join(__dirname, '../modules/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: process.env['NODE_ENV'] !== 'production',
});
