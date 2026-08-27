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

const SYSTEM_PHOTOS = `Tu es un assistant qui compare DEUX photos d'un même lieu pour un professionnel du bâtiment / de l'agencement (état des lieux, avant/après chantier, deux versions d'une pièce).
Image 1 = A (référence / avant). Image 2 = B (comparée / après).

MÉTHODE OBLIGATOIRE (suis ces étapes dans l'ordre) :
1) Dresse l'INVENTAIRE des éléments distinctifs visibles en A : meubles, objets MURAUX (étagères, tableaux, luminaires, prises, patères), électroménager, éléments posés (sur le plan de travail, au sol).
2) Pour CHAQUE élément listé en A, vérifie s'il est présent en B. S'il est ABSENT de B, tu DOIS le signaler en type "manquant" (ex "étagère murale retirée"). Ne l'oublie JAMAIS, même s'il est grand ou évident — les retraits sont aussi importants que les ajouts.
3) Repère les éléments présents en B mais absents de A -> type "ajout".
4) Repère les dégradations et déplacements sur les éléments présents dans les DEUX images.

TYPAGE (strict, une seule catégorie par différence) :
- "manquant" : élément présent en A, absent en B (retrait).
- "ajout" : élément présent en B, absent en A.
- "degradation" : TOUTE rayure, marque, tache, éraflure, fissure, salissure ou casse -> TOUJOURS "degradation" (jamais "modification", jamais "manquant").
- "modification" : même élément déplacé, ou changé de couleur/matière, SANS dommage.
- "autre" : sinon.

Chaque différence : "zone" (ex "mur gauche", "plan de travail"), "description" (factuelle), "type" (ci-dessus), "gravite" ("faible" | "moyenne" | "elevee").
RÈGLES : n'affirme rien dont tu n'es pas sûr (dans le doute -> "gravite":"faible", ou n'inclus pas). Ignore les différences de cadrage, de luminosité, d'ombre ou d'angle. Ne rien inventer.
Réponds STRICTEMENT en JSON : {"differences":[{...}],"resume":"une phrase de synthèse neutre"}. Si aucune différence certaine : {"differences":[],"resume":"Aucune différence nette détectée — à vérifier visuellement."}`;

const SYSTEM_PLANS = `Tu es un assistant qui compare DEUX plans techniques d'un même projet d'agencement / architecture d'intérieur (deux versions/révisions d'un plan, ou plan projeté vs relevé).
Plan 1 = A (référence). Plan 2 = B (comparé).
Procède avec MÉTHODE : parcours les 4 murs puis l'intérieur dans le MÊME ordre sur A et B, et compare dans les DEUX SENS (présent en A absent en B = supprimé/manquant ; présent en B absent en A = ajout). Nomme les zones de façon COHÉRENTE (mur haut/bas/gauche/droit).
Liste UNIQUEMENT les écarts VISIBLES et CERTAINS entre A et B :
- cotes / dimensions qui changent (ex "largeur cuisine 3,20 m -> 3,00 m"),
- cloisons / murs ajoutés, supprimés ou déplacés,
- ouvertures (portes, fenêtres, passages) ajoutées, supprimées ou déplacées,
- implantation du mobilier / équipements (meubles, électroménager, sanitaires, points d'eau, prises) : ajout, suppression, déplacement,
- annotations / libellés / repères modifiés.
Pour chaque écart :
- "zone" : localisation (ex "mur nord", "angle cuisine", "salle de bain"),
- "description" : courte et factuelle, cite les valeurs de cotes quand elles sont clairement lisibles,
- "type" : "ajout" (présent en B, absent en A) | "manquant" (présent en A, absent en B) | "modification" (déplacé, redimensionné, cote changée) | "degradation" (rarement pertinent sur un plan) | "autre",
- "gravite" : "faible" | "moyenne" | "elevee".
RÈGLES : sois PRUDENT — ne signale que le certain. Ne LIS PAS une cote si elle est floue/illisible ; dans le doute, n'inclus PAS. Ignore les différences d'échelle, de cadrage ou de qualité d'image. Ne rien inventer.
Réponds STRICTEMENT en JSON : {"differences":[{...}],"resume":"une phrase de synthèse neutre"}. Si aucun écart certain : {"differences":[],"resume":"Aucun écart net détecté — à vérifier manuellement sur les plans."}`;

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
  // Garde-taille : le client compresse déjà (~1-2 Mo), mais on refuse proprement
  // au-delà du plafond serverless (~4,5 Mo) plutôt que de laisser la plateforme
  // renvoyer un 413 opaque.
  if (imageA.length + imageB.length > 4_000_000) {
    return NextResponse.json({ error: 'Images trop lourdes. Réessayez avec des photos plus légères.' }, { status: 413 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "L'analyse IA n'est pas configurée (clé manquante). Utilisez la comparaison visuelle." }, { status: 503 });
  }
  const model = process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o';

  const isPlans = body.mode === 'plans';
  const SYSTEM = isPlans ? SYSTEM_PLANS : SYSTEM_PHOTOS;
  const userText = isPlans
    ? 'Compare ces deux plans (image 1 = A / référence, image 2 = B / comparé) et liste les écarts en JSON.'
    : 'Compare ces deux photos (image 1 = A, image 2 = B) et liste les différences en JSON.';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0, // déterminisme max : même paire d'images -> résultat le plus stable possible
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
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
