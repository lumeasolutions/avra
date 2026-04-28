/**
 * Vercel Serverless Function — NestJS API Handler
 *
 * Bootstraps @avra/api as a Vercel Serverless Function. All requests to
 * /api/v1/* on the Vercel deployment are routed here.
 */

import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

let cachedServer: Express | null = null;

async function bootstrapServer(): Promise<Express> {
  if (cachedServer) return cachedServer;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppModule } = require('../../api/dist/app.module');
  // HIGH-5 (passe-2): scrubbed logger for the serverless path too.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SanitizedLogger } = require('../../api/dist/common/logging/sanitized-logger');

  const expressApp = express();
  // ✅ rawBody enabled for HMAC webhook verification (YouSign).
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: new SanitizedLogger(),
    rawBody: true,
  });

  // ✅ Helmet — keep default CSP (responses are mostly JSON; no inline scripts to bother).
  //    Only keep CSP off if explicitly opted out (rare, e.g. Swagger in dev).
  app.use(helmet());

  // ✅ Cookie parser (auth + CSRF guards depend on req.cookies).
  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ✅ MED-004: in production, fail fast if no origin is configured (no hardcoded fallback).
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

  app.getHttpAdapter().get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await app.init();
  cachedServer = expressApp;
  return expressApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const server = await bootstrapServer();
    return server(req as any, res as any);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('NestJS handler crashed:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: false, // Let NestJS/Express handle body parsing
  },
};
