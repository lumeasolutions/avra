import { Injectable } from '@nestjs/common';
// Arithmetique monetaire en Decimal (jamais Number) pour eviter l'accumulation
// flottante sur les sommes de CA/achat renvoyees par groupBy.
import { Decimal } from '@prisma/client/runtime/library';
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
    let reception = 0;
    let caTotal = new Decimal(0);
    let achatTotal = new Decimal(0);

    // Parcourir les résultats groupBy en une seule passe
    for (const result of results) {
      if (result.lifecycleStatus === 'VENTE') {
        inVente = result._count;
      } else if (['SIGNE', 'EN_CHANTIER'].includes(result.lifecycleStatus)) {
        signes += result._count;
      } else if (result.lifecycleStatus === 'PERDU') {
        perdus = result._count;
      } else if (result.lifecycleStatus === 'RECEPTION') {
        reception = result._count;
      }

      caTotal = caTotal.plus(result._sum.saleAmount ?? 0);
      achatTotal = achatTotal.plus(result._sum.purchaseAmount ?? 0);
    }

    const tauxConversion = signes + perdus > 0 ? Math.round((signes / (signes + perdus)) * 10000) / 100 : 0;

    // Une seule conversion Number finale (arrondie au centime), apres cumul Decimal exact.
    const margeTotal = caTotal.minus(achatTotal);
    return {
      projectsInVente: inVente,
      projectsSignes: signes,
      projectsPerdus: perdus,
      projectsReception: reception,
      caTotal: caTotal.toDecimalPlaces(2).toNumber(),
      achatTotal: achatTotal.toDecimalPlaces(2).toNumber(),
      margeTotal: margeTotal.toDecimalPlaces(2).toNumber(),
      tauxConversion,
    };
  }
}
