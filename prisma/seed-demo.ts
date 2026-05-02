import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed AVRA — création des données démo complètes...');

  // ─── Workspace ──────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'avra-demo' },
    update: { name: 'AVRA Design' },
    create: {
      name: 'AVRA Design',
      slug: 'avra-demo',
      plan: 'PRO',
    },
  });

  // ─── Utilisateurs ──────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('demo123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'demo@avra.fr' },
    update: { passwordHash: hash, firstName: 'Cassandra', lastName: 'Dupuis' },
    create: {
      email: 'demo@avra.fr',
      passwordHash: hash,
      firstName: 'Cassandra',
      lastName: 'Dupuis',
      isActive: true,
    },
  });

  await prisma.userWorkspace.upsert({
    where: { userId_workspaceId: { userId: owner.id, workspaceId: workspace.id } },
    update: { role: 'OWNER' },
    create: { userId: owner.id, workspaceId: workspace.id, role: 'OWNER' },
  });

  // Workspace settings
  await prisma.workspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      companyName: 'AVRA Design',
      companyAddress: '12 rue de la Paix, 75001 Paris',
      companySiret: '12345678901234',
      companyVat: 'FR12345678901',
      vatRate: 20,
      currency: 'EUR',
      enableIa: true,
      enableSignature: false,
      enablePayment: true,
    },
  });

  // ─── Clients ────────────────────────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: 'client-turpin' },
      update: {},
      create: {
        id: 'client-turpin',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Jacques',
        lastName: 'Turpin',
        email: 'turpin@mail.fr',
        phone: '06 11 22 33 44',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-lefevre' },
      update: {},
      create: {
        id: 'client-lefevre',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Marie',
        lastName: 'Lefevre',
        email: 'lefevre@mail.fr',
        phone: '06 98 77 66 55',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-bernard' },
      update: {},
      create: {
        id: 'client-bernard',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Paul',
        lastName: 'Bernard',
        email: 'bernard@mail.fr',
        phone: '06 55 44 33 22',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-dupont' },
      update: {},
      create: {
        id: 'client-dupont',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Claire',
        lastName: 'Dupont',
        email: 'dupont@mail.fr',
        phone: '06 12 23 34 45',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-saland' },
      update: {},
      create: {
        id: 'client-saland',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Thomas',
        lastName: 'Saland',
        email: 'saland@mail.fr',
        phone: '06 87 76 65 54',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-damont' },
      update: {},
      create: {
        id: 'client-damont',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Luc',
        lastName: 'Damont',
        email: 'damont@mail.fr',
        phone: '06 11 00 99 88',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-debuchy' },
      update: {},
      create: {
        id: 'client-debuchy',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Anne',
        lastName: 'Debuchy',
        email: 'debuchy@mail.fr',
        phone: '06 22 33 44 55',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-roux' },
      update: {},
      create: {
        id: 'client-roux',
        workspaceId: workspace.id,
        type: 'PARTICULIER',
        firstName: 'Sophie',
        lastName: 'Roux',
        email: 'roux@mail.fr',
        phone: '06 66 77 88 99',
      },
    }),
  ]);

  const [cTurpin, cLefevre, cBernard, cDupont, cSaland, cDamont, cDebuchy, cRoux] = clients;

  // ─── Projets EN COURS / URGENT ──────────────────────────────────────────────
  const now = new Date();
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  const projects = await Promise.all([
    prisma.project.upsert({
      where: { id: 'proj-turpin' },
      update: {},
      create: {
        id: 'proj-turpin',
        workspaceId: workspace.id,
        clientId: cTurpin.id,
        ownerId: owner.id,
        name: 'Cuisine Turpin',
        reference: 'AVRA-2026-001',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'VENTE',
        pipelineStatus: 'NEGOCIATION',
        priority: 'URGENT',
        saleAmount: 24500,
        createdAt: d(20),
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-lefevre' },
      update: {},
      create: {
        id: 'proj-lefevre',
        workspaceId: workspace.id,
        clientId: cLefevre.id,
        ownerId: owner.id,
        name: 'Cuisine Lefevre',
        reference: 'AVRA-2026-002',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'VENTE',
        pipelineStatus: 'DEVIS_ENVOYE',
        priority: 'URGENT',
        saleAmount: 18900,
        createdAt: d(22),
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-bernard' },
      update: {},
      create: {
        id: 'proj-bernard',
        workspaceId: workspace.id,
        clientId: cBernard.id,
        ownerId: owner.id,
        name: 'Cuisine Bernard',
        reference: 'AVRA-2026-003',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'VENTE',
        pipelineStatus: 'PROSPECT',
        priority: 'URGENT',
        saleAmount: 31200,
        createdAt: d(25),
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-dupont' },
      update: {},
      create: {
        id: 'proj-dupont',
        workspaceId: workspace.id,
        clientId: cDupont.id,
        ownerId: owner.id,
        name: 'Cuisine Dupont',
        reference: 'AVRA-2026-004',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'VENTE',
        pipelineStatus: 'DEVIS_ENVOYE',
        priority: 'MEDIUM',
        saleAmount: 15600,
        createdAt: d(40),
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-saland' },
      update: {},
      create: {
        id: 'proj-saland',
        workspaceId: workspace.id,
        clientId: cSaland.id,
        ownerId: owner.id,
        name: 'Cuisine Saland',
        reference: 'AVRA-2026-005',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'VENTE',
        pipelineStatus: 'PROSPECT',
        priority: 'MEDIUM',
        saleAmount: 22100,
        createdAt: d(45),
      },
    }),
    // Projets SIGNÉS
    prisma.project.upsert({
      where: { id: 'proj-damont' },
      update: {},
      create: {
        id: 'proj-damont',
        workspaceId: workspace.id,
        clientId: cDamont.id,
        ownerId: owner.id,
        name: 'Cuisine Damont',
        reference: 'AVRA-2025-012',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'EN_CHANTIER',
        pipelineStatus: 'GAGNE',
        priority: 'URGENT',
        saleAmount: 38000,
        purchaseAmount: 22000,
        createdAt: d(90),
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-debuchy' },
      update: {},
      create: {
        id: 'proj-debuchy',
        workspaceId: workspace.id,
        clientId: cDebuchy.id,
        ownerId: owner.id,
        name: 'Cuisine Debuchy',
        reference: 'AVRA-2025-011',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'SIGNE',
        pipelineStatus: 'GAGNE',
        priority: 'MEDIUM',
        saleAmount: 27500,
        purchaseAmount: 16000,
        createdAt: d(105),
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-roux' },
      update: {},
      create: {
        id: 'proj-roux',
        workspaceId: workspace.id,
        clientId: cRoux.id,
        ownerId: owner.id,
        name: 'Cuisine Roux',
        reference: 'AVRA-2025-008',
        tradeType: 'CUISINISTE',
        lifecycleStatus: 'RECEPTION',
        pipelineStatus: 'GAGNE',
        priority: 'LOW',
        saleAmount: 19200,
        purchaseAmount: 11400,
        createdAt: d(150),
      },
    }),
  ]);

  const [pTurpin, pLefevre, _pBernard, _pDupont, _pSaland, pDamont, _pDebuchy, _pRoux] = projects;

  // ─── Paiements / Factures ──────────────────────────────────────────────────
  await Promise.all([
    prisma.paymentRequest.upsert({
      where: { id: 'pay-damont-acompte' },
      update: {},
      create: {
        id: 'pay-damont-acompte',
        workspaceId: workspace.id,
        projectId: pDamont.id,
        type: 'ACOMPTE',
        status: 'PAID',
        amount: 11400,
        reference: 'F-2025-042',
        dueDate: d(60),
      },
    }),
    prisma.paymentRequest.upsert({
      where: { id: 'pay-turpin-acompte' },
      update: {},
      create: {
        id: 'pay-turpin-acompte',
        workspaceId: workspace.id,
        projectId: pTurpin.id,
        type: 'ACOMPTE',
        status: 'PENDING',
        amount: 7350,
        reference: 'F-2026-043',
        dueDate: d(-7),
      },
    }),
    prisma.paymentRequest.upsert({
      where: { id: 'pay-lefevre-solde' },
      update: {},
      create: {
        id: 'pay-lefevre-solde',
        workspaceId: workspace.id,
        projectId: pLefevre.id,
        type: 'FACTURE',
        status: 'PENDING',
        amount: 18900,
        reference: 'F-2026-044',
        dueDate: d(-14),
      },
    }),
  ]);

  // ─── Événements planning ──────────────────────────────────────────────────
  // Calculer le prochain lundi
  const monday = new Date(now);
  const dayOfWeek = now.getDay() || 7;
  monday.setDate(now.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);

  const eventDate = (dayOffset: number, hour: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await Promise.all([
    prisma.event.upsert({
      where: { id: 'evt-turpin-rdv' },
      update: {},
      create: {
        id: 'evt-turpin-rdv',
        workspaceId: workspace.id,
        createdById: owner.id,
        title: 'RDV Turpin — présentation projet',
        calendarType: 'PERSONAL',
        type: 'RDV_CLIENT',
        startAt: eventDate(0, 9),
        endAt: eventDate(0, 11),
      },
    }),
    prisma.event.upsert({
      where: { id: 'evt-bernard-rdv' },
      update: {},
      create: {
        id: 'evt-bernard-rdv',
        workspaceId: workspace.id,
        createdById: owner.id,
        title: 'Visite chantier Bernard',
        calendarType: 'PERSONAL',
        type: 'VISITE_CHANTIER',
        startAt: eventDate(0, 14),
        endAt: eventDate(0, 16),
      },
    }),
    prisma.event.upsert({
      where: { id: 'evt-damont-pose' },
      update: {},
      create: {
        id: 'evt-damont-pose',
        workspaceId: workspace.id,
        createdById: owner.id,
        title: 'Damont',
        calendarType: 'GESTION',
        type: 'INSTALLATION',
        startAt: eventDate(1, 9),
        endAt: eventDate(1, 16),
      },
    }),
    prisma.event.upsert({
      where: { id: 'evt-lefevre-livraison' },
      update: {},
      create: {
        id: 'evt-lefevre-livraison',
        workspaceId: workspace.id,
        createdById: owner.id,
        title: 'Livraison Lefevre',
        calendarType: 'PERSONAL',
        type: 'LIVRAISON',
        startAt: eventDate(2, 10),
        endAt: eventDate(2, 12),
      },
    }),
    prisma.event.upsert({
      where: { id: 'evt-dupont-pose' },
      update: {},
      create: {
        id: 'evt-dupont-pose',
        workspaceId: workspace.id,
        createdById: owner.id,
        title: 'Dupont',
        calendarType: 'GESTION',
        type: 'INSTALLATION',
        startAt: eventDate(3, 9),
        endAt: eventDate(3, 16),
      },
    }),
  ]);

  // ─── Intervenants ──────────────────────────────────────────────────────────
  await Promise.all([
    prisma.intervenant.upsert({
      where: { id: 'int-poseur-1' },
      update: {},
      create: {
        id: 'int-poseur-1',
        workspaceId: workspace.id,
        type: 'POSEUR',
        name: 'Philippe Martin',
        phone: '06 10 20 30 40',
        email: 'philippe.martin@pose.fr',
      },
    }),
    prisma.intervenant.upsert({
      where: { id: 'int-elec-1' },
      update: {},
      create: {
        id: 'int-elec-1',
        workspaceId: workspace.id,
        type: 'ELECTRICIEN',
        name: 'Jean Durand',
        phone: '06 50 60 70 80',
        email: 'jean.durand@elec.fr',
      },
    }),
    prisma.intervenant.upsert({
      where: { id: 'int-plombier-1' },
      update: {},
      create: {
        id: 'int-plombier-1',
        workspaceId: workspace.id,
        type: 'PLOMBIER',
        name: 'Antonio Lopez',
        phone: '06 30 40 50 60',
        email: 'antonio.lopez@plomb.fr',
      },
    }),
  ]);

  console.log('');
  console.log('✅ Seed terminé avec succès !');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📧 Connexion démo : demo@avra.fr  /  demo123');
  console.log('  🏢 Workspace      : AVRA Design');
  console.log('  📁 8 projets créés (5 en cours, 3 signés)');
  console.log('  💳 3 factures créées');
  console.log('  📅 5 événements planning créés');
  console.log('  🔧 3 intervenants créés');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
