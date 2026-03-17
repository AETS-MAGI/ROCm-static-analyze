import path from "node:path";

import { loadConfig } from "./util/config.js";
import { commandExists, execFileSafe } from "./util/exec.js";
import { exists } from "./util/fs.js";
import { findCompileCommands } from "./tools/find_compile_commands.js";

interface CommandCheck
{
  name: string;
  required: boolean;
  usedBy: string;
  versionArgs: string[];
}

const COMMANDS: CommandCheck[] = [
  { name: "node", required: true, usedBy: "server runtime / build", versionArgs: ["--version"] },
  { name: "npm", required: true, usedBy: "dependency install", versionArgs: ["--version"] },
  { name: "rg", required: true, usedBy: "grep_code / find_symbols / file scans", versionArgs: ["--version"] },
  { name: "ctags", required: false, usedBy: "build_ctags / query_ctags", versionArgs: ["--version"] },
  { name: "cscope", required: false, usedBy: "build_cscope / query_cscope", versionArgs: ["-V"] },
  { name: "clang", required: false, usedBy: "ast_dump", versionArgs: ["--version"] },
  { name: "clang++", required: false, usedBy: "ast_dump", versionArgs: ["--version"] },
];

function getArgValue(flag: string): string | null
{
  const index = process.argv.indexOf(flag);
  if(index === -1)
    return null;
  return process.argv[index + 1] ?? null;
}

async function getVersion(command: string, versionArgs: string[]): Promise<string | null>
{
  if(!(await commandExists(command)))
    return null;

  try
  {
    const { stdout, stderr } = await execFileSafe(command, versionArgs);
    return (stdout || stderr).split("\n").find(Boolean)?.trim() ?? "(version unavailable)";
  }
  catch
  {
    return "(version unavailable)";
  }
}

async function main()
{
  const configArg = getArgValue("--config") ?? path.resolve(process.cwd(), "config/rocm-static.json");
  const loaded = await loadConfig(configArg);

  process.stdout.write(`MCP project: ${loaded.projectRoot}\n`);
  process.stdout.write(`Config: ${loaded.configPath}\n`);
  process.stdout.write(`Cache: ${path.resolve(loaded.projectRoot, loaded.config.policies.cacheDir)}\n\n`);

  process.stdout.write("Command dependencies\n");
  for(const command of COMMANDS)
  {
    const installed = await commandExists(command.name);
    const version = await getVersion(command.name, command.versionArgs);
    process.stdout.write(
      `- ${command.name}: ${installed ? "OK" : command.required ? "MISSING (required)" : "missing (optional)"} | ${command.usedBy}` +
      `${version ? ` | ${version}` : ""}\n`,
    );
  }

  process.stdout.write("\nConfigured roots\n");
  for(const [alias, rootPath] of Object.entries(loaded.config.repoAliases))
  {
    const present = await exists(rootPath);
    const meta = loaded.config.repoMeta[alias];
    process.stdout.write(
      `- ${alias}: ${present ? "OK" : "MISSING"} | ${rootPath}` +
      `${meta ? ` | ${meta.status} / ${meta.role}` : ""}\n`,
    );
  }

  process.stdout.write("\ncompile_commands readiness\n");
  for(const alias of Object.keys(loaded.config.repoAliases))
  {
    const result = await findCompileCommands(loaded, { root: alias });
    process.stdout.write(`- ${alias}: ${result.count} compile_commands.json\n`);
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
