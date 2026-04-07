/**
 * Vercel Serverless Function — NestJS API Handler
 *
 * This file bootstraps the @avra/api NestJS application as a Vercel
 * Serverless Function. All requests to /api/* on the Vercel deployment
 * are routed here and handled by NestJS.
 */

import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { Express } from 'express';
import helmet from 'helmet';

// Lazy-load the AppModule to avoid cold-start issues with circular deps
let cachedServer: Express | null = null;

async function bootstrapServer(): Promise<Express> {
  if (cachedServer) return cachedServer;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppModule } = require('../../api/dist/app.module');

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn'],
  });

  // Helmet (relaxed for serverless)
  app.use(helmet({ contentSecurityPolicy: false }));

  // Global API prefix to match the original NestJS bootstrap
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS — same-origin since frontend lives on the same Vercel deployment,
  // but still whitelist explicitly configured origins for any external clients.
  const allowedOrigins = (
    process.env.CORS_ALLOWED_ORIGINS ??
    process.env.WEB_URL ??
    'https://avra-kappa.vercel.app'
  )
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400,
  });

  // Healthcheck endpoint (same as standalone bootstrap)
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

// Tell Vercel this is a Node serverless function (not Edge)
export const config = {
  api: {
    bodyParser: false, // Let NestJS/Express handle body parsing
  },
};
