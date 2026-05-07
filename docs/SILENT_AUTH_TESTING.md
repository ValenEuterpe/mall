# Silent Auth Testing Guide

This document provides comprehensive testing procedures for the Silent Token Refresh system.

## Overview

The Silent Auth system provides seamless token refresh without user interruption:

1. **Middleware-level refresh**: Proactively refreshes tokens during page navigation
2. **API client retry**: Automatically retries failed 401 requests after refresh
3. **Race condition handling**: Queues multiple failed requests during a single refresh
4. **Token reuse detection**: Security feature to detect stolen refresh tokens

---

## Quick Verification

### 1. Build Check
```bash
npm run type-check
npm run build
```

### 2. Start Dev Server
```bash
npm run dev
```

---

## Manual Testing Procedures

### Test 1: Basic Login Flow

**Steps:**
1. Navigate to `/login`
2. Log in with valid credentials
3. Open browser DevTools → Application → Cookies

**Expected Results:**
- `access_token` cookie is set (HttpOnly, expires in ~15 minutes)
- `refresh_token` cookie is set (HttpOnly, expires in ~7 days)
- User is redirected to appropriate dashboard

---

### Test 2: Silent Refresh on Page Navigation

**Steps:**
1. Log in as any user
2. Open DevTools → Application → Cookies
3. Note the `access_token` value
4. **Option A**: Wait 15+ minutes for natural expiry
5. **Option B**: Manually delete the `access_token` cookie (simulates expiry)
6. Navigate to a protected page (e.g., `/seller/dashboard`)

**Expected Results:**
- User is NOT redirected to login
- New `access_token` cookie is set with different value
- Page loads normally

---

### Test 3: Silent Refresh on API Call

**Steps:**
1. Log in as a seller
2. Navigate to `/seller/products`
3. Open DevTools → Network tab
4. Delete the `access_token` cookie (keep `refresh_token`)
5. Trigger an API call (e.g., search for products, paginate)

**Expected Results:**
- First API call returns 401 (may not be visible)
- Automatic `POST /api/v1/auth/refresh` request
- Original API call is retried and succeeds
- No error toast shown to user
- New `access_token` cookie is set

---

### Test 4: Race Condition Handling

**Steps:**
1. Log in as any user
2. Delete the `access_token` cookie
3. Navigate to a page that triggers multiple simultaneous API calls
4. Watch the Network tab

**Expected Results:**
- Only ONE `POST /api/v1/auth/refresh` request
- All other failed requests wait in queue
- All requests succeed after refresh completes

---

### Test 5: Token Reuse Detection (Security)

**Prerequisites:**
- Token rotation must be enabled (`AUTH_CONFIG.tokenRefresh.rotateRefreshToken = true`)

**Steps:**
1. Log in and copy the `refresh_token` cookie value
2. Make any API call (triggers token rotation)
3. Note that `refresh_token` cookie has NEW value
4. Using the OLD token, call the refresh endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/refresh \
     -H "Cookie: refresh_token=OLD_TOKEN_VALUE"
   ```

**Expected Results:**
- Response: `{ "success": false, "error": { "code": "TOKEN_REUSE_DETECTED" } }`
- ALL sessions for that user are invalidated (security measure)
- User must log in again on all devices

---

### Test 6: Session Revocation

**Steps:**
1. Log in and get the session ID from the database
2. In the database, update: `UPDATE sessions SET "isRevoked" = true WHERE id = 'SESSION_ID'`
3. Try to access a protected page or make an API call

**Expected Results:**
- User is redirected to login
- Error code: `SESSION_REVOKED`

---

### Test 7: Expired Refresh Token

**Steps:**
1. Log in as any user
2. Delete BOTH `access_token` and `refresh_token` cookies
3. Navigate to a protected page

**Expected Results:**
- User is redirected to login page
- Callback URL is preserved in query string

---

### Test 8: Account Disabled

**Steps:**
1. Log in as a seller
2. In the database, update: `UPDATE sellers SET "isActive" = false WHERE id = 'SELLER_ID'`
3. Wait for access token to expire (or delete cookie)
4. Try to refresh or access protected content

**Expected Results:**
- Refresh fails with `ACCOUNT_DISABLED`
- User is redirected to login
- Session is deleted

---

## API Endpoint Testing

### Refresh Token Endpoint

```bash
# Success case (with valid refresh_token cookie)
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Cookie: refresh_token=VALID_TOKEN" \
  -v

