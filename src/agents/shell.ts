import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function which(binary: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`which ${binary}`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function getVersion(binary: string, flag = "--version"): Promise<string | null> {
  try {
    const { stdout, stderr } = await execAsync(`${binary} ${flag} 2>&1`);
    const output = (stdout || stderr).trim();
    // Extract semver-like pattern
    const match = output.match(/\d+\.\d+[\.\d]*/);
    return match ? match[0] : output.split("\n")[0] || null;
  } catch {
    return null;
  }
}
