/**
 * POST /api/ia/compare-devis-pdf
 *
 * Structure DEUX devis fournis sous forme de TEXTE brut (extrait des PDF côté
 * navigateur via pdfjs) en objets {objet, client, date, lignes[], totalHT} à
 * l'aide de gpt-4o (response_format json_schema strict), pour permettre une
 * comparaison ligne par ligne (v4). L'extraction PEUT se tromper : le front
 * affiche les lignes retrouvées + un avertissement « vérifiez ».
 *
 * Auth JWT + rate-limit. Aucune image envoyée : seulement du texte.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';

export const maxDuration = 60;

const RATE = { limit: 15, windowMs: 60 * 60 * 1000 };
const MAX_TEXT = 60_000; // caractères par devis (garde-fou payload / coût)

const DEVIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['objet', 'client', 'date', 'totalHT', 'lignes'],
  properties: {
    objet: { type: ['string', 'null'] },
    client: { type: ['string', 'null'] },
    date: { type: ['string', 'null'] },
    totalHT: { type: ['number', 'null'] },
    lignes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['description', 'quantite', 'prixUnitaireHT', 'remise', 'tva'],
        properties: {
          description: { type: 'string' },
          quantite: { type: 'number' },
          prixUnitaireHT: { type: 'number' },
          remise: { type: ['number', 'null'] },
          tva: { type: ['number', 'null'] },
        },
      },
    },
  },
} as const;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['devisA', 'devisB', 'confidence', 'notes'],
  properties: {
    devisA: DEVIS_SCHEMA,
    devisB: DEVIS_SCHEMA,
    confidence: { type: 'number' },
    notes: { type: 'string' },
  },
} as const;

const SYSTEM = `Tu extrais des DEVIS du batiment / de l'agencement depuis leur TEXTE brut (issu d'un PDF, la mise en page peut etre desordonnee).
On te donne DEUX devis : "DEVIS A" puis "DEVIS B". Pour CHACUN, extrais :
- "objet" : l'objet / titre du devis si present (ex "Cuisine", "Renovation SDB"), sinon null,
- "client" : nom du client si present, sinon null,
- "date" : date du devis telle qu'ecrite si presente, sinon null,
- "lignes" : la liste des lignes de prestation/produit, dans l'ordre. Pour chaque ligne :
    - "description" : libelle nettoye (sans les montants),
    - "quantite" : nombre (1 si non precise),
    - "prixUnitaireHT" : prix unitaire HORS TAXE en euros (nombre),
    - "remise" : pourcentage de remise sur la ligne si present, sinon null,
    - "tva" : taux de TVA en % de la ligne si present, sinon null,
- "totalHT" : total HT du devis si lisible, sinon null.
REGLES STRICTES : n'invente RIEN. Si une valeur est absente/illisible, mets null (ou 1 pour une quantite non precisee). Ne confonds pas prix unitaire et total de ligne : si seul le total ligne est donne avec une quantite, deduis le PU = total / quantite. Ignore en-tetes, mentions legales, conditions de paiement, coordonnees. Retablis les lignes meme si les colonnes sont melangees.
Renvoie aussi "confidence" (0 a 1 : ta confiance globale dans l'extraction) et "notes" (une phrase : difficultes rencontrees, ex "PDF scanne, colonnes ambigues").`;

export async function POST(req: NextRequest) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rate = checkRateLimit(`ia-compare-devis-pdf:user:${userCtx.userId}`, RATE);
  if (!rate.success) {
    return NextResponse.json({ error: "Trop d'analyses cette heure. Réessayez plus tard." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const textA = (typeof body.textA === 'string' ? body.textA : '').trim();
  const textB = (typeof body.textB === 'string' ? body.textB : '').trim();
  if (textA.length < 20 || textB.length < 20) {
    return NextResponse.json(
      { error: 'Texte des devis introuvable. Un PDF scanné (image) ne contient pas de texte extractible — exportez un PDF « texte » ou utilisez « Comparer 2 photos ».' },
      { status: 400 },
    );
  }
  if (textA.length > MAX_TEXT || textB.length > MAX_TEXT) {
    return NextResponse.json({ error: 'Devis trop volumineux à analyser. Réduisez le document.' }, { status: 413 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "L'analyse IA n'est pas configurée (clé manquante)." }, { status: 503 });
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
        temperature: 0,
        max_tokens: 3000,
        response_format: { type: 'json_schema', json_schema: { name: 'compare_devis', strict: true, schema: SCHEMA } },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `=== DEVIS A ===\n${textA}\n\n=== DEVIS B ===\n${textB}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('[compare-devis-pdf] OpenAI', res.status, t.slice(0, 300));
      return NextResponse.json({ error: 'Extraction IA indisponible pour le moment. Réessayez.' }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw); }
    catch { return NextResponse.json({ error: 'Réponse IA illisible. Réessayez.' }, { status: 502 }); }

    return NextResponse.json({
      devisA: parsed.devisA ?? null,
      devisB: parsed.devisB ?? null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      rateLimit: { remaining: rate.remaining },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    console.error('[compare-devis-pdf] exception:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: aborted ? 'Délai dépassé — réessayez.' : 'Erreur serveur.' },
      { status: aborted ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
