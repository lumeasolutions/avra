/**
 * POST /api/ia/chat
 *
 * Proxy vers le backend NestJS /api/ia/chat avec SSE streaming.
 *
 * SÉCURITÉ (SEC-H4) : Rate-limit + auth obligatoire — un attaquant qui
 * pose `logged_in=true` ne peut plus drainer le budget OpenAI/Qwen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { isAuthenticated } from '@/lib/server/auth-guard';

const IA_CHAT_RATE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30 messages / minute / IP

function resolveApiUrl(req: NextRequest): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  // Si l'URL est absolue (http/https), on la retourne telle quelle
  if (/^https?:\/\//i.test(raw)) return raw;
  // Sinon (ex: "/api/v1"), on construit une URL absolue à partir de la requête entrante
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host');
  return `${proto}://${host}${raw}`;
}

export async function POST(req: NextRequest) {
  // Auth obligatoire (access_token JWT en prod)
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit par IP
  const ip = getClientIp(req);
  const rateResult = checkRateLimit(`ia-chat:${ip}`, IA_CHAT_RATE_LIMIT);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Réessayez dans quelques instants.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await req.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Passer le token si disponible
    const accessToken = req.cookies.get('access_token')?.value;
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const apiUrl = resolveApiUrl(req);
    const backendResponse = await fetch(`${apiUrl}/ia/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok || !backendResponse.body) {
      const errText = await backendResponse.text().catch(() => '');
      console.error(`[/api/ia/chat] Backend error: ${backendResponse.status}`, errText);
      throw new Error(`Backend returned ${backendResponse.status}: ${errText}`);
    }

    // Streamer la réponse du backend vers le client
    return new NextResponse(backendResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[/api/ia/chat] Error:', err?.message || err);
    const stream = new ReadableStream({
      start(controller) {
        const msg = `Erreur: ${err?.message || 'connexion échouée'}`;
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: msg })}\n\n`));
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      },
    });
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }
}
