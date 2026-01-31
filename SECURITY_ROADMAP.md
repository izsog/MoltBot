# MoltBot Security Hardening Roadmap

> **Fork Security Enhancement Plan**
> This roadmap outlines security improvements for the MoltBot fork based on the Top 10 vulnerabilities analysis.
> See [FORK.md](FORK.md) for implemented P0 changes.

## Status Overview

| # | Vulnerability | Severity | Status | Priority |
|---|--------------|----------|--------|----------|
| 1 | Gateway exposed on 0.0.0.0:18789 | 🔴 CRITICAL | ✅ Enhanced | ~~P1~~ DONE |
| 2 | DM policy allows all users | 🔴 CRITICAL | ❌ Not Fixed | P1 |
| 3 | Sandbox disabled by default | 🔴 CRITICAL | ❌ Not Fixed | P1 |
| 4 | Credentials in plaintext oauth.json | 🟡 HIGH | ✅ Fixed (P0) | - |
| 5 | Prompt injection via web content | 🟡 HIGH | ⚠️ Partially Fixed | P2 |
| 6 | Dangerous commands unlocked | 🟡 HIGH | ❌ Not Fixed | P1 |
| 7 | No network isolation | 🟡 HIGH | ⚠️ Partially Fixed | P1 |
| 8 | Elevated tool access granted | 🟠 MEDIUM | ❌ Not Fixed | P2 |
| 9 | No audit logging enabled | 🟠 MEDIUM | ❌ Not Fixed | P2 |
| 10 | Weak/default pairing codes | 🟠 MEDIUM | ❌ Not Fixed | P2 |

---

## ✅ P0 - Completed (2026-01-30)

### Security Improvements Implemented

**Node.js Version Enforcement**
- ✅ Enforced Node.js >=22.12.0 for CVE patches
- ✅ Pinned Dockerfile to exact version
- File: `src/infra/runtime-guard.ts`, `Dockerfile`

**Docker Security Hardening**
- ✅ Added `no-new-privileges:true`
- ✅ Dropped all capabilities (cap_drop: ALL)
- ✅ Resource limits (mem, cpu, pids)
- File: `docker-compose.yml`

