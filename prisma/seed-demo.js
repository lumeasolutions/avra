/**
 * AVRA — Seed complet des données démo (plain JS, sans tsx)
 * Run: node prisma/seed-demo.js
 */
const path = require('path');
const rootDir = path.join(__dirname, '..');
const fs = require('fs');

// Load .env manually
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// Find bcrypt — cherche bcryptjs dans plusieurs emplacements (Windows + Linux)
const os = require('os');
const bcryptjsPaths = [
  path.join(rootDir, 'node_modules', 'bcryptjs'),
  path.join(rootDir, 'node_modules', '.pnpm', 'bcryptjs@2.4.3', 'node_modules', 'bcryptjs'),
  'C:\\temp\\bcryptjs\\node_modules\\bcryptjs',
  path.join(os.tmpdir(), 'bcryptjs-temp', 'node_modules', 'bcryptjs'),
  '/tmp/bcryptjs-temp/node_modules/bcryptjs',
];
let bcrypt;
for (const p of bcryptjsPaths) {
  if (fs.existsSync(p)) { bcrypt = require(p); break; }
}
if (!bcrypt) {
  // Installer bcryptjs localement dans le projet
  const { execSync } = require('child_process');
  console.log('📦 Installation de bcryptjs...');
  try {
    execSync('npm install bcryptjs --no-save --prefix ' + path.join(rootDir, 'node_modules', '.bcryptjs-temp'), { stdio: 'inherit', cwd: rootDir });
    bcrypt = require(path.join(rootDir, 'node_modules', '.bcryptjs-temp', 'node_modules', 'bcryptjs'));
  } catch {
    console.error('Impossible d\'installer bcryptjs. Lance manuellement: npm install bcryptjs');
    process.exit(1);
  }
}

