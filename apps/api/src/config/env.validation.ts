/**
 * Environment variable validation schema
 * Ensures required vars are present at startup
 */
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsEnum, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string = '30d';

  @IsString()
  API_URL: string;

  @IsString()
  WEB_URL: string;

  @IsNumber()
  PORT: number = 3001;

  // Optional fields
  @IsString()
  UPLOAD_DIR?: string;

  @IsString()
  S3_BUCKET?: string;

  @IsString()
  OPENAI_API_KEY?: string;

  @IsString()
  GOOGLE_AI_API_KEY?: string;

  @IsString()
  YOUSIGN_API_KEY?: string;

  @IsString()
  YOUSIGN_BASE_URL?: string;

  @IsString()
  YOUSIGN_WEBHOOK_SECRET?: string;

  @IsString()
  STRIPE_SECRET_KEY?: string;
}

export function validate(config: Record<string, any>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    const errorMsg = errors.map((e) => `  - ${e.property}: ${Object.values(e.constraints || {}).join(', ')}`).join('\n');
    throw new Error(`❌ Invalid environment variables:\n${errorMsg}`);
  }

  return validatedConfig;
}
