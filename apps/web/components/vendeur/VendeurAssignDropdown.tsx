'use client';

/**
 * VendeurAssignDropdown — dropdown pour attribuer/réassigner un dossier à un
 * vendeur de l'équipe. Liste dynamique alimentée par useConfigStore.members
 * (membres actifs uniquement, rôle VENDEUR ou ADMIN — un OWNER/ADMIN peut
 * aussi être responsable de dossiers).
 *
 * Contrôle d'accès :
 *   - role 'ADMIN' / 'OWNER' (sur useAuthStore.user.role) → lecture + écriture
 *   - autres rôles (VENDEUR / POSEUR / MEMBER) → lecture seule (badge non-cliquable)
 *
 * Architecture multi-vendeur 26/05/2026.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, UserX } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveVendeurName } from '@/lib/vendeur-name';
import { VendeurBadge } from './VendeurBadge';

/** Libellé lisible du rôle (vocabulaire produit unifié : non-admin = « Vendeur »). */
function roleTag(role: string): string {
  const r = (role || '').toUpperCase();
  if (r === 'OWNER') return 'Propriétaire';
  if (r === 'ADMIN') return 'Admin';
  return 'Vendeur';
}

interface Props {
  /** Vendeur actuellement attribué (snapshot du nom). */
  currentVendeurName?: string | null;
  /**
   * Callback pour persister le changement. `vendeurName` = snapshot d'affichage,
   * `vendeurUserId` = lien structuré vers le User (Phase 2). Désassigner => les
   * deux à null.
   */
  onChange: (vendeurName: string | null, vendeurUserId: string | null) => void;
  /** Force le mode readonly (utile en preview). */
  readonly?: boolean;
  /** Affiche un placeholder spécifique quand vide ('Attribuer un vendeur…'). */
  placeholder?: string;
  /** Taille du badge. */
  size?: 'sm' | 'md';
}

