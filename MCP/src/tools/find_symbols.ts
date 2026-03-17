import type { LoadedConfig } from "../util/config.js";
import { execFileSafe } from "../util/exec.js";
import { resolveRoot } from "../util/repo.js";

export interface FindSymbolsArgs
{
  symbol: string;
  root: string;
}

function classifyLine(line: string): string
{
  if(/\bclass\s+\w+/.test(line))
    return "class";
  if(/\bstruct\s+\w+/.test(line))
    return "struct";
  if(/\benum(\s+class)?\s+\w+/.test(line))
    return "enum";
  if(/\bnamespace\s+\w+/.test(line))
    return "namespace";
  if(/\b[A-Za-z_]\w*(::[A-Za-z_]\w*)*\s*\(/.test(line))
    return "function_or_method";
  return "symbol_reference";
}

export async function findSymbols(loaded: LoadedConfig, args: FindSymbolsArgs)
{
  const resolved = resolveRoot(loaded, args.root);
  const globs = loaded.config.scanPolicy.includeGlobs.flatMap(glob => ["-g", glob]);
  const excludes = loaded.config.scanPolicy.excludeDirs.flatMap(dir => ["-g", `!${dir}/**`]);
  let stdout = "";
  try
  {
    ({ stdout } = await execFileSafe("rg", [
      "-n",
      "-S",
      "--color",
      "never",
      ...excludes,
      ...globs,
      `\\b${args.symbol}\\b`,
      resolved.rootPath,
    ]));
  }
  catch(error)
  {
    const maybeCode = error as { code?: number };
    if(maybeCode.code !== 1)
      throw error;
  }

  const candidates = stdout
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.*?):(\d+):(.*)$/);
      if(!match)
        return null;
      const text = match[3].trim();
      return {
        file: match[1].replace(`${resolved.rootPath}/`, ""),
        line: Number(match[2]),
        kind: classifyLine(text),
        text,
      };
    })
    .filter(Boolean);

  return {
    ok: true,
    root: resolved.alias,
    symbol: args.symbol,
    count: candidates.length,
    candidates,
  };
}
