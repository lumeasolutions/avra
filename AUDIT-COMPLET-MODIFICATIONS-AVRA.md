# AUDIT COMPLET - TOUTES LES MODIFICATIONS AVRA

> Consolidation des 3 documents : **AVANCEMENT AVRA.docx**, **AVANCEMENT AVRA - PARTIE DATE BUTOIRE GESTION PLANNING.docx**, **AVRA ARCHITECTURE 29-03-2026.pdf** (20 pages de maquettes)

---

## 1. INTERFACE & DESIGN GLOBAL

### 1.1 Assistant AVRA (panneau droit)
- **Toujours visible** en colonne droite sur les pages principales : Accueil, Dossiers en cours, Dossiers signés, Planning
- Sur les autres pages (Stock, Statistiques, etc.) : garder le **petit rond flottant** en bas, mais le faire **plus gros** (y compris la chouette)
- L'assistant affiche des **alertes contextuelles** en temps réel (ex: "Commande attente client Lefevre", "Plan technique manquant Dupont", "Erreur détectée relevé Santini")
- **Chat intégré** avec 3 modes : texte (clavier), vocal (micro), et icone chouette
- Le chat peut servir de **commande vocale** (ex: "sort moi la facture Turpin")

### 1.2 Bannières de page (PageHeader)
- Chaque page a un titre vert avec le **logo chouette** en transparence à droite (deja fait)
- Fond vert lisse avec **dégradé** (pas texturé)
- Contour arrondi gris de la forme verte a **changer en doré**

### 1.3 Sidebar (menu gauche)
- Les onglets sont jugés **trop petits** par le client
- **Ne pas oublier** les onglets : **E Paiement** et **E Sign**
- Logo AVRA doré a integrer (quand reçu de la graphiste)
- Enlever le **vert pixelisé** sur le nom dossier client

### 1.4 Page d'accueil (Dashboard principal)
- Comme dessiné dans le PDF (page 1) :
  - **2 colonnes** en haut : "Dossiers en cours" (gauche) + "Dossiers signés" (droite) avec badges URGENT/EN COURS/A VALIDER/FINITION
  - **Planning** en bas avec grille semaine (LUN-DIM) et créneaux horaires
  - **Assistant AVRA** a droite avec alertes
- Barre de progression : **a garder** (le client a aimé)

---

## 2. DOSSIERS EN COURS (page vente)

### 2.1 Liste des dossiers
- Affiche tous les dossiers en cours avec **badges de statut** colorés :
  - **URGENT** (rouge)
  - **EN COURS** (orange)
  - **A VALIDER** (jaune/vert)
  - **FINITION** (vert turquoise)
- Bouton **"Nouveau dossier"** en bas de liste

### 2.2 Création de dossier (Nouveau dossier)
- Formulaire avec champs : Nom, Prénom, Adresse, Adresse chantier, Code postal, TVA
- Ajouter **délais chantier** dans la création
- Ajouter **taux de TVA** dynamique (Suisse, Luxembourg, Belgique, France, etc.)
  - Ex: Luxembourg 17% mais projet en France = 20%
- Bouton "+" pour valider

### 2.3 Détail d'un dossier en cours (ex: Turpin)
- En haut : nom client + badge statut (URGENT)
- Boutons : **TABLEAU DE BORD** + **COMPARER**
- Liste des sous-dossiers selon le métier (voir section Modules Métiers)
- Chaque sous-dossier a une **date** affichée et une **icone alerte** si en retard
- Boutons en bas : **"CREER UN DEVIS"** + **"FAIRE VALIDER UN PROJET/DEVIS"**

### 2.4 Tableau de bord (popup dossier en cours)
- Popup vert foncé qui affiche pour chaque sous-dossier :
  - Nom du sous-dossier
  - **Check vert** si terminé + date de complétion
  - **Point rouge** si en retard ou manquant
- Permet de voir en un coup d'oeil l'avancement du dossier

---

## 3. DOSSIERS SIGNES

### 3.1 Liste des dossiers signés
- Meme format que dossiers en cours avec badges URGENT/EN COURS/FINITION
- **Ajouter** : validation visuelle avec la mention **"SIGNE"** en vert + la **date de signature** affichée en face (ex: "SIGNE LE 15/01/2026" en rouge/vert)

