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
    await this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      create: { workspaceId, extra: config as any },
      update: { extra: config as any },
    });
    return { ok: true };
  }
}
