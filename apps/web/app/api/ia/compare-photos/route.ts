/**
 * POST /api/ia/compare-photos
 *
 * Analyse ASSISTÉE de deux photos (ex. état des lieux avant/après) : gpt-4o
 * (vision) liste les différences VISIBLES entre l'image A et l'image B.
 *
 * Positionnement assumé : l'IA PROPOSE, l'humain VALIDE. Le prompt demande au
 * modèle d'être prudent (ne signaler que le certain) — l'UI affiche un
 * avertissement « à vérifier ». Aucun IaJob (analyse légère, non facturée au
 * rendu). Auth JWT + rate-limit.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';

export const maxDuration = 60;

const RATE = { limit: 20, windowMs: 60 * 60 * 1000 };

interface Diff {
  zone: string;
  description: string;
  type: 'ajout' | 'manquant' | 'degradation' | 'modification' | 'autre';
  gravite: 'faible' | 'moyenne' | 'elevee';
}

const SYSTEM = `Tu es un assistant qui compare DEUX photos d'un même lieu pour un professionnel du bâtiment / de l'agencement (état des lieux, avant/après chantier, deux versions d'une pièce).
Image 1 = A (référence / avant). Image 2 = B (comparée / après).
Liste UNIQUEMENT les différences VISIBLES et CERTAINES entre A et B.
Pour chaque différence :
- "zone" : où dans l'image (ex "mur gauche", "plan de travail", "sol près de la fenêtre"),
- "description" : courte et factuelle (ex "rayure sur la façade", "meuble haut ajouté", "tache au sol"),
- "type" : "ajout" (présent en B, absent en A) | "manquant" (présent en A, absent en B) | "degradation" (abîmé, sali, rayé, cassé) | "modification" (déplacé, changé de couleur/matière) | "autre",
- "gravite" : "faible" | "moyenne" | "elevee".
RÈGLES : sois PRUDENT — ne signale que ce qui est clairement visible. Dans le doute, n'inclus PAS. Ignore les différences de cadrage, de luminosité ou d'angle de prise de vue. Ne rien inventer.
Réponds STRICTEMENT en JSON : {"differences":[{...}],"resume":"une phrase de synthèse neutre"}. Si aucune différence certaine : {"differences":[],"resume":"Aucune différence nette détectée — à vérifier visuellement."}`;

export async function POST(req: NextRequest) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rate = checkRateLimit(`ia-compare-photos:user:${userCtx.userId}`, RATE);
  if (!rate.success) {
    return NextResponse.json({ error: 'Trop d\'analyses cette heure. Réessayez plus tard.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const imageA = typeof body.imageA === 'string' ? body.imageA : '';
  const imageB = typeof body.imageB === 'string' ? body.imageB : '';
  if (!imageA.startsWith('data:image') || !imageB.startsWith('data:image')) {
    return NextResponse.json({ error: 'Deux images (A et B) sont requises.' }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "L'analyse IA n'est pas configurée (clé manquante). Utilisez la comparaison visuelle." }, { status: 503 });
  }
  const model = process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Compare ces deux photos (image 1 = A, image 2 = B) et liste les différences en JSON.' },
              { type: 'image_url', image_url: { url: imageA, detail: 'high' } },
              { type: 'image_url', image_url: { url: imageB, detail: 'high' } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('[compare-photos] OpenAI', res.status, t.slice(0, 300));
      return NextResponse.json({ error: 'Analyse IA indisponible pour le moment. Réessayez ou comparez visuellement.' }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: { differences?: Diff[]; resume?: string };
    try { parsed = JSON.parse(raw); }
    catch { parsed = { differences: [], resume: 'Réponse IA illisible — comparez visuellement.' }; }

    const differences = Array.isArray(parsed.differences) ? parsed.differences.slice(0, 30) : [];
    return NextResponse.json({
      differences,
      resume: typeof parsed.resume === 'string' ? parsed.resume : '',
      rateLimit: { remaining: rate.remaining },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    console.error('[compare-photos] exception:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: aborted ? 'Délai dépassé — réessayez avec des photos plus légères.' : 'Erreur serveur.' },
      { status: aborted ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
