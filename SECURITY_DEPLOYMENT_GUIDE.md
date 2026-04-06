# Security Fixes Phase 2 - Quick Deployment Guide

## Pre-Deployment Checklist

- [ ] Review SECURITY_FIXES_PHASE2.md
- [ ] Verify no breaking changes in your environment
- [ ] Test in development environment first
- [ ] Backup current API code
- [ ] Schedule downtime if needed (typically not required)

---

## Installation Steps

### 1. Pull Latest Code

```bash
git pull origin main
cd apps/api
```

### 2. Install Dependencies (if any new)

```bash
npm install
# or
yarn install
```

### 3. Build the Project

```bash
npm run build
# or
yarn build
```

### 4. Verify No Compilation Errors

```bash
npm run lint
# or
yarn lint
```

---

## Running Tests

### Unit Tests

```bash
npm test
# or
yarn test
```

### Security Tests

```bash
# Test rate limiting (should fail after 5 attempts in 15 min)
for i in {1..6}; do curl -X POST http://localhost:3001/api/auth/login; sleep 1; done

# Test CSRF protection (should fail without token)
curl -X POST http://localhost:3001/api/documents -H "Content-Type: application/json" -d '{}'
# Response: 403 Forbidden - Missing CSRF token

# Test path traversal protection (should fail)
curl http://localhost:3001/api/documents/upload -F "file=@../../../etc/passwd"
# Response: 400 Bad Request - Path traversal detected
```

---

## Environment Variables

### Required (Already in .env)

```env
NODE_ENV=production
PORT=3001
UPLOAD_DIR=/tmp/uploads
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
DATABASE_URL=postgresql://...
```

### Optional (New Security Features)

```env
# Logging verbosity
DEBUG=false
VERBOSE=false

# GDPR settings (optional)
GDPR_STRICT_MODE=true
```

---

## Startup

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run start:prod
```

### Docker

```bash
docker build -t avra-api .
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e UPLOAD_DIR=/app/uploads \
  avra-api
```

---

## Key Changes by Component

### 1. Authentication (Rate Limiting)

**Endpoint:** `POST /api/auth/login`
- Limit: 5 requests per 15 minutes per IP
- Applies to both login and register

**Testing:**
```bash
# Should work
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# After 5 requests in 15 minutes, should return 429
# Response: Too Many Requests
```

---

### 2. File Uploads (Path Traversal Protection)

**Endpoint:** `POST /api/documents`
- Prevents `../` directory traversal
- Validates storage keys
- Blocks null bytes and suspicious characters

**Validation Rules:**
- ✅ Alphanumeric, dash, underscore, dot only
- ✅ No `/` or `\` characters
- ✅ No null bytes (`\0`)
- ✅ Must stay in upload directory

---

### 3. CSRF Protection

**New Endpoint:** `GET /api/security/csrf-token`
- Returns CSRF token for client
- Token valid for 24 hours
- One-time use after validation

**Usage in Frontend:**
```javascript
// 1. Get CSRF token
const tokenRes = await fetch('/api/security/csrf-token');
const { token } = await tokenRes.json();

// 2. Include in requests
fetch('/api/documents', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ title: 'My Document' })
});
```

---

### 4. Logging (Data Sanitization)

**Changes:**
- Passwords → `***REDACTED***`
- Tokens → `Bearer ***REDACTED***`
- Emails → `u***@domain.com`
- Credit cards → `****-****-****-****`
- IPs → `192.168.1.***`

**No User Action Required** - Automatic in all logs

---

### 5. Permissions (RBAC)

**Roles:**
- `ADMIN` - Full access
- `MANAGER` - Can manage projects/documents
- `EDITOR` - Can create/edit documents
- `VIEWER` - Read-only

**Permission Enforcement:**
- Per-endpoint using `@Permission()` decorator
- Workspace isolation
- Returns 403 if unauthorized

**Testing:**
```bash
# VIEWER tries to create document (should fail)
curl -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer viewer_token" \
  # Response: 403 Forbidden - Insufficient permissions
