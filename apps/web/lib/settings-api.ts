/**
 * settings-api.ts — Persistance backend de la config UI (société, facturation,
 * numérotation, relances, alertes, préférences, IA).
 *
 * Le backend stocke le bloc tel quel dans WorkspaceSettings.extra. Le front
 * reste la source de vérité de la forme : on envoie/relit l'objet complet.
 */
import { api } from './api';

export interface SettingsConfig {
  preferences?: Record<string, unknown>;
  numerotation?: Record<string, unknown>;
  facturationConfig?: Record<string, unknown>;
  notifConfig?: Record<string, unknown>;
  societe?: Record<string, unknown>;
  relanceConfig?: Record<string, unknown>;
  alertesConfig?: Record<string, unknown>;
  iaConfig?: Record<string, unknown>;
}

export const getSettings = () => api<{ config: SettingsConfig | null }>('/settings');

export const saveSettings = (config: SettingsConfig) =>
  api<{ ok: boolean }>('/settings', { method: 'PUT', body: JSON.stringify({ config }) });
