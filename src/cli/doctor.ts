import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

interface ConfigLocation {
  label: string;
  path: string;
}

function configLocations(): ConfigLocation[] {
  const home = os.homedir();
  const locations: ConfigLocation[] = [];

  switch (process.platform) {
    case "win32": {
      const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
      locations.push({
        label: "Claude Desktop",
        path: path.join(appData, "Claude", "claude_desktop_config.json"),
      });
      break;
    }
    case "darwin":
      locations.push({
        label: "Claude Desktop",
        path: path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      });
      break;
    default:
      locations.push({
        label: "Claude Desktop",
        path: path.join(home, ".config", "Claude", "claude_desktop_config.json"),
      });
  }

  locations.push({
    label: "Claude Code (global)",
    path: path.join(home, ".claude", "settings.json"),
  });
  locations.push({
    label: "Claude Code (project)",
    path: path.join(process.cwd(), ".mcp.json"),
  });
  locations.push({
    label: "Cursor",
    path: path.join(home, ".cursor", "mcp.json"),
  });
  locations.push({
    label: "VS Code (project)",
    path: path.join(process.cwd(), ".vscode", "mcp.json"),
  });

  return locations;
}

function readConfig(filePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function check(label: string, ok: boolean, detail?: string): void {
  const mark = ok ? "  [OK]   " : "  [FAIL] ";
  console.log(`${mark}${label}${detail ? " — " + detail : ""}`);
}

function info(label: string, detail?: string): void {
  console.log(`  [INFO] ${label}${detail ? " — " + detail : ""}`);
}

async function canSpawn(command: string, args: string[]): Promise<{ ok: boolean; reason?: string }> {
  return new Promise((resolve) => {
    try {
      const child = spawn(command, args, { stdio: "ignore", shell: false });
      let settled = false;

      const done = (ok: boolean, reason?: string): void => {
        if (settled) return;
        settled = true;
        try { child.kill(); } catch { /* ignore */ }
        resolve({ ok, reason });
      };

      child.on("error", (err) => done(false, err.message));
      child.on("spawn", () => done(true));
      setTimeout(() => done(true), 1500);
    } catch (err) {
      resolve({ ok: false, reason: (err as Error).message });
    }
  });
}

function validateServerBlock(label: string, block: unknown): boolean {
  if (!block || typeof block !== "object") {
    check(`${label} — ploomes entry valid`, false, "not an object");
    return false;
  }
  const b = block as Record<string, unknown>;
  const command = b.command;
  const args = b.args;
  const env = b.env as Record<string, unknown> | undefined;

  const hasCommand = typeof command === "string" && command.length > 0;
  const hasArgs = Array.isArray(args);
  const hasKey = env && typeof env === "object" && typeof env.PLOOMES_USER_KEY === "string" && (env.PLOOMES_USER_KEY as string).length > 0;

  check(`${label} — command is a string`, hasCommand, hasCommand ? String(command) : undefined);
  check(`${label} — args is an array`, hasArgs, hasArgs ? JSON.stringify(args) : undefined);
  check(`${label} — PLOOMES_USER_KEY set`, Boolean(hasKey));

  if (process.platform === "win32" && hasCommand) {
    const cmd = String(command).toLowerCase();
    const usesDirectCmdExtension = cmd.endsWith(".cmd") || cmd.endsWith(".bat");
    if (usesDirectCmdExtension) {
      check(
        `${label} — Windows spawn pattern`,
        false,
        `"${command}" cannot be spawned directly on Windows. Use "cmd" with args ["/c","npx","-y","ploomes-mcp-server"]. Re-run: npx ploomes-mcp-server init`,
      );
    } else {
      check(`${label} — Windows spawn pattern`, true, `"${command}"`);
    }
  }

  return hasCommand && hasArgs && Boolean(hasKey);
}

export async function runDoctor(): Promise<void> {
  console.log("");
  console.log("  Ploomes MCP — Doctor");
  console.log("");
  console.log(`  Platform: ${process.platform} (${process.arch})`);
  console.log(`  Node:     ${process.version}`);
  console.log("");

  // 1. PLOOMES_USER_KEY in current shell
  info("PLOOMES_USER_KEY in current shell", process.env.PLOOMES_USER_KEY ? "set" : "not set (ok — clients pass it via env)");

  // 2. npx spawn test — the exact pattern the MCP client will use
  const isWin = process.platform === "win32";
  const probeCommand = isWin ? "cmd" : "npx";
  const probeArgs = isWin ? ["/c", "npx", "--version"] : ["--version"];
  const probe = await canSpawn(probeCommand, probeArgs);
  check(`spawn ${probeCommand} ${probeArgs.join(" ")}`, probe.ok, probe.reason);

  if (!probe.ok) {
    console.log("");
    console.log("  The MCP client won't be able to launch the server on this machine.");
    if (isWin) {
      console.log("  Check that Node.js (with npm/npx) is installed and cmd.exe is in PATH.");
    } else {
      console.log("  Check that Node.js (npx) is installed and on PATH.");
    }
  }

  // 3. Check each known config location
  console.log("");
  console.log("  Scanning MCP client configs...");
  console.log("");

  let foundAny = false;
  for (const loc of configLocations()) {
    const cfg = readConfig(loc.path);
    if (!cfg) {
      info(`${loc.label} config`, `not found at ${loc.path}`);
      continue;
    }
    foundAny = true;
    info(`${loc.label} config`, loc.path);

    // Config key varies: "mcpServers" (most) vs "servers" (VS Code)
    const servers =
      (cfg["mcpServers"] as Record<string, unknown> | undefined) ??
      (cfg["servers"] as Record<string, unknown> | undefined);

    if (!servers || typeof servers !== "object") {
      check(`${loc.label} — has mcpServers/servers block`, false);
      continue;
    }

    const ploomes = servers["ploomes"];
    if (!ploomes) {
      check(`${loc.label} — has "ploomes" entry`, false, "run: npx ploomes-mcp-server init");
      continue;
    }

    validateServerBlock(loc.label, ploomes);
  }

  if (!foundAny) {
    console.log("");
    console.log("  No MCP client configs found.");
    console.log("  Run: npx ploomes-mcp-server init");
  }

  // 4. Platform-specific log file hint
  console.log("");
  if (isWin) {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    console.log("  If Claude Desktop still doesn't show the tools, check:");
    console.log(`    ${path.join(appData, "Claude", "logs", "mcp-server-ploomes.log")}`);
    console.log("  Then restart Claude Desktop (quit from system tray, not just close window).");
  } else if (process.platform === "darwin") {
    console.log("  If Claude Desktop still doesn't show the tools, check:");
    console.log(`    ${path.join(os.homedir(), "Library", "Logs", "Claude", "mcp-server-ploomes.log")}`);
    console.log("  Then fully quit (Cmd+Q) and reopen Claude Desktop.");
  } else {
    console.log("  If Claude Desktop still doesn't show the tools, check its log directory.");
  }
  console.log("");
}
