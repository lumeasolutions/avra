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

  /** @deprecated kept for backwards compat — refresh tokens are random opaque
   *  secrets hashed in DB (no JWT signing). Safe to remove from env once all
   *  callers stop reading it. */
  @IsString()
  JWT_REFRESH_SECRET?: string;

  /** @deprecated see JWT_REFRESH_SECRET. */
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

  // ─────── IA (OpenAI primaire, Anthropic en fallback) ───────
  @IsString()
  OPENAI_API_KEY?: string;

  @IsString()
  OPENAI_MODEL_PREMIUM?: string; // default 'gpt-4o' (chat / analyze)

  @IsString()
  OPENAI_MODEL_CHEAP?: string; // default 'gpt-4o-mini' (suggest-alerts / chat-marketing)

  @IsString()
  ANTHROPIC_API_KEY?: string;

  @IsString()
  ANTHROPIC_MODEL?: string; // fallback Anthropic

  @IsString()
  AI_PROVIDER?: string; // 'auto' | 'openai' | 'anthropic' | 'mock'

  // 🏛️ IA Architect — moteur de rendu MyArchitectAI (module IA Studio).
  // Lue côté Next.js (apps/web/app/api/ia/architect). Sans clé → mode démo.
  @IsString()
  MYARCHITECT_API_KEY?: string;

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

  // 🌱 Bêta privée — whitelist d'emails autorisés à se connecter / s'inscrire
  @IsString()
  BETA_GATE_ENABLED?: string;

  @IsString()
  BETA_ADMIN_EMAILS?: string;

  // 📦 Supabase Storage (dossier-documents)
  @IsString()
  SUPABASE_URL?: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsString()
  SUPABASE_DOSSIER_BUCKET?: string;
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