export function VendeurAssignDropdown({
  currentVendeurName,
  onChange,
  readonly: forceReadonly,
  placeholder = 'Attribuer un vendeur…',
  size = 'md',
}: Props) {
  const members = useConfigStore((s) => s.members);
  const authUser = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Liste filtrée : membres actifs + rôle VENDEUR ou ADMIN (un ADMIN peut aussi
  // être responsable de dossiers ; les POSEUR sont exclus pour ne pas polluer le
  // menu). Le propriétaire (OWNER) n'est pas un « membre » config : il est ajouté
  // séparément via l'option « self » ci-dessous.
  const assignableMembers = useMemo(
    () => members.filter((m) => m.active && (m.role === 'VENDEUR' || m.role === 'ADMIN' || m.role === 'OWNER')),
    [members],
  );

  // Contrôle d'accès — seul un ADMIN/OWNER peut réassigner (les vendeurs voient
  // qui est responsable mais ne réattribuent pas). On tolère les rôles tapés
  // en string libre en uppercase.
  const role = (authUser?.role ?? '').toUpperCase();
  const canEdit = !forceReadonly && (role === 'ADMIN' || role === 'OWNER');

  const currentUserName = authUser
    ? `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim() || authUser.email
    : null;

  // Nom du vendeur pour l'utilisateur connecté, via la SOURCE UNIQUE
  // resolveVendeurName (match email non ambigu → sinon prénom+nom → sinon
  // partie locale de l'email). C'est ce même nom qui sert à `isOwnDossier`, donc
  // attribuer ce dossier « à soi » rend bien les droits d'édition. La résolution
  // non ambiguë évite que, lorsque plusieurs membres partagent l'email de
  // l'utilisateur (données de test), on renvoie un nom de membre arbitraire au
  // lieu du nom réel — ce qui empêchait l'injection de l'option « Vous ».
  const myVendeurName = useMemo<string | null>(
    () => resolveVendeurName(authUser, members) ?? null,
    [authUser, members],
  );

  // Options du menu : les membres assignables + garantie que l'utilisateur
  // connecté (souvent le propriétaire) est TOUJOURS proposé — sinon un dossier
  // qu'on lui retire ne pourrait plus lui être rendu depuis l'interface, alors
  // que l'app sait pourtant l'identifier (« Vous »). On l'ajoute en tête s'il
  // n'apparaît pas déjà via un membre.
  const options = useMemo(() => {
    const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const base: { id: string; name: string; role: string }[] = assignableMembers.map((m) => ({ id: m.id, name: m.name, role: m.role as string }));
    if (myVendeurName && !base.some((o) => norm(o.name) === norm(myVendeurName))) {
      // Fallback : l'utilisateur connecté n'est pas dans la liste hydratée.
      // On utilise son vrai userId (pour poser vendeurUserId), pas un id factice.
      base.unshift({ id: authUser?.id ?? '__self__', name: myVendeurName, role: role || 'OWNER' });
    }
    return base;
  }, [assignableMembers, myVendeurName, role]);

  // Click outside pour fermer le menu
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handlePick = (name: string | null, userId: string | null) => {
    onChange(name, userId);
    setOpen(false);
  };

  // Mode lecture seule — juste le badge, pas de chevron, pas cliquable
  if (!canEdit) {
    return (
      <div title={canEdit ? undefined : "Seul un admin peut réassigner un dossier"}>
        <VendeurBadge
          vendeurName={currentVendeurName}
          size={size}
          currentUserName={currentUserName}
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', border: '1px solid rgba(48,64,53,0.15)',
          borderRadius: 10, background: '#fff', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(166,119,73,0.5)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(48,64,53,0.15)')}
      >
        {currentVendeurName?.trim() ? (
          <VendeurBadge
            vendeurName={currentVendeurName}
            size={size}
            currentUserName={currentUserName}
          />
        ) : (
          <span style={{ fontSize: 12, color: 'rgba(48,64,53,0.55)', fontStyle: 'italic' }}>
            {placeholder}
          </span>
        )}
        <ChevronDown size={13} color="rgba(48,64,53,0.5)" />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
            minWidth: 240, maxWidth: 320,
            background: '#fff', border: '1px solid rgba(48,64,53,0.12)',
            borderRadius: 12, boxShadow: '0 12px 32px rgba(48,64,53,0.18)',
            padding: 6, animation: 'vadFadeIn 0.14s ease-out',
          }}
        >
          <style>{`
            @keyframes vadFadeIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {options.length === 0 ? (
            <p style={{
              margin: 0, padding: '10px 12px', fontSize: 11,
              color: 'rgba(48,64,53,0.55)', fontStyle: 'italic',
            }}>
              Aucun vendeur actif. Ajoutez-en dans Paramètres → Équipe.
            </p>
          ) : (
            <>
              {options.map((m) => {
                const isCurrent = m.name === currentVendeurName?.trim();
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handlePick(m.name, m.id === '__self__' ? null : m.id)}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      border: 'none', background: isCurrent ? 'rgba(166,119,73,0.08)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = 'rgba(48,64,53,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <VendeurBadge vendeurName={m.name} size="sm" currentUserName={currentUserName} />
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 4,
                      background: m.role === 'ADMIN' || m.role === 'OWNER' ? '#304035' : '#a67749', color: '#fff',
                      letterSpacing: 0,
                    }}>
                      {roleTag(m.role)}
                    </span>
                    {isCurrent && <Check size={13} color="#16a34a" />}
                  </button>
                );
              })}
              {/* Option "désassigner" si un vendeur est déjà attribué */}
              {currentVendeurName?.trim() && (
                <>
                  <div style={{ height: 1, background: 'rgba(48,64,53,0.08)', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={() => handlePick(null, null)}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                      color: '#dc2626', fontSize: 12, fontWeight: 600,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserX size={13} />
                    Désassigner
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
