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
  }): string => {
    const contextStr = context
      ? `
Contexte utilisateur actuel (données réelles du workspace):
- Dossiers en cours: ${context.dossierCount || 0}${context.activeDossierNames && context.activeDossierNames !== 'aucun' ? ` (${context.activeDossierNames})` : ''}
- Dossiers urgents: ${context.urgentCount || 0}
- Dossiers signés: ${context.signedCount || 0}
- Factures totales: ${context.invoiceCount || 0}
- Factures en attente: ${context.pendingInvoiceCount || 0}
- Intervenants enregistrés: ${context.intervenantCount || 0}${context.activeIntervenantNames ? ` (${context.activeIntervenantNames})` : ''}
- Demandes envoyées (total): ${context.demandeCount || 0}
- Demandes en attente de réponse intervenant: ${context.demandePendingCount || 0}
- Demandes en cours d'exécution: ${context.demandeEnCoursCount || 0}
- Invitations intervenants en attente: ${context.invitationsPendingCount || 0}
      `.trim()
      : '';

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
2. Naviguer les utilisateurs vers les bonnes pages
3. Créer des dossiers clients
4. Proposer des rendus et colorisations (les images sont générées côté serveur)
5. Générer des alertes intelligentes sur les problèmes détectés
6. Expliquer le process et rassurer sur les délais
7. Aider à composer une demande adaptée (suggestion de type, titre, planification) à envoyer à un intervenant
8. Recommander d'inviter un intervenant si le workspace n'a pas le bon profil disponible

Style de communication:
- Sois professionnel mais amical
- Sois précis et factuel
- Propose de l'aide proactive
- Utilise un langage simple (évite le jargon technique)
- En français (utilise l'accent français naturel)

Ne fais JAMAIS:
- Inventer de données
- Promettre des images générées si l'utilisateur n'a pas d'API configurée
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
