import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';

import { createWinstonConfig } from './common/logger/winston.config';
import { createTypeOrmConfig } from './database/typeorm.config';
import { validateEnv } from './config/env.validation';

// Feature modules (scaffolded, implemented in later phases)
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FixersModule } from './modules/fixers/fixers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { RepairRequestsModule } from './modules/repair-requests/repair-requests.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ChatModule } from './modules/chat/chat.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
      expandVariables: true,
    }),

    // ── Logger ──────────────────────────────────────────────
    WinstonModule.forRootAsync({
      useFactory: () => createWinstonConfig(),
    }),

    // ── Rate Limiting ────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // ── Database ────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createTypeOrmConfig(configService),
    }),

    // ── Scheduler ────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature Modules ──────────────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    FixersModule,
    CategoriesModule,
    BrandsModule,
    RepairRequestsModule,
    QuotesModule,
    JobsModule,
    ChatModule,
    ReviewsModule,
    NotificationsModule,
    ComplaintsModule,
    UploadsModule,
    AdminModule,
    AuditModule,
  ],
})
export class AppModule {}
