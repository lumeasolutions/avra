/**
 * POST /api/chat-marketing
 * Assistant commercial AVRA — pour les visiteurs non connectés du site vitrine.
 *
 * Provider primaire : OpenAI gpt-4o-mini (~16x moins cher que gpt-4o pour ce
 * cas d'usage simple). Fallback transparent sur Anthropic si seul ANTHROPIC_API_KEY
 * est configuré (utile pendant la migration progressive).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

// Route publique (visiteurs non authentifiés) : on borne le débit ET la taille de
// la conversation pour éviter le drain du budget OpenAI/Anthropic par un script.
const CHAT_MARKETING_RATE_LIMIT = { limit: 15, windowMs: 60_000 }; // 15 req/min/IP
const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 8000;

const SYSTEM_PROMPT = `Tu es Aria, l'assistante commerciale d'AVRA — le logiciel de gestion dédié aux professionnels de l'agencement (cuisinistes, menuisiers, architectes d'intérieur, agenceurs).

Tu guides les visiteurs du site pour qu'ils comprennent comment AVRA peut transformer leur activité. Tu es chaleureuse, professionnelle, et orientée résultat.

**Ce qu'AVRA propose :**
- Gestion complète des dossiers clients (devis → signature → chantier → facturation)
- Facturation conforme e-facture 2026 (obligatoire en France)
- IA photo-réaliste pour générer des rendus de projets
- Planning et gestion d'équipe
- Portails dédiés (architecte, menuisier)
- CRM pipeline visuel
- Gestion des stocks et commandes fournisseurs
- En bêta privée actuellement — Lancement public janvier 2027. Liste d'attente ouverte sur avra-app.fr/rejoindre

**Tarifs :**
- Solo : 49€/mois — 1 utilisateur, toutes les fonctions de base
- Pro : 89€/mois — jusqu'à 5 utilisateurs, IA incluse
- Équipe : 149€/mois — utilisateurs illimités, support prioritaire

**Règles importantes :**
- Réponds toujours en français
- Sois concis (3-4 phrases max par réponse)
- Si le visiteur semble intéressé, propose-lui de demander une démo sur avra-app.fr/demo ou de rejoindre la liste d'attente sur avra-app.fr/rejoindre (AVRA est en bêta privée, lancement public janvier 2027)
- Ne pas inventer de fonctionnalités qui n'existent pas
- Si tu ne sais pas, dis-le honnêtement et invite à contacter l'équipe
- Tu peux utiliser des emojis avec modération
`;

const OPENAI_MODEL = process.env.OPENAI_MODEL_CHEAP || 'gpt-4o-mini';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5-20251001';

function fallbackStream(message: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ content: message })}\n\n`),
      );
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`),
      );
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`chat-marketing:${ip}`, CHAT_MARKETING_RATE_LIMIT);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans une minute.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages requis' }, { status: 400 });
    }
    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: 'Conversation trop longue' }, { status: 400 });
    }
    // Valide roles + borne la taille cumulée (anti-injection de contexte massif).
    let totalChars = 0;
    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || (m.role !== 'user' && m.role !== 'assistant')) {
        return NextResponse.json({ error: 'Format de message invalide' }, { status: 400 });
      }
      totalChars += m.content.length;
    }
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: 'Message trop long' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Fallback total : aucune clé → message statique amical
    if (!openaiKey && !anthropicKey) {
      const msg =
        "Bonjour ! Je suis Aria, l'assistante AVRA. Je suis temporairement indisponible. AVRA est en bêta privée — lancement public janvier 2027. Vous pouvez demander une démo sur avra-app.fr/demo ou rejoindre la liste d'attente sur avra-app.fr/rejoindre !";
      return new NextResponse(fallbackStream(msg), {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // Provider auto : OpenAI prioritaire, sinon fallback Anthropic
    if (openaiKey && openaiKey.startsWith('sk-')) {
      return await streamOpenAI(messages, openaiKey);
    }
    return await streamAnthropic(messages, anthropicKey!);
  } catch (err: any) {
    console.error('[/api/chat-marketing]', err?.message || err);
    const msg =
      'Désolée, je rencontre un problème technique. Contactez-nous sur avra-app.fr ou demandez une démo sur avra-app.fr/demo !';
    return new NextResponse(fallbackStream(msg), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }
}

async function streamOpenAI(messages: any[], apiKey: string): Promise<NextResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 400,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      ],
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`OpenAI error ${response.status}`);
  }

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
            if (data === '[DONE]') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
              );
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`),
                );
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
      Connection: 'keep-alive',
    },
  });
}

async function streamAnthropic(messages: any[], apiKey: string): Promise<NextResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
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
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`),
                );
              } else if (parsed.type === 'message_stop') {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
                );
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
      Connection: 'keep-alive',
    },
  });
}
