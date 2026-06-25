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

/**
 * Récupère les pièces jointes d'un e-mail entrant via l'API Resend et les
 * réinjecte dans AVRA via l'endpoint public d'upload (mêmes briques que la
 * page web : DossierDocument "Reçu de l'intervenant" + DemandeAttachment +
 * notification -> visible dans Messages intervenants + classable). Renvoie le
 * nombre de fichiers réellement importés.
 */
async function uploadInboundAttachments(emailId: string, token: string): Promise<{ uploaded: number; skipped: string[] }> {
  let count = 0;
  const skipped: string[] = [];
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    if (!r.ok) return { uploaded: 0, skipped };
    const list: any = await r.json();
    const items: any[] = Array.isArray(list?.data) ? list.data : [];
    for (const att of items) {
      try {
        const ct = String(att?.content_type || 'application/octet-stream');
        const disp = String(att?.content_disposition || '');
        const fname = String(att?.filename || 'document');
        // On ignore les images "inline" (logos / signatures intégrés au corps du mail).
        if (disp === 'inline' && ct.startsWith('image/')) continue;
        if (!att?.download_url) continue;
        // Limite ~4,5 Mo sur l'upload multipart Vercel -> on saute au-delà (et on le signale).
        if (typeof att.size === 'number' && att.size > 4_300_000) { skipped.push(fname); continue; }
        const dl = await fetch(String(att.download_url));
        if (!dl.ok) continue;
        const ab = await dl.arrayBuffer();
        if (ab.byteLength > 4_300_000) { skipped.push(fname); continue; }
        const filename = String(att.filename || `piece-jointe-${count + 1}`);
        const fd = new FormData();
        fd.append('file', new Blob([ab], { type: ct }), filename);
        const up = await fetch(
          `${WEB_URL}/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/attachments`,
          { method: 'POST', body: fd },
        );
        if (up.ok) count++;
      } catch { /* une pièce jointe en échec ne bloque pas les autres */ }
    }
  } catch { /* ignore */ }
  return { uploaded: count, skipped };
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

    const emailId: string = data.email_id ? String(data.email_id) : '';

    // 1) Corps texte de la réponse.
    let body = '';
    if (emailId && RESEND_API_KEY) {
      const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      if (r.ok) {
        const mail: any = await r.json();
        body = (mail.text && String(mail.text)) || (mail.html ? htmlToText(String(mail.html)) : '');
      }
    }
    body = stripQuoted(body);
    if (body.length > 5000) body = body.slice(0, 5000);

    // 2) Pièces jointes : si le mail en contient, on les importe dans le dossier.
    let uploaded = 0;
    let skipped: string[] = [];
    const metaAtt: any[] = Array.isArray(data.attachments) ? data.attachments : [];
    if (emailId && RESEND_API_KEY && metaAtt.length > 0) {
      const res = await uploadInboundAttachments(emailId, token);
      uploaded = res.uploaded;
      skipped = res.skipped;
    }

    // 3) Message dans la conversation : le texte s'il existe, sinon une note
    //    si des documents sont arrivés (pour ne pas afficher un message vide).
    let message = body;
    if (!message) message = uploaded > 0 ? '(documents envoyés en pièce jointe)' : '(réponse vide)';
    // Signale les pièces jointes trop volumineuses non importées (limite ~4 Mo).
    if (skipped.length > 0) {
      message += `\n\n⚠️ ${skipped.length} pièce(s) jointe(s) trop volumineuse(s) (> 4 Mo) non importée(s) : ${skipped.join(', ')}. À demander autrement.`;
    }

    await fetch(`${WEB_URL}/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
