/**
 * POST /api/contact
 * Formulaire de contact AVRA — capture le lead (DB + notification admin).
 *
 * ⚠️ Auparavant le formulaire ne faisait qu'un `console.log` côté client puis
 * affichait « Message reçu » : AUCUN lead n'était transmis (perte commerciale).
 *
 * Sécurité : rate limit 5/h/IP, validation email + champs bornés.
 * Stockage : réutilise le modèle DemoRequest (source='contact-page') pour
 * apparaître dans le dashboard admin, sans nouveau modèle Prisma ni migration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { sendAdminNotification } from '@/lib/server/email';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_SUBJECTS = new Set(['support', 'commercial', 'partnership', 'feedback', 'other']);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`contact:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
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
    const rawMessage = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

    let subject = 'other';
    if (typeof body.subject === 'string') {
      const s = body.subject.trim().toLowerCase();
      if (ALLOWED_SUBJECTS.has(s)) subject = s;
    }

    const message = `[Contact — ${subject}] ${rawMessage}`.trim();
    const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

    // Capture du lead — réutilise DemoRequest, `source` distingue les contacts.
    await prisma.demoRequest.create({
      data: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        message,
        source: 'contact-page',
        ipAddress: ip === 'unknown' ? null : ip,
        userAgent,
      },
    });

    // Notification interne (non bloquante — n'échoue jamais la requête).
    void sendAdminNotification('demo', {
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      message,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[/api/contact] error:', err);
    return NextResponse.json(
      { error: 'Une erreur est survenue. Réessayez dans un instant.' },
      { status: 500 },
    );
  }
}
