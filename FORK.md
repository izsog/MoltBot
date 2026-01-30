# Fork Information

This repository is a **modified fork** of the original [Moltbot project](https://github.com/moltbot/moltbot).

## Original Project

- **Original Repository:** https://github.com/moltbot/moltbot
- **Original Author:** Peter Steinberger
- **License:** MIT License (see [LICENSE](LICENSE))
- **Original Copyright:** Copyright (c) 2025 Peter Steinberger

## Attribution

All credit for the original Moltbot codebase goes to **Peter Steinberger** and the Moltbot contributors. This fork maintains the original MIT license and copyright notice as required.

## Modifications Made

This fork includes the following security and operational enhancements:

### P0 Security Hardening (2026-01-30)

**Node.js Version Enforcement:**
- Enforced Node.js >=22.12.0 for critical security patches (CVE-2025-59466, CVE-2026-21636)
- Updated `src/infra/runtime-guard.ts`: MIN_NODE 22.0.0 → 22.12.0
- Pinned `Dockerfile` to exact Node.js 22.12.0-bookworm image
- Enhanced error messages with security patch context

**Docker Security Hardening:**
- Added `security_opt: no-new-privileges:true` to prevent privilege escalation
- Dropped all capabilities (`cap_drop: ALL`)
- Added only required capability for gateway (`cap_add: NET_BIND_SERVICE`)
- Added resource limits: `mem_limit: 4g`, `cpus: 2.0`, `pids_limit: 200`

**Filesystem Permission Protection:**
- Enhanced existing `fixSecurityFootguns()` implementation
- Automatic fixes for state directory (700) and config file (600) permissions
- Windows ACL support for proper permission enforcement
- Available via: `moltbot security audit --fix`

**Security Audit System:**
- Comprehensive `moltbot security audit` command
- Automatic permission fixes with `--fix` flag
- Deep scanning with `--deep` flag (includes live gateway probe)
- Critical findings with remediation steps

### Modified Files

- `src/infra/runtime-guard.ts` - Node.js version enforcement
- `Dockerfile` - Pinned Node.js version for security
- `docker-compose.yml` - Docker security hardening flags
- `CHANGELOG.md` - Security changelog documentation (2026.1.30-security-hotfix)
- `README.md` - Added fork notice
- `FORK.md` - This file (fork documentation)

## Relationship to Original Project

This is an **independent fork** maintained separately from the upstream Moltbot project. The modifications are focused on security hardening based on a comprehensive security audit (see `SECURITY_OPERATIONS_AUDIT.md`).

**Upstream synchronization:** This fork is NOT automatically synchronized with the upstream Moltbot repository. Any upstream updates must be manually reviewed and merged.

## Compliance with MIT License

This fork complies with the MIT License terms:
- ✅ Original copyright notice preserved in [LICENSE](LICENSE)
- ✅ Original license text included in all distributions
- ✅ Attribution to original author (Peter Steinberger) maintained
- ✅ Fork status clearly disclosed in README and this file
- ✅ Modifications documented and listed

## How to Use This Fork

This fork can be used exactly like the original Moltbot:

```bash
npm install -g moltbot@latest
moltbot onboard --install-daemon
```

**Additional security features:**
```bash
# Run security audit
moltbot security audit

# Auto-fix permission issues
moltbot security audit --fix

# Deep scan with gateway probe
moltbot security audit --deep
```

## Contributing

If you want to contribute to the **original Moltbot project**, please visit:
https://github.com/moltbot/moltbot

If you want to contribute to **this fork's security enhancements**, please open an issue or pull request in this repository.

## Disclaimer

This fork is provided "AS IS" without warranty of any kind, as per the MIT License. The security enhancements are based on a point-in-time security audit and should not be considered a comprehensive security solution.

For the most up-to-date and officially supported version, please refer to the original Moltbot project at https://github.com/moltbot/moltbot.

---

**Fork Maintained By:** Izso Gergely (izso.gergely@gmail.com)
**Fork Repository:** https://github.com/izsog/MoltBot
**Last Updated:** 2026-01-30
