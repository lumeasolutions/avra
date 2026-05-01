-- HIGH-4: refresh tokens become signed JWTs { sub, jti }.
-- Only the bcrypt hash of `jti` is stored server-side, replacing the legacy
-- bcrypt(refreshToken) approach. Legacy columns (`refreshToken`,
-- `refreshTokenExpiresAt`) are kept for ~30 days for backward compatibility
-- with already-issued refresh tokens (silent migration on next /auth/refresh).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "refreshTokenJtiHash" VARCHAR(120);
