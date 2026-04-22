/**
 * POST /api/waitlist
 * Inscription à la liste d'attente bêta AVRA.
 *
 * Sécurité :
 * - Rate limit : 3 inscriptions / heure / IP (anti-spam)
 * - Validation email stricte
 * - Email normalisé (lowercase, trim)
 * - Idempotent : renvoie succès même si l'email existe déjà
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import {
  sendWaitlistConfirmation,
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
    // Rate limit : 3 inscriptions / heure / IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`waitlist:${ip}`, { limit: 3, windowMs: 60 * 60 * 1000 });
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

    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!rawEmail || !EMAIL_RE.test(rawEmail) || rawEmail.length > 254) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 100) : null;
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 100) : null;
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 200) : null;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : null;
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 200) : null;

    let metier: string | null = null;
    if (typeof body.metier === 'string') {
      const m = body.metier.trim().toLowerCase();
      if (ALLOWED_METIERS.has(m)) metier = m;
    }

    const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

    // Upsert — idempotent
    await prisma.waitlist.upsert({
      where: { email: rawEmail },
      create: {
        email: rawEmail,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        metier,
        message: message || null,
        source: source || null,
        ipAddress: ip === 'unknown' ? null : ip,
        userAgent,
      },
      update: {
        // Si l'user re-soumet, on met à jour les champs fournis (sans écraser avec null)
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(company ? { company } : {}),
        ...(metier ? { metier } : {}),
        ...(message ? { message } : {}),
      },
    });

    // Envoi des emails en parallèle (non-bloquant : les erreurs sont avalées dans les helpers)
    void Promise.all([
      sendWaitlistConfirmation({
        email: rawEmail,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        metier: metier || null,
      }),
      sendAdminNotification('waitlist', {
        email: rawEmail,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        metier: metier || null,
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[/api/waitlist] error:', err);
    return NextResponse.json(
      { error: 'Une erreur est survenue. Réessayez dans un instant.' },
      { status: 500 },
    );
  }
}
