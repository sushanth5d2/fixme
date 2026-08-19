import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  HOST: string = '0.0.0.0';

  // Database
  @IsString()
  DB_HOST!: string;

  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  DB_PORT: number = 5432;

  @IsString()
  DB_USERNAME!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_DATABASE!: string;

  // Redis
  @IsString()
  REDIS_HOST!: string;

  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string = '';

  // JWT
  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  // S3 / MinIO
  @IsString()
  S3_ENDPOINT!: string;

  @IsString()
  S3_ACCESS_KEY!: string;

  @IsString()
  S3_SECRET_KEY!: string;

  @IsString()
  S3_BUCKET_CUSTOMER_MEDIA!: string;

  @IsString()
  S3_BUCKET_FIXER_DOCUMENTS!: string;

  @IsString()
  S3_BUCKET_REPAIR_MEDIA!: string;

  @IsString()
  S3_BUCKET_MESSAGE_ATTACHMENTS!: string;

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '';

  // Rate limiting
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @IsOptional()
  THROTTLE_TTL: number = 60;

  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @IsOptional()
  THROTTLE_LIMIT: number = 100;

  // Email (optional)
  @IsString()
  @IsOptional()
  SMTP_HOST: string = '';

  @IsString()
  @IsOptional()
  SMTP_USER: string = '';

  @IsString()
  @IsOptional()
  SMTP_PASS: string = '';

  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @IsOptional()
  SMTP_PORT: number = 587;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }
  return validatedConfig;
}
