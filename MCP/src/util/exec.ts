import { promisify } from "node:util";
import { execFile as execFileCb } from "node:child_process";

const execFileAsync = promisify(execFileCb);

export interface ExecResult
{
  stdout: string;
  stderr: string;
}

export async function execFileSafe(
  file: string,
  args: string[],
  cwd?: string,
): Promise<ExecResult>
{
  const { stdout, stderr } = await execFileAsync(file, args, {
    cwd,
    maxBuffer: 8 * 1024 * 1024,
    encoding: "utf8",
  });
  return { stdout, stderr };
}

export async function commandExists(command: string): Promise<boolean>
{
  try
  {
    await execFileSafe("bash", ["-lc", `command -v ${command}`]);
    return true;
  }
  catch
  {
    return false;
  }
}
