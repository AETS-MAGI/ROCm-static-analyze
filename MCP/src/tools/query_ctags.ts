import type { LoadedConfig } from "../util/config.js";
import { execFileSafe } from "../util/exec.js";
import { ensureRepoCacheDir, resolveExistingRepoCacheFile, resolveRoot } from "../util/repo.js";
import { buildCtags } from "./build_ctags.js";

export interface QueryCtagsArgs
{
  symbol: string;
  root: string;
  autoBuild?: boolean;
}

function escapeRegex(source: string): string
{
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function queryCtags(loaded: LoadedConfig, args: QueryCtagsArgs)
{
  const resolved = resolveRoot(loaded, args.root);
  const outputName = loaded.config.tools.build_ctags?.output ?? "tags";
  let tagFile = await resolveExistingRepoCacheFile(loaded, resolved.alias, outputName);

  if(tagFile === null && args.autoBuild)
  {
    await ensureRepoCacheDir(loaded, resolved.alias);
    const build = await buildCtags(loaded, { root: resolved.alias });
    if(!build.ok)
      return build;
    tagFile = typeof build.output === "string" ? build.output : null;
  }

  if(tagFile === null)
  {
    return {
      ok: false,
      status: "missing_index",
      root: resolved.alias,
      message: "tags file not found; run build_ctags or set autoBuild=true",
    };
  }

  let stdout = "";
  try
  {
    ({ stdout } = await execFileSafe("rg", [
      "-n",
      "--color",
      "never",
      "--max-count",
      "200",
      `^${escapeRegex(args.symbol)}\t`,
      tagFile,
    ]));
  }
  catch(error)
  {
    const maybeCode = error as { code?: number };
    if(maybeCode.code !== 1)
      throw error;
  }

  const matches = stdout
    .split("\n")
    .filter(Boolean)
    .map(line => line.replace(/^\d+:/, ""))
    .map(line => {
      const parts = line.split("\t");
      if(parts.length < 4 || parts[0] !== args.symbol)
        return null;

      const extensionFields = parts.slice(4);
      const lineField = extensionFields.find(field => field.startsWith("line:"));
      return {
        symbol: parts[0],
        file: parts[1],
        pattern: parts[2],
        kind: parts[3],
        line: lineField ? Number(lineField.replace("line:", "")) : null,
      };
    })
    .filter(Boolean);

  return {
    ok: true,
    root: resolved.alias,
    symbol: args.symbol,
    count: matches.length,
    matches,
  };
}
