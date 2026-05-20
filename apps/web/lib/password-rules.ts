/**
 * Règles de complexité du mot de passe AVRA.
 *
 * IMPORTANT : cette liste DOIT rester strictement alignée avec les
 * validators class-validator du back-end (cf. apps/api/src/modules/auth/dto/
 * register.dto.ts et reset-password.dto.ts). Toute divergence ferait
 * passer le formulaire côté front mais retourner 400 côté back, expérience
 * casseuse pour l'utilisateur.
 *
 * Règles :
 *   - 12 caractères minimum (max 72 pour ne pas être tronqué par bcrypt)
 *   - au moins une lettre minuscule
 *   - au moins une lettre MAJUSCULE
 *   - au moins un chiffre
 *   - au moins un caractère spécial
 */

export interface PasswordRule {
  /** Identifiant stable (utilisable comme React key). */
  id: string;
  /** Libellé affiché à l'utilisateur. */
  label: string;
  /** Test : true = règle satisfaite. */
  test: (pwd: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'Au moins 12 caractères',
    test: (p) => p.length >= 12 && p.length <= 72,
  },
  {
    id: 'lowercase',
    label: 'Une lettre minuscule (a-z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'uppercase',
    label: 'Une lettre MAJUSCULE (A-Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'number',
    label: 'Un chiffre (0-9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: "Un caractère spécial (!@#$%…)",
    // Regex alignée avec @Matches dans RegisterDto / ResetPasswordDto
    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

export interface PasswordEvaluation {
  /** Pour chaque règle : satisfaite ou non. */
  rules: { id: string; label: string; ok: boolean }[];
  /** Toutes les règles passent. */
  allValid: boolean;
  /** Nombre de règles satisfaites (0..PASSWORD_RULES.length). */
  satisfiedCount: number;
  /** Score 0-5 utilisable pour barre de force. */
  strength: 0 | 1 | 2 | 3 | 4 | 5;
  /** Libellé de force utilisateur. */
  strengthLabel: string;
  /** Couleur hex de la barre de force. */
  strengthColor: string;
}

export function evaluatePassword(pwd: string): PasswordEvaluation {
  const rules = PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(pwd) }));
  const satisfiedCount = rules.filter((r) => r.ok).length;
  const allValid = satisfiedCount === PASSWORD_RULES.length;

  // Mapping : 0 si vide, sinon 1..5 selon le nombre de règles satisfaites
  const strength = (pwd.length === 0 ? 0 : satisfiedCount) as 0 | 1 | 2 | 3 | 4 | 5;
  const strengthLabel = ['', 'Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'][strength];

  return { rules, allValid, satisfiedCount, strength, strengthLabel, strengthColor };
}

/**
 * Message d'erreur unique condensant les règles manquantes — pratique
 * pour un setError() compact si on ne veut pas afficher la checklist.
 */
export function getMissingRulesMessage(pwd: string): string | null {
  const evalResult = evaluatePassword(pwd);
  if (evalResult.allValid) return null;
  const missing = evalResult.rules.filter((r) => !r.ok).map((r) => r.label.toLowerCase());
  return `Mot de passe insuffisant : ${missing.join(', ')}.`;
}
