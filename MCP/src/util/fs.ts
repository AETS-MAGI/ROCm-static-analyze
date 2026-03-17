import { access, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function exists(target: string): Promise<boolean>
{
  try
  {
    await access(target);
    return true;
  }
  catch
  {
    return false;
  }
}

export async function ensureDir(target: string): Promise<void>
{
  await mkdir(target, { recursive: true });
}

export function isSubpath(target: string, base: string): boolean
{
  const normalizedBase = path.resolve(base);
  const normalizedTarget = path.resolve(target);
  return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}${path.sep}`);
}

export async function readFileLimited(target: string, maxBytes: number): Promise<string>
{
  const info = await stat(target);
  if(info.size > maxBytes)
    throw new Error(`File exceeds maxFileReadBytes: ${target}`);
  return readFile(target, "utf8");
}
