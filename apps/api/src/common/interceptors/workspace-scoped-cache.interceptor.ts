import { Injectable, ExecutionContext } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

/**
 * WorkspaceScopedCacheInterceptor
 *
 * Le `CacheInterceptor` par défaut indexe les réponses GET sur l'URL SEULE.
 * Deux workspaces différents qui appellent la même URL (`/stats/global`,
 * `/clients`, `/stock`, `/projects`, `/orders`…) partagent donc la même entrée
 * de cache → FUITE DE DONNÉES CROSS-TENANT (le premier appelant remplit le
 * cache, les autres reçoivent ses données pendant le TTL).
 *
 * Ici on suffixe la clé avec le `workspaceId` authentifié. Si aucun workspace
 * n'est présent sur la requête, on désactive le cache (fail-safe) pour ne
 * jamais servir une réponse non scopée.
 *
 * NB : l'interceptor s'exécute APRÈS les guards (JwtAuthGuard), donc
 * `req.user.workspaceId` est déjà renseigné au moment du `trackBy`.
 */
@Injectable()
export class WorkspaceScopedCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const key = super.trackBy(context);
    if (!key) return undefined;

    const req = context.switchToHttp().getRequest();
    const workspaceId = req?.user?.workspaceId;
    if (!workspaceId) return undefined; // fail-safe : ne jamais cacher non scopé

    return `${key}::ws:${workspaceId}`;
  }
}
