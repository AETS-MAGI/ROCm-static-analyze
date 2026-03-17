import path from "node:path";

import type { LoadedConfig } from "./config.js";
import { ensureDir, exists, isSubpath } from "./fs.js";

export interface ResolvedRoot
{
  alias: string;
  rootPath: string;
}

export function resolveRoot(loaded: LoadedConfig, root: string): ResolvedRoot
{
  const aliasPath = loaded.config.repoAliases[root];
  const rootPath = aliasPath ?? root;
  const resolvedRootPath = path.resolve(rootPath);

  if(!loaded.config.policies.allowOutsideRoots)
  {
    const allowed = loaded.config.roots.some(candidate => isSubpath(resolvedRootPath, candidate));
    if(!allowed)
      throw new Error(`Root is outside configured roots: ${root}`);
  }

  const alias =
    Object.entries(loaded.config.repoAliases).find(([, candidate]) => path.resolve(candidate) === resolvedRootPath)?.[0] ??
    path.basename(resolvedRootPath);

  return {
    alias,
    rootPath: resolvedRootPath,
  };
}

export function resolveRepoFile(resolved: ResolvedRoot, file: string): string
{
  const target = path.isAbsolute(file) ? path.resolve(file) : path.resolve(resolved.rootPath, file);
  if(!isSubpath(target, resolved.rootPath))
    throw new Error(`File is outside root: ${file}`);
  return target;
}

export async function ensureRepoCacheDir(loaded: LoadedConfig, alias: string): Promise<string>
{
  const cacheRoot = path.resolve(loaded.projectRoot, loaded.config.policies.cacheDir, alias);
  await ensureDir(cacheRoot);
  return cacheRoot;
}

export async function resolveExistingRepoCacheFile(
  loaded: LoadedConfig,
  alias: string,
  filename: string,
): Promise<string | null>
{
  const cacheRoot = path.resolve(loaded.projectRoot, loaded.config.policies.cacheDir, alias);
  const target = path.resolve(cacheRoot, filename);
  return (await exists(target)) ? target : null;
}
