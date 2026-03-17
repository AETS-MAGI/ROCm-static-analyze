import path from "node:path";
import { writeFile } from "node:fs/promises";

import type { LoadedConfig } from "../util/config.js";
import { commandExists, execFileSafe } from "../util/exec.js";
import { ensureRepoCacheDir, resolveRoot } from "../util/repo.js";

export interface BuildCscopeArgs
{
  root: string;
}

function getCscopeGlobs(loaded: LoadedConfig): string[]
{
  const globs = loaded.config.scanPolicy.includeGlobs.filter(glob => /\*\.(c|cc|cpp|h|hpp)$/.test(glob));
  return globs.length > 0 ? globs : ["*.c", "*.cc", "*.cpp", "*.h", "*.hpp"];
}

export async function buildCscope(loaded: LoadedConfig, args: BuildCscopeArgs)
{
  const resolved = resolveRoot(loaded, args.root);
  if(!(await commandExists("cscope")))
  {
    return {
      ok: false,
      status: "unavailable",
      tool: "cscope",
      message: "cscope is not installed in PATH",
      root: resolved.alias,
    };
  }

  const cacheDir = await ensureRepoCacheDir(loaded, resolved.alias);
  const outputName = loaded.config.tools.build_cscope?.output ?? "cscope.out";
  const outputPath = path.resolve(cacheDir, outputName);
  const filesPath = path.resolve(cacheDir, "cscope.files");
  const excludeArgs = loaded.config.scanPolicy.excludeDirs.flatMap(dir => ["-g", `!${dir}/**`]);
  const includeArgs = getCscopeGlobs(loaded).flatMap(glob => ["-g", glob]);
  let stdout = "";

  try
  {
    ({ stdout } = await execFileSafe("rg", [
      "--files",
      ...excludeArgs,
      ...includeArgs,
      resolved.rootPath,
    ]));
  }
  catch(error)
  {
    const maybeCode = error as { code?: number };
    if(maybeCode.code !== 1)
      throw error;
  }

  const files = stdout
    .split("\n")
    .filter(Boolean)
    .map(file => file.replace(`${resolved.rootPath}/`, ""))
    .sort();

  if(files.length === 0)
  {
    return {
      ok: false,
      status: "no_files",
      root: resolved.alias,
      message: "No source files matched cscope input globs",
    };
  }

  await writeFile(filesPath, `${files.join("\n")}\n`, "utf8");
  await execFileSafe("cscope", [
    "-b",
    "-q",
    "-k",
    "-f",
    outputPath,
    "-i",
    filesPath,
  ], resolved.rootPath);

  return {
    ok: true,
    root: resolved.alias,
    output: outputPath,
    files: filesPath,
    sourceCount: files.length,
  };
}
