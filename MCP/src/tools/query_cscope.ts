import path from "node:path";

import type { LoadedConfig } from "../util/config.js";
import { commandExists, execFileSafe } from "../util/exec.js";
import { resolveExistingRepoCacheFile, resolveRoot } from "../util/repo.js";
import { buildCscope } from "./build_cscope.js";

export interface QueryCscopeArgs
{
  mode: "definition" | "callers" | "callees" | "text";
  symbol: string;
  root: string;
  autoBuild?: boolean;
}

const MODE_TO_FLAG: Record<QueryCscopeArgs["mode"], string> = {
  definition: "-1",
  callees: "-2",
  callers: "-3",
  text: "-4",
};

function normalizeFile(rootPath: string, file: string): string
{
  const absoluteRoot = path.resolve(rootPath);
  const absoluteFile = path.resolve(file);
  if(absoluteFile === absoluteRoot || absoluteFile.startsWith(`${absoluteRoot}${path.sep}`))
    return path.relative(absoluteRoot, absoluteFile);
  return file;
}

export async function queryCscope(loaded: LoadedConfig, args: QueryCscopeArgs)
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

  const outputName = loaded.config.tools.build_cscope?.output ?? "cscope.out";
  let dbFile = await resolveExistingRepoCacheFile(loaded, resolved.alias, outputName);

  if(dbFile === null && args.autoBuild)
  {
    const build = await buildCscope(loaded, { root: resolved.alias });
    if(!build.ok)
      return build;
    dbFile = typeof build.output === "string" ? build.output : null;
  }

  if(dbFile === null)
  {
    return {
      ok: false,
      status: "missing_index",
      root: resolved.alias,
      message: "cscope database not found; run build_cscope or set autoBuild=true",
    };
  }

  let stdout = "";
  try
  {
    ({ stdout } = await execFileSafe("cscope", [
      "-d",
      "-L",
      `${MODE_TO_FLAG[args.mode]}${args.symbol}`,
      "-f",
      dbFile,
    ], resolved.rootPath));
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
    .map(line => {
      const match = line.match(/^(\S+)\s+(\S+)\s+(\d+)\s+(.*)$/);
      if(!match)
        return {
          raw: line,
        };
      return {
        file: normalizeFile(resolved.rootPath, match[1]),
        function: match[2],
        line: Number(match[3]),
        text: match[4],
      };
    });

  return {
    ok: true,
    root: resolved.alias,
    mode: args.mode,
    symbol: args.symbol,
    count: matches.length,
    matches,
  };
}
