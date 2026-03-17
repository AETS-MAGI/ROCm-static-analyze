import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ToolConfig
{
  enabled: boolean;
  maxResults?: number;
  output?: string;
  maxFiles?: number;
  requireCompileCommands?: boolean;
}

export interface StaticConfig
{
  name: string;
  version: string;
  roots: string[];
  repoAliases: Record<string, string>;
  repoMeta: Record<string, { status: string; role: string }>;
  tools: Record<string, ToolConfig>;
  policies: {
    allowWriteOutsideCache: boolean;
    allowCacheWrite: boolean;
    cacheDir: string;
    allowDelete: boolean;
    allowOutsideRoots: boolean;
    maxFileReadBytes: number;
  };
  scanPolicy: {
    excludeDirs: string[];
    includeGlobs: string[];
  };
  defaults: {
    preferredLanguages: string[];
    hubFunctions: string[];
  };
}

export interface LoadedConfig
{
  projectRoot: string;
  configPath: string;
  config: StaticConfig;
}

export async function loadConfig(configPath: string): Promise<LoadedConfig>
{
  const resolvedPath = path.resolve(configPath);
  const raw = await readFile(resolvedPath, "utf8");
  const config = JSON.parse(raw) as StaticConfig;
  const projectRoot = path.resolve(path.dirname(resolvedPath), "..");
  return {
    projectRoot,
    configPath: resolvedPath,
    config,
  };
}
