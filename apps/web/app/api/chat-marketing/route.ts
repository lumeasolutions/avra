/**
 * POST /api/chat-marketing
 * Assistant commercial AVRA — pour les visiteurs non connectés du site vitrine.
 * Appel direct à l'API Anthropic (pas de proxy NestJS).
 */

import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Tu es Aria, l'assistante commerciale d'AVRA — le logiciel de gestion N°1 pour les professionnels de l'agencement (cuisinistes, menuisiers, architectes d'intérieur, agenceurs).

Tu guides les visiteurs du site pour qu'ils comprennent comment AVRA peut transformer leur activité. Tu es chaleureuse, professionnelle, et orientée résultat.

**Ce qu'AVRA propose :**
- Gestion complète des dossiers clients (devis → signature → chantier → facturation)
- Facturation conforme e-facture 2026 (obligatoire en France)
- IA photo-réaliste pour générer des rendus de projets
- Planning et gestion d'équipe
- Portails dédiés (architecte, menuisier)
- CRM pipeline visuel
- Gestion des stocks et commandes fournisseurs
- Essai gratuit 14 jours, sans carte bancaire

**Tarifs :**
- Solo : 49€/mois — 1 utilisateur, toutes les fonctions de base
- Pro : 89€/mois — jusqu'à 5 utilisateurs, IA incluse
- Équipe : 149€/mois — utilisateurs illimités, support prioritaire

**Règles importantes :**
- Réponds toujours en français
- Sois concis (3-4 phrases max par réponse)
- Si le visiteur semble intéressé, propose-lui de commencer l'essai gratuit sur avra.fr/tarifs ou de voir une démo sur avra.fr/demo
- Ne pas inventer de fonctionnalités qui n'existent pas
- Si tu ne sais pas, dis-le honnêtement et invite à contacter l'équipe
- Tu peux utiliser des emojis avec modération
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages requis' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Mode fallback si pas de clé configurée
      const stream = new ReadableStream({
        start(controller) {
          const msg = "Bonjour ! Je suis Aria, l'assistante AVRA 🦉 Je suis temporairement indisponible, mais vous pouvez nous contacter directement sur avra.fr ou démarrer votre essai gratuit sans engagement !";
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: msg })}\n\n`));
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        },
      });
      return new NextResponse(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        stream: true,
        messages: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Anthropic error ${response.status}`);
    }

    // SSE passthrough
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`));
                } else if (parsed.type === 'message_stop') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                }
              } catch {
                // ligne non-JSON, ignorer
              }
            }
          }
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[/api/chat-marketing]', err?.message || err);
    const stream = new ReadableStream({
      start(controller) {
        const msg = "Désolée, je rencontre un problème technique. Contactez-nous sur avra.fr ou démarrez votre essai gratuit !";
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
