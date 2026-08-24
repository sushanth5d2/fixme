import 'reflect-metadata';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { createWinstonConfig } from './common/logger/winston.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const logger = WinstonModule.createLogger(createWinstonConfig());

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
  });

  const configService = app.get(ConfigService);

  // ── Security ───────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  // ── CORS ───────────────────────────────────────────────────
  const isDev = configService.get<string>('NODE_ENV') !== 'production';
  const configuredOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || isDev) {
        return callback(null, true);
      }
      if (
        configuredOrigins.includes(origin) ||
        origin.endsWith('.app.github.dev') ||
        origin.endsWith('.exp.direct')
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 3600,
  });

  // ── Compression ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(compression());

  // ── API Versioning ─────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
      { path: 'api', method: RequestMethod.GET },
      'health/(.*)',
    ],
  });

  // ── Global Pipes ───────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ── Global Filters ─────────────────────────────────────────
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // ── Global Interceptors ────────────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Swagger / OpenAPI ──────────────────────────────────────
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Fix Me API')
      .setDescription('Fix Me Repair Service Marketplace — REST API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('customers', 'Customer management')
      .addTag('fixers', 'Fixer management')
      .addTag('categories', 'Device categories')
      .addTag('brands', 'Device brands')
      .addTag('repair-requests', 'Repair request lifecycle')
      .addTag('quotes', 'Quote management')
      .addTag('jobs', 'Job management')
      .addTag('chat', 'Messaging')
      .addTag('reviews', 'Reviews and ratings')
      .addTag('notifications', 'Notifications')
      .addTag('complaints', 'Complaints and disputes')
      .addTag('uploads', 'File uploads')
      .addTag('admin', 'Admin operations')
      .addTag('health', 'Health checks')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Start ──────────────────────────────────────────────────
  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);

  logger.log(
    `🚀 Fix Me API running on http://${host}:${port}/api/v1`,
    'Bootstrap',
  );
  if (configService.get<string>('NODE_ENV') !== 'production') {
    logger.log(
      `📚 Swagger docs: http://${host}:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

void bootstrap();
