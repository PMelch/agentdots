import { spawn } from "node:child_process";

/**
 * Run a shell command, inheriting stdio so output streams to the terminal.
 * Returns true on exit code 0, false otherwise.
 */
export async function runCommand(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, stdio: "inherit" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}
