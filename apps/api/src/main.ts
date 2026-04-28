import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { scrubForLog } from './common/logging/sanitized-logger';

async function bootstrap() {
  // ✅ Sentry — scrub PII before sending
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      try {
        if (event.request?.headers) {
          delete (event.request.headers as Record<string, unknown>).authorization;
          delete (event.request.headers as Record<string, unknown>).cookie;
          delete (event.request.headers as Record<string, unknown>)['x-csrf-token'];
        }
        if (event.request?.data && typeof event.request.data === 'object') {
          event.request.data = scrubForLog(event.request.data);
        }
      } catch {/* never break Sentry */}
      return event;
    },
  });

  // ✅ rawBody enabled so HMAC webhook verifiers (YouSign etc.) can use the
  //    untouched bytes instead of a re-serialised JSON.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ✅ Helmet
  app.use(helmet());

  // ✅ Cookie parser (req.cookies populated for auth + CSRF guards)
  app.use(cookieParser());

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ✅ MED-004: in production, refuse to start if no allowed origin is configured.
  const corsRaw = process.env.CORS_ALLOWED_ORIGINS ?? process.env.WEB_URL;
  if (process.env.NODE_ENV === 'production' && !corsRaw) {
    throw new Error('CORS_ALLOWED_ORIGINS or WEB_URL must be set in production');
  }
  const allowedOrigins = (corsRaw ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-CSRF-Token'],
    maxAge: 86400,
  });

  app.getHttpAdapter().get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT ?? 3001;

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AVRA API')
      .setVersion('1.0.0')
      .setDescription('Kitchen & Construction Project Management API')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📖 Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`✅ AVRA API running on http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  console.error('❌ Failed to start AVRA API:', err);
  process.exit(1);
});
