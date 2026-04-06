/**
 * POST /api/ia/chat
 *
 * Proxy vers le backend NestJS /api/ia/chat avec SSE streaming.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function POST(req: NextRequest) {
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

    const backendResponse = await fetch(`${API_URL}/ia/chat`, {
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