# Expected response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "expiresAt": "2026-02-08T12:00:00.000Z",
    "tokenRotated": true
  }
}
```

### Error Responses

| Code | Description |
|------|-------------|
| `NO_REFRESH_TOKEN` | No refresh token cookie provided |
| `INVALID_TOKEN` | Token is malformed or signature invalid |
| `SESSION_NOT_FOUND` | Session doesn't exist in database |
| `SESSION_EXPIRED` | Session's expires date has passed |
| `SESSION_REVOKED` | Session's isRevoked flag is true |
| `TOKEN_REUSE_DETECTED` | Old refresh token used after rotation |
| `ACCOUNT_DISABLED` | User's isActive flag is false |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Configuration Reference

Located in `src/lib/config/auth.config.ts`:

```typescript
tokenRefresh: {
  rotateRefreshToken: true,      // Rotate refresh tokens on each refresh
  extendSessionOnRefresh: true,  // Extend session expiry on refresh
  sessionExtensionDays: 7,       // How many days to extend
  minResponseTime: 100,          // Minimum response time (anti-timing attack)
  invalidateOnTokenReuse: true,  // Invalidate all sessions on token reuse
}
```

---

## Troubleshooting

### Issue: User constantly redirected to login

**Possible causes:**
1. Refresh token is expired
2. Session deleted from database
3. Account is disabled
4. Token family mismatch (token reuse detected)

**Debug steps:**
1. Check browser cookies for `refresh_token`
2. Check database for matching session
3. Check user's `isActive` status
4. Check server logs for specific error code

### Issue: 401 errors not being retried

**Possible causes:**
1. `skipAuthRetry: true` passed in request config
2. Already attempted retry (`_isRetryAfterRefresh: true`)
3. Network error during refresh

**Debug steps:**
1. Check Network tab for refresh request
2. Check console for error logs
3. Verify refresh endpoint is accessible

### Issue: Multiple refresh requests

**Possible causes:**
1. Race condition handling not working
2. Different ApiClient instances

**Debug steps:**
1. Verify using singleton `apiClient` from `@/lib/api-client`
2. Check Network tab - should only see ONE refresh request

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Check access_token cookie                             │   │
│  │ 2. If invalid → Check refresh_token                      │   │
│  │ 3. If valid refresh → Call refreshSession()              │   │
│  │ 4. Set new cookies on response                           │   │
│  │ 5. Continue to page (no redirect needed)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API CLIENT                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ On 401 Response:                                         │   │
│  │ 1. Check if already retrying → Queue request             │   │
│  │ 2. Lock refresh (prevent race condition)                 │   │
│  │ 3. POST /api/v1/auth/refresh                             │   │
│  │ 4. If success → Retry original request                   │   │
│  │ 5. If fail → Redirect to login                           │   │
│  │ 6. Process queued requests                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 REFRESH SESSION SERVICE                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Verify refresh token JWT                              │   │
│  │ 2. Find session in database                              │   │
│  │ 3. Check session not expired/revoked                     │   │
│  │ 4. Check token family (reuse detection)                  │   │
│  │ 5. Verify account is active                              │   │
│  │ 6. Generate new access token                             │   │
│  │ 7. Optionally rotate refresh token                       │   │
│  │ 8. Update session in database                            │   │
│  │ 9. Return new tokens                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

1. **Token Rotation**: Each refresh generates a new refresh token, invalidating the old one
2. **Token Family**: Tracks token lineage to detect reuse of stolen tokens
3. **Session Revocation**: Immediate invalidation without waiting for expiry
4. **Account Status Check**: Disabled accounts can't refresh tokens
5. **HttpOnly Cookies**: Tokens not accessible via JavaScript (XSS protection)
6. **Short Access Token TTL**: 15 minutes limits exposure if token is stolen

---

*Last updated: 2026-02-08*
