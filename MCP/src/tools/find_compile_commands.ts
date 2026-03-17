import type { LoadedConfig } from "../util/config.js";
import { execFileSafe } from "../util/exec.js";
import { resolveRoot } from "../util/repo.js";

export interface FindCompileCommandsArgs
{
  root: string;
}

export async function findCompileCommands(loaded: LoadedConfig, args: FindCompileCommandsArgs)
{
  const resolved = resolveRoot(loaded, args.root);
  const excludeArgs = loaded.config.scanPolicy.excludeDirs.flatMap(dir => ["-g", `!${dir}/**`]);
  let stdout = "";
  try
  {
    ({ stdout } = await execFileSafe("rg", [
      "--files",
      ...excludeArgs,
      "-g",
      "compile_commands.json",
      resolved.rootPath,
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
    .map(file => ({
      file: file.replace(`${resolved.rootPath}/`, ""),
    }));

  return {
    ok: true,
    root: resolved.alias,
    count: matches.length,
    matches,
  };
}