### 3.2 Détail d'un dossier signé (ex: Turpin)
- En haut : nom client + badge statut
- Boutons : **TABLEAU DE BORD** + **COMPARER** + **DATES BUTOIRES**
- Date de signature affichée en rouge
- Liste des sous-dossiers selon le métier :
  - Dossier avant vente
  - Projet version 3
  - Suivi de chantier
  - Relevé de mesures
  - Plan technique / DCE
  - Commandes (avec icone alerte)
  - Livraisons (avec icone alerte)
  - Fiche de pose
  - Permis de construire
  - SAV
  - Réception chantier

### 3.3 Tableau de bord (popup dossier signé)
- Meme principe que dossier en cours
- Montre check vert / point rouge par étape
- Ex: Suivi chantier vert 29/03/2025, Relevé mesures vert 02/04/2025, Plan technique ROUGE, Commandes ROUGE, Livraison ROUGE, Fiche pose vert 10/04/2025

### 3.4 Dates butoires (popup)
- Titre : **"ENREGISTRER DATE BUTOIRE POUR RAPPEL"**
- Pour chaque sous-dossier du dossier signé :
  - Nom du sous-dossier
  - Flèches gauche/droite pour naviguer les dates
  - Date sélectionnée (ex: 29/03/2026)
  - Icone calendrier pour date picker
- Certains sous-dossiers ont un bouton **"ACCEDER"** au lieu d'une date (Commandes, Livraison)
- Les dates butoires sont **obligatoires** pour accéder au dossier signé, mais **modifiables après**

---

## 4. DATES BUTOIRES & RELANCES (système intelligent)

### 4.1 Relances automatiques
- Quand une date butoire est enregistrée : **relance automatique chaque semaine** tant qu'aucune action n'est faite
- Dossiers vente : si pas de dépot sous **2 semaines** -> relance AVRA
- Après commande : confirmation max **1 semaine**, sinon relance
- Règle : **2 commandes = 2 confirmations** (pas de raccourci)

### 4.2 Commandes (sous-page dates butoires)
- Titre : **COMMANDES**
- Liste de marques/fournisseurs avec pour chacun :
  - Icone loupe (recherche)
  - Flèches navigation
  - Nom (LEICHT, MSA, COJER, MARBRIER...)
  - Date butoire avec flèches + calendrier
- Bouton **"+"** pour ajouter une marque
- **Important** : dans la recherche (loupe), pouvoir sélectionner une **liste de marques** ET une **liste d'artisans**

### 4.3 Livraisons (sous-page dates butoires)
- Meme structure que Commandes
- Liste par catégorie : CUISINE, ELECTRO, GRANIT, MSA...
- Chaque ligne a : loupe + flèches + nom + date butoire + calendrier
- Bouton "+" pour ajouter
- Meme logique de recherche que Commandes (marques + artisans)

### 4.4 SAV
- Aujourd'hui impossible de mettre une date butoire -> **a corriger**
- Intégrer une sous-partie **"commande et confirmation"** dans le dossier SAV

### 4.5 Dates butoires par métier

**Architectes d'intérieur :**
- Avec date butoire : Permis de construire, DCE, Marché/signatures, Suivi de chantier
- Sans date butoire : Dossier modifications/SAV
- Bouton "ACCEDER" : Commandes fournisseurs, Confirmations/factures achats, Livraisons

**Menuisiers :**
- Avec date butoire : Relevé sur mesure, Débit/liste matériaux, Fiche de pose
- Sans date butoire : Dossier modifications/SAV
- Bouton "ACCEDER" : Commandes fournisseurs, Fabrication, Livraisons

**Cuisinistes / Agenceurs :**
- Avec date butoire : Relevé définitif, Plans techniques, Fiche de pose
- Sans date butoire : SAV
- Bouton "ACCEDER" : Commandes, Confirmations/factures achats, Livraisons

---

## 5. PLANNING

### 5.1 Planning standard (vue semaine)
- Grille LUN-DIM avec créneaux horaires (9:00 - 21:00)
- Flèches gauche/droite pour naviguer les semaines
- Événements colorés par type :
  - **Bleu** : RDV client (Dupont, Bernard)
  - **Orange/marron** : Livraisons (Livraison Santini)
  - **Violet clair** : Plan technique (Plan tech Damont)
  - **Rose/bleu** : Commandes (Commande Persu)
  - **Rouge** : Urgent (Turpin)
  - **Vert clair** : Fiche livraison
