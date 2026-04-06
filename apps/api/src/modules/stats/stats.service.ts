import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobal(workspaceId: string) {
    // OPTIMISATION: Utiliser une seule requête groupBy avec multiple by pour éviter les filtres JS
    const results = await this.prisma.project.groupBy({
      by: ['lifecycleStatus'],
      where: { workspaceId },
      _count: true,
      _sum: { saleAmount: true, purchaseAmount: true },
    });

    let inVente = 0;
    let signes = 0;
    let perdus = 0;
    let caTotal = 0;
    let achatTotal = 0;

    // Parcourir les résultats groupBy en une seule passe
    for (const result of results) {
      if (result.lifecycleStatus === 'VENTE') {
        inVente = result._count;
      } else if (['SIGNE', 'EN_CHANTIER'].includes(result.lifecycleStatus)) {
        signes += result._count;
      } else if (result.lifecycleStatus === 'PERDU') {
        perdus = result._count;
      }

      caTotal += Number(result._sum.saleAmount ?? 0);
      achatTotal += Number(result._sum.purchaseAmount ?? 0);
    }

    const tauxConversion = signes + perdus > 0 ? Math.round((signes / (signes + perdus)) * 10000) / 100 : 0;

    return {
      projectsInVente: inVente,
      projectsSignes: signes,
      projectsPerdus: perdus,
      caTotal,
      achatTotal,
      margeTotal: caTotal - achatTotal,
      tauxConversion,
    };
  }
}
