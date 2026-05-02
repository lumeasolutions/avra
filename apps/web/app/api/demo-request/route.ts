/**
 * POST /api/demo-request
 * Demande de démo AVRA — lead commercial.
 *
 * Sécurité :
 * - Rate limit : 5 demandes / heure / IP
 * - Validation email + champs bornés
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import {
  sendDemoRequestConfirmation,
  sendAdminNotification,
} from '@/lib/server/email';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ALLOWED_METIERS = new Set([
  'architecte',
  'cuisiniste',
  'menuisier',
  'agenceur',
  'decorateur',
  'autre',
]);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`demo:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans une heure.' },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 100) : null;
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 100) : null;
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 200) : null;
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : null;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : null;
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 200) : null;

    let metier: string | null = null;
    if (typeof body.metier === 'string') {
      const m = body.metier.trim().toLowerCase();
      if (ALLOWED_METIERS.has(m)) metier = m;
    }

    const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

    await prisma.demoRequest.create({
      data: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        metier,
        message: message || null,
        source: source || null,
        ipAddress: ip === 'unknown' ? null : ip,
        userAgent,
      },
    });

    // Envoi des emails en parallèle (non-bloquant)
    void Promise.all([
      sendDemoRequestConfirmation({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        metier: metier || null,
        message: message || null,
      }),
      sendAdminNotification('demo', {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        metier: metier || null,
        message: message || null,
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[/api/demo-request] error:', err);
    return NextResponse.json(
      { error: 'Une erreur est survenue. Réessayez dans un instant.' },
      { status: 500 },
    );
  }
}