**Filesystem Permission Protection (#4)**
- ✅ Automatic chmod 600 for credentials
- ✅ Automatic chmod 700 for state directory
- ✅ Windows ACL support
- Available: `moltbot security audit --fix`
- Files: `src/security/fix.ts`, `src/security/audit-fs.ts`

**Security Audit System**
- ✅ Comprehensive audit command
- ✅ Auto-fix capability
- ✅ Deep scan with gateway probe

---

## 🎯 P1 - High Priority (Next Phase)

### ~~1. Gateway Authentication Enforcement (#1)~~ ✅ COMPLETED
**Status:** ✅ Enhanced (2026-01-31)

**Implemented Features:**
- ✅ Mandatory authToken check for non-loopback binds (already existed)
- ✅ Token strength validation (minimum 32 chars, complexity checks)
- ✅ Enhanced error messages with security guidance
- ✅ Security warnings for network-exposed gateways
- ✅ Comprehensive `.env.example` documentation

**Implementation Details:**
```typescript
// src/gateway/auth.ts - Token validation
function validateTokenStrength(token: string) {
  // Check minimum length (32 characters)
  // Detect weak patterns (password123, token, etc.)
  // Validate character complexity
}

// src/gateway/server-runtime-config.ts - Enhanced checks
if (!isLoopbackHost(bindHost) && !hasSharedSecret) {
  throw new Error with detailed guidance;
}
```

**Files Modified:**
- `src/gateway/auth.ts` - Token validation
- `src/gateway/server-runtime-config.ts` - Security warnings
- `.env.example` - Token generation guide

**Completed:** 2026-01-31

---

### 2. DM Policy Allowlist (#2)
**Status:** ❌ Not Fixed

**Current Issue:**
- Default DM policy may allow all users
- No explicit allowlist enforcement

**Proposed Fix:**
```yaml
# config.yaml - Enforce allowlist
routing:
  dm_policy: allowlist
  dm_allowlist:
    - "+1234567890"  # Explicit phone numbers only
```

**Implementation Tasks:**
- [ ] Set default `dm_policy: allowlist`
- [ ] Require explicit user configuration
- [ ] Add validation for empty allowlists
- [ ] Warn on `dm_policy: open` with prompt

**Files to Modify:**
- `src/config/config.ts`
- `src/config/validation.ts`
- `src/routing/dm-policy.ts`

**Estimated Effort:** 3-4 hours

---

### 3. Sandbox Enablement (#3)
**Status:** ❌ Not Fixed

**Current Issue:**
- Sandbox disabled by default
- No isolation for untrusted code execution

**Proposed Fix:**
```yaml
# config.yaml - Enable sandbox
agents:
  sandbox: all  # or 'tools' for tool-only sandboxing

docker:
  network: none  # Disable network for sandbox
```

**Implementation Tasks:**
- [ ] Change default `sandbox: all`
- [ ] Add `docker.network=none` for isolation
- [ ] Validate sandbox availability on startup
- [ ] Document sandbox requirements

**Files to Modify:**
- `src/config/config.ts`
- `src/agents/sandbox.ts`
- `docker-compose.yml` (add network_mode: none)

**Estimated Effort:** 4-6 hours

---

### 4. Dangerous Commands Blocking (#6)
**Status:** ❌ Not Fixed

**Current Issue:**
- No blocklist for dangerous shell commands
- `rm -rf`, `curl | sh`, `git push --force` allowed

**Proposed Fix:**
```typescript
// src/security/command-blocklist.ts
const BLOCKED_PATTERNS = [
  /rm\s+-rf/i,
  /curl\s+.*\|\s*sh/i,
  /wget\s+.*\|\s*sh/i,
  /git\s+push\s+--force/i,
  /:\(\)\s*\{/,  // Fork bomb
  /sudo\s+rm/i,
];

export function isCommandBlocked(cmd: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(cmd));
}
```

**Implementation Tasks:**
- [ ] Create command blocklist module
- [ ] Integrate with exec approval system
- [ ] Add user override with explicit approval
- [ ] Log blocked command attempts

**Files to Create:**
- `src/security/command-blocklist.ts`
- `src/security/command-blocklist.test.ts`

**Files to Modify:**
- `src/process/exec.ts`
- `src/infra/exec-approvals.ts`

**Estimated Effort:** 3-4 hours

---

### 5. Docker Network Isolation (#7)
**Status:** ⚠️ Partially Fixed (security flags added, but network not isolated)

**Current Issue:**
- Docker containers have network access by default
- No network isolation for sandbox

**Proposed Fix:**
```yaml
# docker-compose.yml
services:
  moltbot-gateway:
    networks:
      - internal

  moltbot-sandbox:
    network_mode: none  # Complete isolation

networks:
  internal:
    driver: bridge
    internal: true
```

**Implementation Tasks:**
- [ ] Add Docker network isolation
- [ ] Create internal-only network for gateway
- [ ] Set `network_mode: none` for sandbox
- [ ] Document network architecture

**Files to Modify:**
- `docker-compose.yml`
- `Dockerfile.sandbox`

**Estimated Effort:** 2-3 hours

---

## 🔄 P2 - Medium Priority

### 6. Prompt Injection Protection (#5)
**Status:** ⚠️ Partially Fixed (untrusted tags exist, but could be stronger)

**Current Implementation:**
- ✅ `src/security/external-content.ts` has boundary markers
- ⚠️ Depends on LLM respecting boundaries

**Proposed Enhancement:**
```typescript
// Additional content sanitization
export function sanitizeExternalContent(content: string): string {
  // Strip HTML/script tags
  const stripped = content.replace(/<script[^>]*>.*?<\/script>/gis, '');

  // Limit length
  const maxLength = 10000;
  const truncated = stripped.slice(0, maxLength);

  // Reject binary content
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(truncated)) {
    throw new Error('Binary content rejected');
  }

  return truncated;
}
```

**Implementation Tasks:**
- [ ] Add HTML/script tag stripping
- [ ] Implement content length limits
- [ ] Reject binary content
- [ ] Add rate limiting for external hooks

**Files to Modify:**
- `src/security/external-content.ts`

**Estimated Effort:** 3-4 hours

---

### 7. MCP Tool Access Restriction (#8)
**Status:** ❌ Not Fixed

**Current Issue:**
- MCP tools have elevated access
- No minimum-required-permissions model

**Proposed Fix:**
```yaml
# config.yaml - Restrict MCP tools
tools:
  mcp:
    allowed:
      - filesystem.read  # Explicitly allowed only
    blocked:
      - filesystem.write
      - network.request
```

**Implementation Tasks:**
- [ ] Create MCP tool allowlist system
- [ ] Default deny-all policy
- [ ] Require explicit tool enablement
- [ ] Add tool capability audit

**Files to Create:**
- `src/security/mcp-policy.ts`

**Estimated Effort:** 4-5 hours

---

### 8. Comprehensive Session Logging (#9)
**Status:** ❌ Not Fixed

**Current Issue:**
- No comprehensive audit logging
- Missing security-relevant events

**Proposed Fix:**
```typescript
// src/security/audit-logger.ts
export interface AuditEvent {
  timestamp: number;
  event: 'auth.success' | 'auth.failure' | 'exec.approved' | 'exec.blocked';
  user?: string;
  details: Record<string, unknown>;
}

export class AuditLogger {
  log(event: AuditEvent): void {
    // Append-only log file
    // Structured JSON format
    // Tamper-proof (signed entries)
  }
}
```

**Implementation Tasks:**
- [ ] Create audit logging system
- [ ] Log authentication events
- [ ] Log exec approvals/denials
- [ ] Log configuration changes
- [ ] Implement log rotation
- [ ] Add tamper detection

**Files to Create:**
- `src/security/audit-logger.ts`

**Estimated Effort:** 6-8 hours

---

### 9. Strong Pairing Code Generation (#10)
**Status:** ❌ Not Fixed

**Current Issue:**
- Weak or default pairing codes
- No rate limiting on pairing attempts

**Proposed Fix:**
```typescript
// src/security/pairing-codes.ts
import { randomBytes } from 'node:crypto';

export function generatePairingCode(): string {
  // Cryptographically random 16-character code
  const bytes = randomBytes(12);
  return bytes.toString('base64url').slice(0, 16);
}

export function rateLimitPairing(ip: string): boolean {
  // Max 5 attempts per hour per IP
  // Exponential backoff after failures
}
```

**Implementation Tasks:**
- [ ] Generate cryptographic random codes
- [ ] Minimum 16-character length
- [ ] Add rate limiting (5 attempts/hour)
- [ ] Implement exponential backoff
- [ ] Add brute-force detection

**Files to Modify:**
- `src/pairing/pairing-store.ts`
- `src/infra/device-pairing.ts`

**Files to Create:**
- `src/security/pairing-codes.ts`

**Estimated Effort:** 3-4 hours

---

## 📅 Implementation Timeline

### Phase 1: P1 Critical (Week 1-2)
- Day 1-2: Gateway authentication enforcement (#1)
- Day 3-4: DM policy allowlist (#2)
- Day 5-7: Dangerous commands blocking (#6)
- Day 8-10: Sandbox enablement (#3)
- Day 11-12: Docker network isolation (#7)

### Phase 2: P2 Medium (Week 3-4)
- Day 1-2: Prompt injection enhancements (#5)
- Day 3-5: MCP tool access restriction (#8)
- Day 6-9: Comprehensive session logging (#9)
- Day 10-12: Strong pairing code generation (#10)

**Total Estimated Effort:**
- P1: ~16-20 hours
- P2: ~16-21 hours
- **Grand Total: ~32-41 hours** (4-5 working days)

---

## 🔧 Testing Plan

Each security enhancement should include:

1. **Unit Tests**
   - Test security checks work correctly
   - Test bypass attempts fail
   - Test error handling

2. **Integration Tests**
   - Test end-to-end security flows
   - Test configuration validation
   - Test multi-component interactions

3. **Security Tests**
   - Penetration testing for each fix
   - Fuzz testing for input validation
   - Load testing for rate limits

4. **Regression Tests**
   - Ensure existing functionality works
   - No performance degradation
   - Backward compatibility (where appropriate)

---

## 📚 Documentation Updates

Each implementation phase should update:

- [ ] `CHANGELOG.md` - Add security improvements
- [ ] `SECURITY.md` - Update security best practices
- [ ] `README.md` - Highlight security features
- [ ] `FORK.md` - Document fork-specific changes
- [ ] Configuration examples (`.env.example`, `config.example.yaml`)
- [ ] Deployment guides (Docker, systemd, etc.)

---

## 🎯 Success Metrics

**Security Posture Improvement:**
- ✅ P0 completed: 2/10 vulnerabilities addressed (20%)
- 🎯 P1 target: 7/10 vulnerabilities addressed (70%)
- 🎯 P2 target: 10/10 vulnerabilities addressed (100%)

**Audit Score:**
- Current: CRITICAL: 3, HIGH: 4, MEDIUM: 3
- Target P1: CRITICAL: 0, HIGH: 1, MEDIUM: 3
- Target P2: CRITICAL: 0, HIGH: 0, MEDIUM: 0

---

## 💡 Additional Recommendations

### Long-term (P3)
1. **WAF Integration** - Web Application Firewall for public exposure
2. **mTLS Support** - Mutual TLS authentication
3. **Hardware Security Module (HSM)** - For credential storage
4. **SIEM Integration** - Security Information and Event Management
5. **ML-based Anomaly Detection** - For prompt injection and unusual behavior
6. **Penetration Testing** - Professional security audit
7. **Bug Bounty Program** - Community security testing
8. **Security Training** - Developer security awareness

### Monitoring & Alerting
1. **Real-time Security Alerts** - Failed auth attempts, blocked commands
2. **Security Dashboards** - Grafana/Prometheus integration
3. **Threat Intelligence Feeds** - CVE monitoring for dependencies
4. **Incident Response Plan** - Security breach procedures

---

**Document Version:** 1.0
**Last Updated:** 2026-01-30
**Maintained By:** Izso Gergely (izso.gergely@gmail.com)
**Fork Repository:** https://github.com/izsog/MoltBot