```

---

### 6. GDPR IP Anonymization

**Changes:**
- IPs are hashed before storing in DB
- IPv4: `192.168.1.***` (last octet hashed)
- IPv6: Supported with last 64 bits hashed
- Private IPs: Not logged
- Consent checking via cookie

**Audit Table:**
```sql
SELECT "ipAddress" FROM "AuditLog" LIMIT 5;
-- Output: ["192.168.1.a1f8d2c3", "192.168.1.b4e9f1d5", ...]
```

---

## Monitoring

### Check Health

```bash
curl http://localhost:3001/health
# Response: { "status": "ok", "timestamp": "2026-03-26T..." }
```

### Monitor Logs

```bash
# Rate limiting
grep "Throttle" logs/api.log

# CSRF validation
grep "CSRF" logs/api.log

# Permission denials
grep "Insufficient permissions" logs/api.log

# IP anonymization
grep "anonymizedIp" logs/api.log
```

### Common Issues

#### 429 Too Many Requests
- **Cause:** Rate limit exceeded
- **Fix:** Wait 15 minutes or increase limit in `app.module.ts`

#### 403 CSRF Token Error
- **Cause:** Missing or invalid CSRF token
- **Fix:**
  1. Call `GET /api/security/csrf-token` first
  2. Include `X-CSRF-Token` header in POST/PUT/DELETE
  3. Ensure cookies are enabled

#### 403 Path Traversal Detected
- **Cause:** File path contains `../` or suspicious chars
- **Fix:** Upload files without directory traversal patterns

#### 403 Insufficient Permissions
- **Cause:** User role doesn't have required permission
- **Fix:** Check user role and permission matrix in PERMISSION_MATRIX.md

---

## Rollback Plan

If issues occur:

### 1. Quick Rollback

```bash
git revert <commit-hash>
npm run build
npm restart
```

### 2. Find Previous Commit

```bash
git log --oneline | grep "security\|PHASE2"
```

### 3. Revert to Previous Version

```bash
git checkout <previous-commit-hash>
npm run build
npm restart
```

---

## Post-Deployment Verification

### 1. API Responding

```bash
curl http://localhost:3001/health
# Should return: { "status": "ok", ... }
```

### 2. Rate Limiting Works

```bash
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
  echo "Request $i"
done
# Last request should return 429
```

### 3. CSRF Protection Works

```bash
curl -X POST http://localhost:3001/api/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"test"}'
# Should return 403 (no CSRF token)
```

### 4. Logs are Sanitized

```bash
grep -i "password\|token\|secret" logs/api.log
# Should show ***REDACTED***, not actual values
```

### 5. Database Audit Logs

```sql
SELECT "ipAddress", "action" FROM "AuditLog" LIMIT 5;
-- IPs should be hashed, not plain text
```

---

## Support

### Getting Help

1. Check SECURITY_FIXES_PHASE2.md for detailed documentation
2. Review PERMISSION_MATRIX.md for access control questions
3. Check application logs: `logs/api.log`
4. Run `npm run test` to validate setup

### Common Questions

**Q: Do I need to update my frontend?**
A: Yes, add CSRF token handling. See "CSRF Protection" section.

**Q: Will existing API keys break?**
A: No, all changes are backward compatible.

**Q: How do I manage user permissions?**
A: Edit user roles in database. Permissions are automatic based on role.

**Q: Can I disable rate limiting?**
A: Not recommended, but you can increase limits in `app.module.ts`

**Q: How long are CSRF tokens valid?**
A: 24 hours from generation.

---

## Timeline

- **Deployment:** ~5 minutes
- **Testing:** ~15 minutes
- **Full validation:** ~1 hour

**Estimated Total:** 1-2 hours including testing

---

**Last Updated:** 2026-03-26
**Version:** 1.0
