import type { LoadedConfig } from "../util/config.js";
import { execFileSafe } from "../util/exec.js";
import { resolveRoot } from "../util/repo.js";

export interface GrepCodeArgs
{
  pattern: string;
  root: string;
  glob?: string;
  maxResults?: number;
}

export async function grepCode(loaded: LoadedConfig, args: GrepCodeArgs)
{
  const resolved = resolveRoot(loaded, args.root);
  const maxResults = args.maxResults ?? loaded.config.tools.grep_code?.maxResults ?? 100;
  const globs = args.glob ? [args.glob] : loaded.config.scanPolicy.includeGlobs;
  const excludeArgs = loaded.config.scanPolicy.excludeDirs.flatMap(dir => ["-g", `!${dir}/**`]);
  const includeArgs = globs.flatMap(glob => ["-g", glob]);
  const commandArgs = [
    "-n",
    "-S",
    "--color",
    "never",
    "--max-count",
    String(maxResults),
    ...excludeArgs,
    ...includeArgs,
    args.pattern,
    resolved.rootPath,
  ];

  let stdout = "";
  try
  {
    ({ stdout } = await execFileSafe("rg", commandArgs));
  }
  catch(error)
  {
    const maybeCode = error as { code?: number };
    if(maybeCode.code !== 1)
      throw error;
  }
  const results = stdout
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.*?):(\d+):(.*)$/);
      if(!match)
        return null;
      return {
        file: match[1].replace(`${resolved.rootPath}/`, ""),
        line: Number(match[2]),
        text: match[3].trim(),
      };
    })
    .filter(Boolean);

  return {
    ok: true,
    root: resolved.alias,
    pattern: args.pattern,
    count: results.length,
    results,
  };
}