- Types d'interventions différents selon le métier

### 5.2 Planning gestion (vue condensée)
- Meme grille semaine mais avec **blocs plus grands**
- Chaque bloc contient le type + nom client en vertical
- Couleurs par type d'intervention : Pose cuisine (bleu), Granit (marron), Livraison (orange), Electricien (violet), Réunion chantier (jaune)
- En bas a gauche : **Dossier avant vente** avec devis listés + loupe recherche

### 5.3 Types d'intervention (cuisiniste)
- Poseur, Plombier, Électricien, Plaquiste, Livreur, Marbrier

### 5.4 Types d'intervention (général)
- Maçon, Plâtrier, Menuisier, Ébéniste, Agenceur, Charpentier, Carreleur, Parqueteur, Peintre bâtiment, Enduiseur, Façadier, Chauffagiste, Climaticien, Frigoriste, Installateur domotique, Technicien VMC, Serrurier, Ferronnier, Menuisier aluminium/PVC, Miroitier, Tapissier

### 5.5 Liste intervenants
- A afficher a droite du planning
- Possibilité d'ajouter un **type d'intervention manuel** (ex: charpente)

---

## 6. STOCK

- **Barre de recherche** en haut
- **Filtres** : Fournisseur, Electro, Meubles, Déco, Sanitaire, Noir, Laiton, Doré, Inox
- **Tableau produits** avec colonnes : Photo, Fournisseur, Modèle, Prix Achat, Prix Vente
- **Disponibilité** par pastille couleur : vert (dispo), orange (limité), rouge (indispo)
- **Photos obligatoires** par référence
  - Possibilité connexion internet pour récupérer photo
  - Sinon paramétrage manuel
- **Tri** : alphabétique, dernier enregistré, disponibilité
- Bouton **"SORTIR FORMAT EXCEL"** pour export Excel (obligatoire)

---

## 7. IA PHOTO REALISME

- Zone de saisie texte avec guillemets (prompt)
  - Ex: "Fais moi une perspective réaliste de la cuisine du projet Turpin en façades noires"
- Bouton **"+"** pour uploader des fichiers (PDF, JPEG, PNG acceptés)
- **Loading** avec animation chouette pendant la génération
- Résultat : image photo-réaliste affichée
- Bouton **"RAJOUTER DANS LE DOSSIER TURPIN"** pour sauvegarder dans le dossier client

### 7.1 IA Colorimétrie (extension)
- Choix façade
- Ajout texture extérieure
- Ajouter finitions : miroir / verre mat
- Possibilités : changer couleur, changer finition, ou les deux

---

## 8. STATISTIQUES

### 8.1 Tableau principal (3 onglets : Tableau 1, 2, 3)
- Colonnes : STATUT, DOSS (nombre), ACHAT HT, VENTE HT, MARGE HT, MARGE %
- Lignes par statut :
  - **VENDU** (vert) : 25 dossiers, 125 000, 312 500, 187 500, 60%
  - **EN COURS** (orange) : 15 dossiers, 75 000, 187...
  - **PERDU** (rouge) : 10 dossiers, 50 000, 125...
- **Graphique camembert** en bas : 45% vendu, 25% en cours, 30% perdu

### 8.2 Popup "Statistiques manquants"
- Liste des dossiers dont il manque les **prix achat/prix vente**
- Bouton "+" pour compléter chaque dossier
- Message IA si manque info : **"statistiques non disponibles"**

### 8.3 Détail dossier (popup depuis stats)
- Ex: DOSSIER TURPIN
- Affiche : Dossier avant vente (Devis n1253, Devis n5986)
- Confirmations validées (Confirmation LEICHT 5986, Confirmation LAPALMA 5945)
- C'est le dossier **"confirmations validées"** qui alimente les stats
- Note : électro payé client -> pas dans les stats

---

## 9. MODULES METIERS (sous-dossiers par profession)

### 9.1 Architectes d'intérieur

**Dossier vente :**
- Fiche de renseignement
- Relevé de mesure / état des lieux
- APS (duplicable)
- APD (duplicable)

**Dossier signé :**
- Avant vente
- Permis de construire
- DCE
- Marché / signatures
- Commandes fournisseurs
- Confirmations / factures achats fournisseurs
- Livraison
- Suivi de chantier
- Dossier modifications
- Réception SAV