// Find @prisma/client
const { PrismaClient } = require(path.join(rootDir, 'node_modules', '.pnpm', '@prisma+client@5.22.0_prisma@5.22.0', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

function d(daysAgo) {
  const now = new Date();
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

function eventDate(monday, dayOffset, hour) {
  const dt = new Date(monday);
  dt.setDate(monday.getDate() + dayOffset);
  dt.setHours(hour, 0, 0, 0);
  return dt;
}

async function main() {
  console.log('🌱 Seed AVRA — données démo complètes...\n');

  // ─── Workspace ─────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'avra-demo' },
    update: { name: 'AVRA Design' },
    create: { name: 'AVRA Design', slug: 'avra-demo', plan: 'PRO' },
  });
  console.log('✓ Workspace AVRA Design créé');

  // ─── Utilisateur OWNER ────────────────────────────────────────────────────
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
  console.log('✓ Utilisateur demo@avra.fr créé (OWNER)');

  // Workspace settings
  await prisma.workspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      address: '12 rue de la Paix, 75001 Paris',
      siret: '12345678901234',
      vatRate: 20,
      currency: 'EUR',
      enableIa: true,
      enableSignature: false,
      enablePayment: true,
    },
  });

  // ─── Clients ──────────────────────────────────────────────────────────────
  const clientsData = [
    { id: 'client-turpin',  type: 'PARTICULIER',   firstName: 'Jacques', lastName: 'Turpin',  email: 'turpin@mail.fr',  phone: '06 11 22 33 44' },
    { id: 'client-lefevre', type: 'PARTICULIER',   firstName: 'Marie',   lastName: 'Lefevre', email: 'lefevre@mail.fr', phone: '06 98 77 66 55' },
    { id: 'client-bernard', type: 'PARTICULIER',   firstName: 'Paul',    lastName: 'Bernard', email: 'bernard@mail.fr', phone: '06 55 44 33 22' },
    { id: 'client-dupont',  type: 'PARTICULIER',   firstName: 'Claire',  lastName: 'Dupont',  email: 'dupont@mail.fr',  phone: '06 12 23 34 45' },
    { id: 'client-saland',  type: 'PARTICULIER',   firstName: 'Thomas',  lastName: 'Saland',  email: 'saland@mail.fr',  phone: '06 87 76 65 54' },
    { id: 'client-cholme',  type: 'PARTICULIER',   firstName: 'Isabelle',lastName: 'Cholme',  email: 'cholme@mail.fr',  phone: '06 33 44 55 66' },
    { id: 'client-marchal', type: 'PARTICULIER',   firstName: 'Henri',   lastName: 'Marchal', email: 'marchal@mail.fr', phone: '06 22 11 00 99' },
    { id: 'client-roux',    type: 'PARTICULIER',   firstName: 'Sophie',  lastName: 'Roux',    email: 'roux@mail.fr',    phone: '06 66 77 88 99' },
    { id: 'client-viola',   type: 'PARTICULIER',   firstName: 'Marc',    lastName: 'Viola',   email: 'viola@mail.fr',   phone: '06 44 55 66 77' },
    { id: 'client-damont',  type: 'PARTICULIER',   firstName: 'Luc',     lastName: 'Damont',  email: 'damont@mail.fr',  phone: '06 11 00 99 88' },
    { id: 'client-debuchy', type: 'PARTICULIER',   firstName: 'Anne',    lastName: 'Debuchy', email: 'debuchy@mail.fr', phone: '06 22 33 44 55' },
    { id: 'client-santini', type: 'PARTICULIER',   firstName: 'Carlo',   lastName: 'Santini', email: 'santini@mail.fr', phone: '06 33 22 11 00' },
    { id: 'client-persu',   type: 'PARTICULIER',   firstName: 'Elena',   lastName: 'Persu',   email: 'persu@mail.fr',   phone: '06 55 66 77 88' },
  ];

  const clients = {};
  for (const c of clientsData) {
    clients[c.id] = await prisma.client.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, workspaceId: workspace.id },
    });
  }
  console.log(`✓ ${clientsData.length} clients créés`);

  // ─── Projets ──────────────────────────────────────────────────────────────
  const projectsData = [
    // EN COURS / URGENT
    { id: 'proj-turpin',  clientId: 'client-turpin',  name: 'Cuisine Turpin',  tradeType: 'CUISINISTE', lifecycleStatus: 'VENTE',      priority: 'URGENT', pipelineStatus: 'NEGOCIATION',  saleAmount: 24500, daysAgo: 20 },
    { id: 'proj-lefevre', clientId: 'client-lefevre', name: 'Cuisine Lefevre', tradeType: 'CUISINISTE', lifecycleStatus: 'VENTE',      priority: 'URGENT', pipelineStatus: 'DEVIS_ENVOYE', saleAmount: 18900, daysAgo: 22 },
    { id: 'proj-bernard', clientId: 'client-bernard', name: 'Cuisine Bernard', tradeType: 'CUISINISTE', lifecycleStatus: 'VENTE',      priority: 'URGENT', pipelineStatus: 'PROSPECT',     saleAmount: 31200, daysAgo: 25 },
    { id: 'proj-dupont',  clientId: 'client-dupont',  name: 'Cuisine Dupont',  tradeType: 'CUISINISTE', lifecycleStatus: 'VENTE',      priority: 'MEDIUM', pipelineStatus: 'DEVIS_ENVOYE', saleAmount: 15600, daysAgo: 40 },
    { id: 'proj-saland',  clientId: 'client-saland',  name: 'Cuisine Saland',  tradeType: 'CUISINISTE', lifecycleStatus: 'VENTE',      priority: 'MEDIUM', pipelineStatus: 'PROSPECT',     saleAmount: 22100, daysAgo: 45 },
    { id: 'proj-cholme',  clientId: 'client-cholme',  name: 'Cuisine Cholme',  tradeType: 'CUISINISTE', lifecycleStatus: 'VENTE',      priority: 'MEDIUM', pipelineStatus: 'PROSPECT',     saleAmount: 19800, daysAgo: 50 },
    { id: 'proj-marchal', clientId: 'client-marchal', name: 'Cuisine Marchal', tradeType: 'CUISINISTE', lifecycleStatus: 'VENTE',      priority: 'MEDIUM', pipelineStatus: 'LEAD',         saleAmount: 14200, daysAgo: 55 },
    // FINITION
    { id: 'proj-roux',    clientId: 'client-roux',    name: 'Cuisine Roux',    tradeType: 'CUISINISTE', lifecycleStatus: 'EN_CHANTIER',priority: 'LOW',    pipelineStatus: 'GAGNE',        saleAmount: 19200, daysAgo: 150, purchaseAmount: 11400 },
    { id: 'proj-viola',   clientId: 'client-viola',   name: 'Cuisine Viola',   tradeType: 'CUISINISTE', lifecycleStatus: 'EN_CHANTIER',priority: 'LOW',    pipelineStatus: 'GAGNE',        saleAmount: 16800, daysAgo: 170, purchaseAmount: 9800 },
    // SIGNÉS
    { id: 'proj-damont',  clientId: 'client-damont',  name: 'Cuisine Damont',  tradeType: 'CUISINISTE', lifecycleStatus: 'EN_CHANTIER',priority: 'URGENT', pipelineStatus: 'GAGNE',        saleAmount: 38000, daysAgo: 90,  purchaseAmount: 22000 },
    { id: 'proj-debuchy', clientId: 'client-debuchy', name: 'Cuisine Debuchy', tradeType: 'CUISINISTE', lifecycleStatus: 'SIGNE',       priority: 'MEDIUM', pipelineStatus: 'GAGNE',        saleAmount: 27500, daysAgo: 105, purchaseAmount: 16000 },
    { id: 'proj-santini', clientId: 'client-santini', name: 'Cuisine Santini', tradeType: 'CUISINISTE', lifecycleStatus: 'SIGNE',       priority: 'MEDIUM', pipelineStatus: 'GAGNE',        saleAmount: 21000, daysAgo: 110, purchaseAmount: 12500 },
    { id: 'proj-persu',   clientId: 'client-persu',   name: 'Cuisine Persu',   tradeType: 'CUISINISTE', lifecycleStatus: 'RECEPTION',   priority: 'LOW',    pipelineStatus: 'GAGNE',        saleAmount: 18500, daysAgo: 130, purchaseAmount: 11000 },
  ];

  for (const p of projectsData) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        workspaceId: workspace.id,
        clientId: clients[p.clientId].id,
        ownerId: owner.id,
        name: p.name,
        tradeType: p.tradeType,
        lifecycleStatus: p.lifecycleStatus,
        pipelineStatus: p.pipelineStatus,
        priority: p.priority,
        saleAmount: p.saleAmount,
        purchaseAmount: p.purchaseAmount || null,
        createdAt: d(p.daysAgo),
      },
    });
  }
  console.log(`✓ ${projectsData.length} projets créés`);

  // ─── Factures / Paiements ─────────────────────────────────────────────────
  const payments = [
    { id: 'pay-damont-ac',  projectId: 'proj-damont',  type: 'ACOMPTE',  status: 'PAID',    amount: 11400, ref: 'F-2025-042', dueAgo: 60 },
    { id: 'pay-debuchy-ac', projectId: 'proj-debuchy', type: 'ACOMPTE',  status: 'PAID',    amount:  8250, ref: 'F-2025-043', dueAgo: 40 },
    { id: 'pay-turpin-ac',  projectId: 'proj-turpin',  type: 'ACOMPTE',  status: 'PENDING', amount:  7350, ref: 'F-2026-043', dueAgo:  7 },
    { id: 'pay-lefevre-f',  projectId: 'proj-lefevre', type: 'FACTURE',  status: 'PENDING', amount: 18900, ref: 'F-2026-044', dueAgo: 14 },
    { id: 'pay-santini-ac', projectId: 'proj-santini', type: 'ACOMPTE',  status: 'PAID',    amount:  6300, ref: 'F-2025-041', dueAgo: 50 },
    { id: 'pay-roux-solde', projectId: 'proj-roux',    type: 'FACTURE',  status: 'PAID',    amount: 19200, ref: 'F-2025-039', dueAgo: 90 },
    { id: 'pay-viola-ac',   projectId: 'proj-viola',   type: 'ACOMPTE',  status: 'PENDING', amount:  5040, ref: 'F-2026-045', dueAgo: -5 },
  ];

  for (const pay of payments) {
    await prisma.paymentRequest.upsert({
      where: { id: pay.id },
      update: {},
      create: {
        id: pay.id,
        workspaceId: workspace.id,
        projectId: pay.projectId,
        type: pay.type,
        status: pay.status,
        amount: pay.amount,
        providerRef: pay.ref,
        paidAt: pay.status === 'PAID' ? d(pay.dueAgo) : null,
      },
    });
  }
  console.log(`✓ ${payments.length} factures créées`);

  // ─── Événements planning ──────────────────────────────────────────────────
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);

  const events = [
    { id: 'evt-turpin-rdv',   title: 'RDV Turpin — présentation',    calendarType: 'PERSONAL', type: 'RDV_CLIENT',      day: 0, h: 9,  dh: 2 },
    { id: 'evt-bernard-rdv',  title: 'Visite chantier Bernard',       calendarType: 'PERSONAL', type: 'VISITE_CHANTIER', day: 0, h: 14, dh: 2 },
    { id: 'evt-lefevre-del',  title: 'Livraison Lefevre',             calendarType: 'PERSONAL', type: 'LIVRAISON',       day: 2, h: 10, dh: 2 },
    { id: 'evt-santini-plan', title: 'Plan tech Santini',             calendarType: 'PERSONAL', type: 'RDV_CLIENT',      day: 2, h: 14, dh: 2 },
    { id: 'evt-damont-cmd',   title: 'Commande Damont — cuisiniste',  calendarType: 'PERSONAL', type: 'AUTRE',           day: 3, h: 12, dh: 1 },
    // GESTION
    { id: 'evt-dupont-pose',  title: 'Dupont',  calendarType: 'GESTION', type: 'INSTALLATION', day: 0, h: 9,  dh: 7 },
    { id: 'evt-lefevre-pos',  title: 'Lefevre', calendarType: 'GESTION', type: 'INSTALLATION', day: 0, h: 9,  dh: 7 },
    { id: 'evt-turpin-liv',   title: 'Turpin',  calendarType: 'GESTION', type: 'LIVRAISON',    day: 1, h: 9,  dh: 4 },
    { id: 'evt-baco-elec',    title: 'Baco',    calendarType: 'GESTION', type: 'INSTALLATION', day: 1, h: 12, dh: 3 },
    { id: 'evt-baco-chant',   title: 'Baco',    calendarType: 'GESTION', type: 'REUNION',      day: 3, h: 9,  dh: 5 },
  ];

  for (const ev of events) {
    const startAt = eventDate(monday, ev.day, ev.h);
    const endAt = eventDate(monday, ev.day, ev.h + ev.dh);
    await prisma.event.upsert({
      where: { id: ev.id },
      update: {},
      create: {
        id: ev.id,
        workspaceId: workspace.id,
        createdById: owner.id,
        title: ev.title,
        calendarType: ev.calendarType,
        type: ev.type,
        startAt,
        endAt,
      },
    });
  }
  console.log(`✓ ${events.length} événements planning créés`);

  // ─── Intervenants ──────────────────────────────────────────────────────────
  const intervenants = [
    { id: 'int-poseur-1',   type: 'POSEUR',       firstName: 'Philippe',  lastName: 'Martin',  phone: '06 10 20 30 40', email: 'philippe.martin@pose.fr' },
    { id: 'int-elec-1',     type: 'ELECTRICIEN',  firstName: 'Jean',      lastName: 'Durand',  phone: '06 50 60 70 80', email: 'jean.durand@elec.fr' },
    { id: 'int-macon-1',    type: 'MACON',        firstName: 'Antonio',   lastName: 'Lopez',   phone: '06 30 40 50 60', email: 'antonio.lopez@macon.fr' },
    { id: 'int-granit-1',   type: 'CARRELEUR',    companyName: 'Petit Granit SARL',            phone: '04 93 12 34 56', email: 'contact@petitgranit.fr' },
    { id: 'int-menuisier-1',type: 'MENUISIER',    companyName: 'Robert Frères',                phone: '04 42 12 34 56', email: 'contact@robert-freres.fr' },
    { id: 'int-carreleur-1',type: 'CARRELEUR',    companyName: 'Bianchi Carrelage',            phone: '04 91 23 45 67', email: 'bianchi.carrelage@mail.fr' },
  ];

  for (const iv of intervenants) {
    await prisma.intervenant.upsert({
      where: { id: iv.id },
      update: {},
      create: { ...iv, workspaceId: workspace.id },
    });
  }
  console.log(`✓ ${intervenants.length} intervenants créés`);

  // ─── Résumé ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Seed terminé avec succès !');
  console.log('');
  console.log('  📧 Email      : demo@avra.fr');
  console.log('  🔑 Mot de passe: demo123');
  console.log('  🏢 Workspace  : AVRA Design');
  console.log(`  📁 ${projectsData.length} projets  |  ${clientsData.length} clients  |  ${payments.length} factures`);
  console.log(`  📅 ${events.length} événements  |  ${intervenants.length} intervenants`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('\n❌ Erreur seed:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
