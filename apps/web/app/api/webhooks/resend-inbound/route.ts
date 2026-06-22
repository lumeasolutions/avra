/**
 * POST /api/webhooks/resend-inbound
 * Réception des e-mails entrants (réponses des intervenants) via Resend.
 *
 * Resend envoie un événement `email.received` (métadonnées uniquement, pas le corps).
 * On vérifie la signature Svix, on récupère le corps via l'API Resend, on extrait
 * le jeton de la demande depuis l'adresse destinataire (<token>@INBOUND_REPLY_DOMAIN),
 * on retire la citation, puis on poste le message dans la bonne conversation AVRA
 * (endpoint public à jeton -> ajoute le message + notifie le pro).
 *
 * Sécurité : signature Svix obligatoire (RESEND_WEBHOOK_SECRET). Le jeton est signé
 * (HMAC) côté API, donc une réponse ne peut atterrir que dans SA demande -> bon utilisateur.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

const INBOUND_DOMAIN = (process.env.INBOUND_REPLY_DOMAIN ?? '').toLowerCase();
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET ?? '';
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const WEB_URL = process.env.WEB_URL ?? 'https://avra-app.fr';

/** Vérifie la signature Svix d'un webhook Resend. */
function verifySvix(payload: string, headers: Headers): boolean {
  if (!WEBHOOK_SECRET) return false;
  const id = headers.get('svix-id');
  const ts = headers.get('svix-timestamp');
  const sigHeader = headers.get('svix-signature');
  if (!id || !ts || !sigHeader) return false;
  const secretB64 = WEBHOOK_SECRET.startsWith('whsec_') ? WEBHOOK_SECRET.slice(6) : WEBHOOK_SECRET;
  let key: Buffer;
  try { key = Buffer.from(secretB64, 'base64'); } catch { return false; }
  const signed = `${id}.${ts}.${payload}`;
  const expected = createHmac('sha256', key).update(signed).digest('base64');
  for (const part of sigHeader.split(' ')) {
    const sig = part.split(',')[1];
    if (!sig) continue;
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch { /* ignore */ }
  }
  return false;
}

/** Retire la citation (message d'origine) d'une réponse e-mail. */
function stripQuoted(text: string): string {
  if (!text) return '';
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  const markers: RegExp[] = [
    /^>/,
    /^On .+ wrote:$/i,
    /^Le .+ a [eé]crit\s*:?$/i,
    /^-----\s*Message d'origine\s*-----/i,
    /^-----\s*Original Message\s*-----/i,
    /^_{5,}$/,
    /^De\s*:\s.*/i,
    /^From:\s.*/i,
    /^Envoy[eé]\s*:/i,
    /^Sent:/i,
  ];
  for (const line of lines) {
    if (markers.some((re) => re.test(line.trim()))) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

/** Fallback : HTML simple -> texte. */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  if (!verifySvix(raw, request.headers)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  if (event?.type !== 'email.received' || !INBOUND_DOMAIN) {
    return NextResponse.json({ ok: true });
  }

  try {
    const data = event.data ?? {};
    const recipients: string[] = Array.isArray(data.to) ? data.to : [];
    const suffix = '@' + INBOUND_DOMAIN;
    let token = '';
    for (const addr of recipients) {
      const a = String(addr).toLowerCase().trim();
      const m = a.match(/<([^>]+)>/);
      const email = (m ? m[1] : a).trim();
      if (email.endsWith(suffix)) { token = email.slice(0, -suffix.length); break; }
    }
    if (!token) return NextResponse.json({ ok: true });

    let body = '';
    if (data.email_id && RESEND_API_KEY) {
      const r = await fetch(`https://api.resend.com/emails/receiving/${data.email_id}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      if (r.ok) {
        const mail: any = await r.json();
        body = (mail.text && String(mail.text)) || (mail.html ? htmlToText(String(mail.html)) : '');
      }
    }
    body = stripQuoted(body);
    if (!body) body = '(réponse vide)';
    if (body.length > 5000) body = body.slice(0, 5000);

    await fetch(`${WEB_URL}/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: body }),
    });
  } catch {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
