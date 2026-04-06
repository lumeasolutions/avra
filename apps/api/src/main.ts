import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';

async function bootstrap() {
  // ✅ Initialize Sentry for error monitoring
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule);

  // ✅ Security: Helmet protects against XSS, clickjacking, MIME sniffing, etc.
  app.use(helmet());

  // ✅ Global pipes
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ✅ SECURITY: Rate limiting — Enhance ThrottlerModule configuration in app.module
  // Login endpoint: 5 requests per 15 minutes (brute-force protection)
  // Global: 60 requests per 60 seconds as fallback

  // ✅ Sentry error handler (added as exception filter in app.module)

  // ✅ CORS — Whitelist origins
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? process.env.WEB_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  });

  // ✅ Healthcheck endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT ?? 3001;

  // 🔒 Swagger uniquement en développement — désactivé en production
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
  console.log(`📊 Healthcheck: http://localhost:${port}/health`);
}
bootstrap().catch((err) => {
  console.error('❌ Failed to start AVRA API:', err);
  process.exit(1);
});
