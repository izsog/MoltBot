import fs from "node:fs/promises";
import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

import {
  formatIcaclsResetCommand,
  formatWindowsAclSummary,
  inspectWindowsAcl,
  type ExecFn,
} from "./windows-acl.js";

const exec = promisify(execCallback);

export type PermissionCheck = {
  ok: boolean;
  isSymlink: boolean;
  isDir: boolean;
  mode: number | null;
  bits: number | null;
  source: "posix" | "windows-acl" | "unknown";
  worldWritable: boolean;
  groupWritable: boolean;
  worldReadable: boolean;
  groupReadable: boolean;
  aclSummary?: string;
  error?: string;
};

export type PermissionCheckOptions = {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  exec?: ExecFn;
};

export async function safeStat(targetPath: string): Promise<{
  ok: boolean;
  isSymlink: boolean;
  isDir: boolean;
  mode: number | null;
  uid: number | null;
  gid: number | null;
  error?: string;
}> {
  try {
    const lst = await fs.lstat(targetPath);
    const isSymlink = lst.isSymbolicLink();

    // Security fix: Follow symlinks to check actual target permissions
    // Symlinkek permission bitjei mindig 777, de a cél fájl permissions-ai számítanak
    if (isSymlink) {
      try {
        const target = await fs.stat(targetPath); // Follow symlink
        return {
          ok: true,
          isSymlink: true,
          isDir: target.isDirectory(),
          mode: typeof target.mode === "number" ? target.mode : null,
          uid: typeof target.uid === "number" ? target.uid : null,
          gid: typeof target.gid === "number" ? target.gid : null,
        };
      } catch (err) {
        // Ha a symlink cél nem elérhető, fallback az lstat-ra
        return {
          ok: true,
          isSymlink: true,
          isDir: lst.isDirectory(),
          mode: typeof lst.mode === "number" ? lst.mode : null,
          uid: typeof lst.uid === "number" ? lst.uid : null,
          gid: typeof lst.gid === "number" ? lst.gid : null,
          error: `Symlink target unreachable: ${String(err)}`,
        };
      }
    }

    return {
      ok: true,
      isSymlink: false,
      isDir: lst.isDirectory(),
      mode: typeof lst.mode === "number" ? lst.mode : null,
      uid: typeof lst.uid === "number" ? lst.uid : null,
      gid: typeof lst.gid === "number" ? lst.gid : null,
    };
  } catch (err) {
    return {
      ok: false,
      isSymlink: false,
      isDir: false,
      mode: null,
      uid: null,
      gid: null,
      error: String(err),
    };
  }
}

export async function inspectPathPermissions(
  targetPath: string,
  opts?: PermissionCheckOptions,
): Promise<PermissionCheck> {
  const st = await safeStat(targetPath);
  if (!st.ok) {
    return {
      ok: false,
      isSymlink: false,
      isDir: false,
      mode: null,
      bits: null,
      source: "unknown",
      worldWritable: false,
      groupWritable: false,
      worldReadable: false,
      groupReadable: false,
      error: st.error,
    };
  }

  const bits = modeBits(st.mode);
  const platform = opts?.platform ?? process.platform;

  if (platform === "win32") {
    const acl = await inspectWindowsAcl(targetPath, { env: opts?.env, exec: opts?.exec });
    if (!acl.ok) {
      return {
        ok: true,
        isSymlink: st.isSymlink,
        isDir: st.isDir,
        mode: st.mode,
        bits,
        source: "unknown",
        worldWritable: false,
        groupWritable: false,
        worldReadable: false,
        groupReadable: false,
        error: acl.error,
      };
    }
    return {
      ok: true,
      isSymlink: st.isSymlink,
      isDir: st.isDir,
      mode: st.mode,
      bits,
      source: "windows-acl",
      worldWritable: acl.untrustedWorld.some((entry) => entry.canWrite),
      groupWritable: acl.untrustedGroup.some((entry) => entry.canWrite),
      worldReadable: acl.untrustedWorld.some((entry) => entry.canRead),
      groupReadable: acl.untrustedGroup.some((entry) => entry.canRead),
      aclSummary: formatWindowsAclSummary(acl),
    };
  }

  return {
    ok: true,
    isSymlink: st.isSymlink,
    isDir: st.isDir,
    mode: st.mode,
    bits,
    source: "posix",
    worldWritable: isWorldWritable(bits),
    groupWritable: isGroupWritable(bits),
    worldReadable: isWorldReadable(bits),
    groupReadable: isGroupReadable(bits),
  };
}