### 9.2 Menuisiers

**Dossier vente :**
- Fiche renseignement
- Relevé de mesure / photos existant
- Projet 1 (sous-dossier)
- Projet 2
- Projet 3
- Projet 4

**Dossier signé :**
- Avant vente
- Relevé sur mesure
- Débit / liste matériaux
- Fabrication
- Lancement
- Commandes fournisseurs
- Fiche de pose
- Livraison
- Modifications
- SAV

### 9.3 Cuisinistes / Agenceurs

**Dossier vente :**
- Fiche de renseignement
- Relevé de mesure + photos
- Option 1
- Option 2 (duplicable avec sous-dossiers)

**Dossier signé :**
- Avant vente
- Relevé définitif
- Plan technique
- Commande
- Confirmations / factures achats
- Livraison
- Fiche de pose
- SAV

---

## 10. FONCTIONNALITES GENERALES

- **Note par dossier** : ajout possible (le client a aimé)
- **Fenêtre rendez-vous** : validée par le client
- **Urgence** : point d'exclamation + notification (voir architecture CANVA)
- **Confirmations validées** : ajouter ce sous-dossier dans chaque dossier signé
- **Bouton COMPARER** : dans les dossiers signés, permet de comparer les versions

---

## 11. DEVIS (obligations légales)

### Entreprise :
- Nom, Adresse, SIRET, TVA intracom, Statut juridique, Coordonnées

### Client :
- Nom, Adresse, Coordonnées

### Devis :
- Numéro, Date, Validité

### Prestations :
- Désignation, Quantité, Prix HT, Total HT

### Totaux :
- HT, TVA, TTC

### Paiement :
- Acompte, Modalités, Délais

### Mentions :
- Bon pour accord + signature, Date

### Autres :
- Délai exécution, Conditions annulation, Pénalités retard, Réserve propriété, Frais supplémentaires
- TVA non applicable art 293B (si applicable)

---

## 12. DOSSIER ADMINISTRATIF

1. **Documents entreprise** : Kbis, SIRET, Statuts, Assurances
2. **Comptabilité** : Factures clients, Factures fournisseurs, TVA, Bilans
3. **Juridique** : Contrats clients, Contrats partenaires, CGV
4. **RH** : Contrats, Fiches de paie, Notes de frais
5. **Charges** : Loyer, Logiciels, Assurances, Fournisseurs, Autres
6. **Impayés** : Factures, Relances, Procédures
7. **Fiscal** : Impôts, Déclarations, Échéances
8. **Banque** : Comptes, Prêts, Leasing

---

## 13. COMPTABILITE

- Module **externe** (chaque client garde son logiciel compta)
- MAIS : **stockage factures** dans le dossier administratif
- **Commande vocale** possible : "sort moi la facture Turpin"

---

## 14. SECURITE & GESTION UTILISATEURS

- **Double stockage réseau** obligatoire
- **E-boutique** liée au stock
- **Gestion des rôles** :
  - Administrateur : accès total
  - Vendeurs : accès limité
- **Restrictions** :
  - Dossiers admin : visibles uniquement par admin
  - Dossiers projets : visibles par tous, modifiables uniquement par le créateur, ajout autorisé par tous
  - Ex: Dossier TURPIN fait par Cassandra -> visible par Sylvie -> non modifiable par Sylvie

---

## 15. E PAIEMENT & E SIGN
- Onglets a ne pas oublier dans la sidebar
- Détails a définir

---

## 16. RECAPITULATIF DES PRIORITES

### Critique (structure de l'app) :
1. Page d'accueil avec les 2 colonnes dossiers + planning + assistant
2. Modules métiers par profession (architecte, menuisier, cuisiniste)
3. Système de dates butoires avec relances automatiques
4. Tableau de bord par dossier (check vert/rouge)

### Important (fonctionnalités clés) :
5. Commandes & Livraisons avec recherche marques + artisans
6. Statistiques avec détection manquants
7. Stock avec photos, filtres, export Excel
8. Planning avec types d'intervention par métier
9. IA Photo réalisme avec sauvegarde dossier

### A intégrer :
10. Dossier administratif complet (8 catégories)
11. Devis avec toutes les mentions légales
12. Gestion utilisateurs et permissions
13. SAV avec dates butoires
14. Assistant AVRA toujours visible sur pages principales
15. E Paiement + E Sign
