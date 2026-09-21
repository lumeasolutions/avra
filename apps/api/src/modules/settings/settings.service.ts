import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Paramètres du workspace (société, facturation, numérotation, relances,
 * alertes, préférences, IA). Toute la config UI est persistée en bloc dans la
 * colonne JSON `WorkspaceSettings.extra` — un seul aller-retour, pas de
 * migration par champ. Le backend stocke/restitue le bloc (fusion par
 * rubrique à l'écriture) ; le front reste la source de vérité de sa forme.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(workspaceId: string) {
    const row = await this.prisma.workspaceSettings.findUnique({
      where: { workspaceId },
      select: { extra: true },
    });
    return { config: (row?.extra as Record<string, unknown> | null) ?? null };
  }

  async update(workspaceId: string, config: Record<string, unknown>) {
    // 22/09/2026 — FUSION par rubrique (clé de 1er niveau) au lieu d'un
    // remplacement du bloc entier : les types de RDV / métiers du planning
    // sont poussés seuls (`planningTypes`) et ne doivent ni écraser la config
    // société/facturation, ni être effacés par elle. Une rubrique envoyée
    // remplace l'ancienne ; une rubrique absente est conservée.
    const existing = await this.prisma.workspaceSettings.findUnique({
      where: { workspaceId },
      select: { extra: true },
    });
    const prev = (existing?.extra && typeof existing.extra === 'object' && !Array.isArray(existing.extra))
      ? (existing.extra as Record<string, unknown>)
      : {};
    const merged = { ...prev, ...config };

    // BACK 13/07/2026 — En plus du bloc JSON `extra`, on renseigne les colonnes
    // dédiées (address / siret / logoUrl / vatRate) qui étaient laissées vides.
    // Elles sont lues par la facturation et le portail public (mentions légales) :
    // sans ça, ces infos n'apparaissaient jamais hors du front.
    const societe = ((config?.societe as Record<string, any>) ?? {});
    const numerotation = ((config?.numerotation as Record<string, any>) ?? {});
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

    const ligne2 = [str(societe.codePostal), str(societe.ville)].filter(Boolean).join(' ');
    const addressParts = [str(societe.adresse), ligne2 || null].filter(Boolean);
    const address = addressParts.length ? addressParts.join(', ') : null;
    const siret = str(societe.siret);
    const logoUrl = str(societe.logo);
    const vatRaw = numerotation.tvaDefaut;
    const vatRate = typeof vatRaw === 'number' && isFinite(vatRaw) ? vatRaw : undefined;

    // Colonnes dédiées : mises à jour UNIQUEMENT si la rubrique correspondante
    // est envoyée (sinon un envoi partiel les remettrait à null).
    const scalar: Record<string, unknown> = {};
    if (config?.societe !== undefined) Object.assign(scalar, { address, siret, logoUrl });
    if (vatRate !== undefined) scalar.vatRate = vatRate;

    await this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      create: { workspaceId, extra: merged as any, ...scalar },
      update: { extra: merged as any, ...scalar },
    });
    return { ok: true };
  }
}
