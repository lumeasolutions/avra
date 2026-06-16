/**
 * Prompts et templates pour l'IA
 * Centralisés ici pour faciliter les ajustements et A/B testing
 */

export const SYSTEM_PROMPTS = {
  /**
   * Assistant principal pour le chat AVRA
   * Contextualisé pour le métier cuisiniste
   */
  ASSISTANT: (context?: {
    dossierCount?: number;
    urgentCount?: number;
    invoiceCount?: number;
    pendingInvoiceCount?: number;
    signedCount?: number;
    activeDossierNames?: string;
    // Phase 7 — contexte demandes/intervenants
    intervenantCount?: number;
    activeIntervenantNames?: string;
    demandeCount?: number;
    demandePendingCount?: number;
    demandeEnCoursCount?: number;
    invitationsPendingCount?: number;
    // Volet 6 (06/2026) — contexte enrichi (details, pas seulement compteurs)
    unpaidInvoicesText?: string;
    unpaidTotalEUR?: number;
    upcomingEventsText?: string;
    stockRuptureText?: string;
    demandesWaitingText?: string;
    // Volet 2 (28/05/2026) — personnalite choisie dans Parametres → IA
    personnalite?: 'professionnel' | 'amical' | 'concis';
  }): string => {
    // Volet 3 (28/05/2026) : chaque ligne n'est incluse que si la donnee est
    // fournie (!== undefined). Le controller passe undefined pour les categories
    // dont l'acces est desactive dans Parametres → IA, donc l'IA ne voit que ce
    // que l'utilisateur autorise.
    const lines: string[] = [];
    if (context?.dossierCount !== undefined)
      lines.push(`- Dossiers en cours: ${context.dossierCount}${context.activeDossierNames && context.activeDossierNames !== 'aucun' ? ` (${context.activeDossierNames})` : ''}`);
    if (context?.urgentCount !== undefined)
      lines.push(`- Dossiers urgents: ${context.urgentCount}`);
    if (context?.signedCount !== undefined)
      lines.push(`- Dossiers signés: ${context.signedCount}`);
    if (context?.invoiceCount !== undefined)
      lines.push(`- Factures totales: ${context.invoiceCount}`);
    if (context?.pendingInvoiceCount !== undefined)
      lines.push(`- Factures en attente: ${context.pendingInvoiceCount}`);
    if (context?.intervenantCount !== undefined)
      lines.push(`- Intervenants enregistrés: ${context.intervenantCount}${context.activeIntervenantNames ? ` (${context.activeIntervenantNames})` : ''}`);
    if (context?.demandeCount !== undefined)
      lines.push(`- Demandes envoyées (total): ${context.demandeCount}`);
    if (context?.demandePendingCount !== undefined)
      lines.push(`- Demandes en attente de réponse intervenant: ${context.demandePendingCount}`);
    if (context?.demandeEnCoursCount !== undefined)
      lines.push(`- Demandes en cours d'exécution: ${context.demandeEnCoursCount}`);
    if (context?.invitationsPendingCount !== undefined)
      lines.push(`- Invitations intervenants en attente: ${context.invitationsPendingCount}`);
    // Volet 6 : detail enrichi — l'assistant peut citer montants, dates, noms.
    if (context?.unpaidInvoicesText)
      lines.push(`- Factures impayées / en retard: ${context.unpaidInvoicesText}`);
    if (context?.unpaidTotalEUR !== undefined)
      lines.push(`- Total à recouvrer: ${Math.round(context.unpaidTotalEUR)}€`);
    if (context?.upcomingEventsText)
      lines.push(`- RDV / interventions à venir: ${context.upcomingEventsText}`);
    if (context?.stockRuptureText)
      lines.push(`- Articles en rupture de stock: ${context.stockRuptureText}`);
    if (context?.demandesWaitingText)
      lines.push(`- Demandes en attente de réponse: ${context.demandesWaitingText}`);
    const contextStr = lines.length > 0
      ? `\nContexte utilisateur actuel (données réelles du workspace):\n${lines.join('\n')}`.trim()
      : '';

    // Volet 2 : bloc "Style de communication" pilote par la personnalite.
    const toneBlock = (() => {
      switch (context?.personnalite) {
        case 'amical':
          return `Style de communication:
- Sois chaleureux, humain et encourageant
- Tutoie-toi un ton convivial sans etre familier a l'exces
- Reste precis et factuel, propose de l'aide proactive
- En français naturel`;
        case 'concis':
          return `Style de communication:
- Va droit au but, reponses courtes et efficaces
- Pas de fioritures ni de formules de politesse longues
- Donne l'essentiel en 1 a 3 phrases maximum quand c'est possible
- En français`;
        case 'professionnel':
        default:
          return `Style de communication:
- Sois professionnel mais amical
- Sois précis et factuel
- Propose de l'aide proactive
- Utilise un langage simple (évite le jargon technique)
- En français (utilise l'accent français naturel)`;
      }
    })();

    return `Tu es AVRA, l'assistant IA intelligent d'une plateforme de gestion pour cuisinistes, menuisiers et architectes d'intérieur.

Tu as une expertise complète sur :
- La gestion des dossiers clients (projets de cuisine, agencement, menuiserie)
- Les rendus photoréalistes 3D pour présentations clients
- La gestion du planning et des interventions
- La facturation et suivi des paiements
- L'analyse de photos pour colorisation et propositions de design
- Les alertes intelligentes sur les dossiers urgents
- La gestion des intervenants (poseurs, électriciens, maçons, plombiers, etc.)
- Les demandes typées (POSE, LIVRAISON, SAV, MESURE, DEVIS, CONFIRMATION_COMMANDE, COMPLEMENT)
- Le suivi du workflow des demandes (ENVOYEE → VUE → ACCEPTEE/REFUSEE → EN_COURS → TERMINEE)
- Les invitations intervenants (process d'onboarding)

${contextStr}

Tes responsabilités:
1. Répondre aux questions sur les dossiers, factures, planning, demandes, intervenants
2. Emmener les utilisateurs vers les bonnes pages (outil navigate)
3. Créer des dossiers clients, devis et factures (outils dédiés, voir ci-dessous)
4. Proposer des rendus et colorisations (les images sont générées côté serveur)
5. Générer des alertes intelligentes sur les problèmes détectés
6. Expliquer le process et rassurer sur les délais
7. Aider à composer une demande adaptée (suggestion de type, titre, planification) à envoyer à un intervenant
8. Recommander d'inviter un intervenant si le workspace n'a pas le bon profil disponible

Actions (outils):
- Quand l'utilisateur demande EXPLICITEMENT de créer un dossier/devis/facture,
  de planifier un RDV (create_event), d'envoyer une demande à un intervenant
  (create_demande) ou d'aller sur une page, APPELLE l'outil correspondant pour
  PROPOSER l'action.
- Tu ne fais que proposer : l'utilisateur valide ensuite d'un clic (carte de
  confirmation) avant toute création réelle. Inutile de redemander « voulez-vous
  confirmer ? » : la confirmation se fait dans l'interface.
- N'appelle un outil que si tu as les infos minimales. Pour un dossier, le NOM
  du client est obligatoire : s'il manque, demande-le, n'invente rien.
- Pour un devis/facture, ne renseigne des lignes/montants QUE si l'utilisateur
  les a précisés. Sinon laisse-les vides : un brouillon sera ouvert pour édition.
- Si un outil n'est pas disponible (action désactivée dans les Paramètres),
  explique-le simplement et propose de guider l'utilisateur à la main.

${toneBlock}

Ne fais JAMAIS:
- Inventer des données (noms, montants, prix, dates)
- Promettre des images générées si l'utilisateur n'a pas d'API configurée
- Créer/modifier quoi que ce soit sans passer par un outil de proposition
- Dépasser tes limites de rôle
- Utiliser un ton agressif ou déprimant`;
  },

  /**
   * Analyse de dossier
   */
  ANALYZE_DOSSIER: (dossierData: {
    name: string;
    client?: string;
    status?: string;
    description?: string;
    createdAt?: string;
  }): string => {
    return `Analyse ce dossier client cuisiniste et propose un résumé exécutif:
Nom: ${dossierData.name}
Client: ${dossierData.client || 'Non spécifié'}
Statut: ${dossierData.status || 'Actif'}
Description: ${dossierData.description || 'Aucune'}
Créé le: ${dossierData.createdAt || 'Date inconnue'}

Propose:
1. Un résumé court (2 lignes)
2. Les prochaines étapes recommandées
3. Potentiels risques ou points d'attention`;
  },

  /**
   * Génération d'alertes
   */
  SUGGEST_ALERTS: (data: {
    dossiers: Array<{ name: string; lifecycleStatus?: string; updatedAt?: any }>;
    invoices: Array<{ id: string; status: string; amount?: any }>;
    schedule?: Array<{ title: string; startAt?: any }>;
  }): string => {
    return `Tu es expert en alertes intelligentes. Analyse ce workspace et propose des alertes essentielles:

Dossiers: ${JSON.stringify(data.dossiers)}
Factures: ${JSON.stringify(data.invoices)}
Planning: ${JSON.stringify(data.schedule || [])}

Pour chaque alerte proposée, utilise ce format exact:
[SEVERITY:error|warning|info|clock] Message court et actionnable

Maximum 5 alertes. Sois pertinent et évite les alertes triviales.`;
  },
};

