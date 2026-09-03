import { Injectable, ExecutionContext } from '@nestjs/common';
import { WorkspaceScopedCacheInterceptor } from './workspace-scoped-cache.interceptor';

/**
 * UserScopedCacheInterceptor
 *
 * Étend le cache scopé workspace en ajoutant l'`userId` à la clé. À utiliser sur
 * les endpoints dont la réponse dépend de l'utilisateur ET pas seulement du
 * workspace — typiquement `/projects` depuis le cloisonnement vendeur : un
 * non-admin ne reçoit que SES dossiers, donc deux utilisateurs du même workspace
 * ne doivent PAS partager la même entrée de cache (sinon fuite : un vendeur
 * recevrait la liste complète mise en cache par l'OWNER, ou l'inverse).
 *
 * Fail-safe hérité : sans workspaceId → pas de cache. Sans userId non plus.
 */
@Injectable()
export class UserScopedCacheInterceptor extends WorkspaceScopedCacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const key = super.trackBy(context); // déjà `<url>::ws:<wsId>` ou undefined
    if (!key) return undefined;

    const req = context.switchToHttp().getRequest();
    const userId = req?.user?.sub ?? req?.user?.id;
    if (!userId) return undefined; // fail-safe : ne jamais cacher sans user

    return `${key}::u:${userId}`;
  }
}
