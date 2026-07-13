import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Paramètres du workspace (société, facturation, numérotation, relances,
 * alertes, préférences, IA). Toute la config UI est persistée en bloc dans la
 * colonne JSON `WorkspaceSettings.extra` — un seul aller-retour, pas de
 * migration par champ. Le backend ne fait que stocker/restituer le bloc ;
 * le front reste la source de vérité de sa forme.
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

    const scalar: Record<string, unknown> = { address, siret, logoUrl };
    if (vatRate !== undefined) scalar.vatRate = vatRate;

    await this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      create: { workspaceId, extra: config as any, ...scalar },
      update: { extra: config as any, ...scalar },
    });
    return { ok: true };
  }
}
