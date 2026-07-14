/**
 * settings-api.ts — Persistance backend de la config UI (société, facturation,
 * numérotation, relances, alertes, préférences, IA).
 *
 * Le backend stocke le bloc tel quel dans WorkspaceSettings.extra. Le front
 * reste la source de vérité de la forme : on envoie/relit l'objet complet.
 */
import { api } from './api';

// Champs typés `any` à dessein : on y range les interfaces de config du store
// (PreferencesConfig, Societe, …) qui, étant des interfaces nommées sans
// signature d'index, ne sont pas assignables à `Record<string, unknown>`.
export interface SettingsConfig {
  preferences?: any;
  numerotation?: any;
  facturationConfig?: any;
  notifConfig?: any;
  societe?: any;
  relanceConfig?: any;
  alertesConfig?: any;
  iaConfig?: any;
  /** Code PIN à 4 chiffres du Dossier administratif (synchronisé au compte). */
  adminDocsPin?: string | null;
}

export const getSettings = () => api<{ config: SettingsConfig | null }>('/settings');

export const saveSettings = (config: SettingsConfig) =>
  api<{ ok: boolean }>('/settings', { method: 'PUT', body: JSON.stringify({ config }) });