export function formatPermissionDetail(targetPath: string, perms: PermissionCheck): string {
  if (perms.source === "windows-acl") {
    const summary = perms.aclSummary ?? "unknown";
    return `${targetPath} acl=${summary}`;
  }
  return `${targetPath} mode=${formatOctal(perms.bits)}`;
}

export function formatPermissionRemediation(params: {
  targetPath: string;
  perms: PermissionCheck;
  isDir: boolean;
  posixMode: number;
  env?: NodeJS.ProcessEnv;
}): string {
  if (params.perms.source === "windows-acl") {
    return formatIcaclsResetCommand(params.targetPath, { isDir: params.isDir, env: params.env });
  }
  const mode = params.posixMode.toString(8).padStart(3, "0");
  return `chmod ${mode} ${params.targetPath}`;
}

export function modeBits(mode: number | null): number | null {
  if (mode == null) return null;
  return mode & 0o777;
}

export function formatOctal(bits: number | null): string {
  if (bits == null) return "unknown";
  return bits.toString(8).padStart(3, "0");
}

export function isWorldWritable(bits: number | null): boolean {
  if (bits == null) return false;
  return (bits & 0o002) !== 0;
}

export function isGroupWritable(bits: number | null): boolean {
  if (bits == null) return false;
  return (bits & 0o020) !== 0;
}

export function isWorldReadable(bits: number | null): boolean {
  if (bits == null) return false;
  return (bits & 0o004) !== 0;
}

export function isGroupReadable(bits: number | null): boolean {
  if (bits == null) return false;
  return (bits & 0o040) !== 0;
}

/**
 * Automatically fix file/directory permissions (P0 security requirement).
 * Sets state directory to 700 and config file to 600.
 */
export async function fixPermissions(params: {
  stateDir: string;
  configPath: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
}): Promise<{ ok: boolean; fixed: string[]; errors: string[] }> {
  const platform = params.platform ?? process.platform;
  const fixed: string[] = [];
  const errors: string[] = [];

  // Fix state directory permissions (700)
  try {
    const stateDirPerms = await inspectPathPermissions(params.stateDir, {
      platform,
      env: params.env,
    });
    if (stateDirPerms.ok && (stateDirPerms.worldWritable || stateDirPerms.groupWritable)) {
      if (!params.dryRun) {
        if (platform === "win32") {
          const cmd = formatIcaclsResetCommand(params.stateDir, { isDir: true, env: params.env });
          await exec(cmd);
        } else {
          await fs.chmod(params.stateDir, 0o700);
        }
      }
      fixed.push(`${params.stateDir} (700)`);
    }
  } catch (err) {
    errors.push(`Failed to fix ${params.stateDir}: ${String(err)}`);
  }

  // Fix config file permissions (600)
  try {
    const configPerms = await inspectPathPermissions(params.configPath, {
      platform,
      env: params.env,
    });
    if (configPerms.ok && (configPerms.worldWritable || configPerms.groupWritable)) {
      if (!params.dryRun) {
        if (platform === "win32") {
          const cmd = formatIcaclsResetCommand(params.configPath, { isDir: false, env: params.env });
          await exec(cmd);
        } else {
          await fs.chmod(params.configPath, 0o600);
        }
      }
      fixed.push(`${params.configPath} (600)`);
    }
  } catch (err) {
    errors.push(`Failed to fix ${params.configPath}: ${String(err)}`);
  }

  return { ok: errors.length === 0, fixed, errors };
}
