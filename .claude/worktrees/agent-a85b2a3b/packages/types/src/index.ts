// ── Roles ──────────────────────────────────────────────────────────────────
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// ── JWT ────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;
  email: string;
  workspaceId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ── Pagination ─────────────────────────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ── Status Mappers ──────────────────────────────────────────────────────────
export { statusMap, reverseStatusMap } from './mappers';

// ── Prisma Enums (re-exports pour éviter prisma generate) ──────────────────
export * from './prisma-enums';