export const IMAGE_PROMPTS = {
  /**
   * Génération de rendu photoréaliste
   */
  REALISTIC_RENDER: (params: {
    facades: string;
    planTravail: string;
    style: string;
    lightingStyle: string;
    roomSize: string;
  }): string => {
    return `Génère un rendu 3D photoréaliste d'une cuisine moderne avec:
- Façades: ${params.facades}
- Plan de travail: ${params.planTravail}
- Style: ${params.style}
- Éclairage: ${params.lightingStyle}
- Taille pièce: ${params.roomSize}

Caractéristiques recherchées:
- Haute qualité, détails réalistes
- Perspective professionnelle (légèrement en plongée)
- Éclairage naturel et ambiant cohérent
- Matériaux et finitions crédibles
- Composition harmonieuse et attrayante`;
  },

  /**
   * Colorisation/Modification de cuisine
   */
  COLORIZE_KITCHEN: (params: {
    facadeHex: string;
    poigneeHex: string;
    planHex: string;
    facadeFinish: string;
    lightingStyle: string;
    handleMaterial?: string;
    countertopMaterial?: string;
  }): string => {
    return `Modifie cette cuisine avec les couleurs et finitions suivantes:
- Façades: ${params.facadeHex} (${params.facadeFinish})
- Poignées: ${params.poigneeHex} (${params.handleMaterial || 'standard'})
- Plan de travail: ${params.planHex} (${params.countertopMaterial || 'standard'})
- Éclairage: ${params.lightingStyle}

Contraintes:
- Conserve les proportions exactes
- Modifie uniquement les couleurs et finitions
- Respecte la cohérence des matériaux
- Assure que les couleurs s'harmonisent
- Préserve les détails architecturaux`;
  },
};

/**
 * Messages d'erreur utilisateur-friendly
 */
export const ERROR_MESSAGES = {
  API_UNAVAILABLE:
    "L'API IA n'est pas disponible pour le moment. Utilisation du mode dégradé.",
  IMAGE_GENERATION_FAILED:
    "La génération d'image a échoué. Veuillez réessayer avec des paramètres différents.",
  CHAT_TIMEOUT: 'La réponse met trop de temps. Veuillez réessayer.',
  INVALID_INPUT: 'Paramètres invalides. Veuillez vérifier votre saisie.',
};

/**
 * Messages de fallback en mode mock
 */
export const MOCK_RESPONSES: Record<string, string> = {
  GREETING:
    'Bonjour! Je suis en mode simulation. Configurez les clés API pour activer le vrai mode IA.',
  HELP:
    'Je peux vous aider sur: dossiers clients, factures, planning, génération d\'images 3D. Posez une question!',
  DEFAULT: 'Mode simulation actif. Réponse fictive basée sur les mots-clés détectés.',
};
