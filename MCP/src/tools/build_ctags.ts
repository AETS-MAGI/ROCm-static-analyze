import path from "node:path";

import type { LoadedConfig } from "../util/config.js";
import { commandExists, execFileSafe } from "../util/exec.js";
import { ensureRepoCacheDir, resolveRoot } from "../util/repo.js";

export interface BuildCtagsArgs
{
  root: string;
}

export async function buildCtags(loaded: LoadedConfig, args: BuildCtagsArgs)
{
  const resolved = resolveRoot(loaded, args.root);
  if(!(await commandExists("ctags")))
  {
    return {
      ok: false,
      status: "unavailable",
      tool: "ctags",
      message: "ctags is not installed in PATH",
      root: resolved.alias,
    };
  }

  const cacheDir = await ensureRepoCacheDir(loaded, resolved.alias);
  const outputName = loaded.config.tools.build_ctags?.output ?? "tags";
  const outputPath = path.resolve(cacheDir, outputName);
  const excludeArgs = loaded.config.scanPolicy.excludeDirs.map(dir => `--exclude=${dir}`);

  await execFileSafe("ctags", [
    "-R",
    "-f",
    outputPath,
    "--fields=+n",
    "--extras=-F",
    ...excludeArgs,
    ".",
  ], resolved.rootPath);

  return {
    ok: true,
    root: resolved.alias,
    output: outputPath,
  };
}
