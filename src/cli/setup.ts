import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ── Types ────────────────────────────────────────────────────────────────────

interface McpServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface Target {
  label: string;
  description: string;
  getPath: () => string;
  scope: "project" | "global";
  configKey: string; // top-level key that wraps servers ("mcpServers" or nested)
  alias: string; // CLI alias used with --target
}

export interface SetupOptions {
  userKey?: string;
  target?: string; // alias, "all", "manual", or undefined
  yes?: boolean; // auto-overwrite
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function claudeDesktopConfigDir(): string {
  switch (process.platform) {
    case "win32":
      return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "Claude");
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", "Claude");
    default:
      return path.join(os.homedir(), ".config", "Claude");
  }
}

const TARGETS: Target[] = [
  {
    label: "Claude Desktop",
    description: "Global config for Claude Desktop app",
    getPath: () => path.join(claudeDesktopConfigDir(), "claude_desktop_config.json"),
    scope: "global",
    configKey: "mcpServers",
    alias: "claude-desktop",
  },
  {
    label: "Claude Code (this project)",
    description: "Project-level .mcp.json in current directory",
    getPath: () => path.join(process.cwd(), ".mcp.json"),
    scope: "project",
    configKey: "mcpServers",
    alias: "claude-code-project",
  },
  {
    label: "Claude Code (global)",
    description: "Global ~/.claude/settings.json",
    getPath: () => path.join(os.homedir(), ".claude", "settings.json"),
    scope: "global",
    configKey: "mcpServers",
    alias: "claude-code-global",
  },
  {
    label: "Cursor",
    description: "Global ~/.cursor/mcp.json",
    getPath: () => path.join(os.homedir(), ".cursor", "mcp.json"),
    scope: "global",
    configKey: "mcpServers",
    alias: "cursor",
  },
  {
    label: "VS Code (Copilot)",
    description: "Project-level .vscode/mcp.json",
    getPath: () => path.join(process.cwd(), ".vscode", "mcp.json"),
    scope: "project",
    configKey: "servers",
    alias: "vscode",
  },
];

const MANUAL_INDEX = TARGETS.length; // "Show config" is last option

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function buildServerConfig(userKey: string): McpServerConfig {
  // On Windows, MCP clients spawn the command without a shell. Node's spawn()
  // cannot resolve `.cmd` / `.bat` directly, so `npx.cmd` fails silently
  // (server never starts, no tools appear in the chat). The reliable fix is
  // to invoke through `cmd /c`, which gives a shell that handles extension
  // resolution and PATH lookup the way a user terminal would.
  const isWindows = process.platform === "win32";
  return {
    command: isWindows ? "cmd" : "npx",
    args: isWindows
      ? ["/c", "npx", "-y", "ploomes-mcp-server"]
      : ["-y", "ploomes-mcp-server"],
    env: {
      PLOOMES_USER_KEY: userKey,
    },
  };
}

function readJsonFile(filePath: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function printManualConfig(serverConfig: McpServerConfig): void {
  console.log("  Add this to your MCP client configuration:");
  console.log("");
  console.log("  " + JSON.stringify({ ploomes: serverConfig }, null, 2).split("\n").join("\n  "));
  console.log("");
  console.log("  Done! Add the above under your client's \"mcpServers\" key.");
}

function applyToTarget(
  target: Target,
  serverConfig: McpServerConfig,
  { force }: { force: boolean },
): { written: boolean; path: string; reason?: string } {
  const configPath = target.getPath();
  const existing = readJsonFile(configPath);
  const serversKey = target.configKey;

  if (!existing[serversKey] || typeof existing[serversKey] !== "object") {
    existing[serversKey] = {};
  }

  const servers = existing[serversKey] as Record<string, unknown>;

  if (servers["ploomes"] && !force) {
    return { written: false, path: configPath, reason: "already exists (pass --yes to overwrite)" };
  }

  servers["ploomes"] = serverConfig;
  writeJsonFile(configPath, existing);
  return { written: true, path: configPath };
}

function restartHintFor(target: Target): string | null {
  if (target.label.startsWith("Claude Desktop")) return "Restart Claude Desktop to activate the server.";
  if (target.label.startsWith("Claude Code")) return "The server will be available on your next Claude Code session.";
  if (target.label === "Cursor") return "Restart Cursor to activate the server.";
  if (target.label.startsWith("VS Code")) return "Reload VS Code window to activate the server.";
  return null;
}

function resolveTargets(alias: string): Target[] | "manual" | null {
  if (alias === "manual") return "manual";
  if (alias === "all") return TARGETS.filter((t) => t.scope === "global");
  const match = TARGETS.find((t) => t.alias === alias);
  return match ? [match] : null;
}

// ── Interactive prompts ──────────────────────────────────────────────────────

async function askUserKey(rl: readline.Interface): Promise<string> {
  console.log("");
  console.log("  Your Ploomes User-Key can be found at:");
  console.log("  Ploomes > Settings > Integration > API Key");
  console.log("");

  while (true) {
    const key = (await rl.question("  Ploomes User-Key: ")).trim();
    if (key.length > 0) return key;
    console.log("  Key cannot be empty. Try again.");
  }
}

async function askTarget(rl: readline.Interface): Promise<number> {
  console.log("");
  console.log("  Where do you want to configure the MCP server?");
  console.log("");

  for (let i = 0; i < TARGETS.length; i++) {
    const t = TARGETS[i];
    const scope = t.scope === "project" ? "(project)" : "(global)";
    console.log(`  ${i + 1}) ${t.label} ${scope}`);
  }
  console.log(`  ${MANUAL_INDEX + 1}) Show config (I'll install manually)`);
  console.log("");

  while (true) {
    const answer = (await rl.question(`  Choose [1-${MANUAL_INDEX + 1}]: `)).trim();
    const num = parseInt(answer, 10);
    if (num >= 1 && num <= MANUAL_INDEX + 1) return num - 1;
    console.log(`  Please enter a number between 1 and ${MANUAL_INDEX + 1}.`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function runSetup(options: SetupOptions = {}): Promise<void> {
  const envKey = process.env.PLOOMES_USER_KEY?.trim();
  const flagKey = options.userKey?.trim();
  const userKeyFromFlags = flagKey && flagKey.length > 0 ? flagKey : envKey && envKey.length > 0 ? envKey : undefined;

  // Non-interactive path: --target was supplied, or both key sources and --yes exist
  const nonInteractive = Boolean(options.target);

  if (nonInteractive) {
    await runNonInteractive(options, userKeyFromFlags);
    return;
  }

  // Fallback to interactive wizard (original behavior)
  await runInteractive(userKeyFromFlags);
}

async function runNonInteractive(options: SetupOptions, userKey: string | undefined): Promise<void> {
  console.log("");
  console.log("  Ploomes MCP Server — non-interactive setup");
  console.log("");

  if (!userKey) {
    console.error("  Error: --key is required (or set PLOOMES_USER_KEY env var).");
    process.exitCode = 1;
    return;
  }

  const targetAlias = (options.target ?? "").trim();
  const resolved = resolveTargets(targetAlias);

  if (resolved === null) {
    const allowed = [...TARGETS.map((t) => t.alias), "all", "manual"].join(", ");
    console.error(`  Error: unknown --target "${targetAlias}". Allowed: ${allowed}`);
    process.exitCode = 1;
    return;
  }

  const serverConfig = buildServerConfig(userKey);

  if (resolved === "manual") {
    printManualConfig(serverConfig);
    return;
  }

  const force = Boolean(options.yes);
  const results = resolved.map((target) => ({
    target,
    result: applyToTarget(target, serverConfig, { force }),
  }));

  let wrote = 0;
  for (const { target, result } of results) {
    if (result.written) {
      wrote++;
      console.log(`  [OK]   ${target.label}`);
      console.log(`         ${result.path}`);
      const hint = restartHintFor(target);
      if (hint) console.log(`         ${hint}`);
    } else {
      console.log(`  [SKIP] ${target.label} — ${result.reason}`);
      console.log(`         ${result.path}`);
    }
  }

  console.log("");
  console.log(`  User-Key: ${maskKey(userKey)}`);
  console.log(`  Wrote: ${wrote} / ${resolved.length}`);
  if (wrote === 0) process.exitCode = 2;
}

async function runInteractive(prefillKey: string | undefined): Promise<void> {
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("  ╔══════════════════════════════════════════╗");
  console.log("  ║   Ploomes MCP Server — Setup Wizard      ║");
  console.log("  ╚══════════════════════════════════════════╝");

  try {
    const userKey = prefillKey ?? (await askUserKey(rl));
    if (prefillKey) {
      console.log("");
      console.log(`  Using Ploomes User-Key from env/flag: ${maskKey(prefillKey)}`);
    }

    const targetIndex = await askTarget(rl);
    const serverConfig = buildServerConfig(userKey);

    console.log("");

    // Manual mode — just print the JSON
    if (targetIndex === MANUAL_INDEX) {
      printManualConfig(serverConfig);
      return;
    }

    const target = TARGETS[targetIndex];
    const configPath = target.getPath();
    const existing = readJsonFile(configPath);
    const serversKey = target.configKey;

    if (!existing[serversKey] || typeof existing[serversKey] !== "object") {
      existing[serversKey] = {};
    }

    const servers = existing[serversKey] as Record<string, unknown>;

    if (servers["ploomes"]) {
      const overwrite = (await rl.question("  Ploomes is already configured here. Overwrite? [y/N]: ")).trim().toLowerCase();
      if (overwrite !== "y" && overwrite !== "yes") {
        console.log("  Aborted. No changes made.");
        return;
      }
    }

    servers["ploomes"] = serverConfig;
    writeJsonFile(configPath, existing);

    console.log(`  Configuration saved to:`);
    console.log(`  ${configPath}`);
    console.log("");
    console.log(`  User-Key: ${maskKey(userKey)}`);
    console.log("");

    const hint = restartHintFor(target);
    if (hint) console.log(`  ${hint}`);
    console.log("");
    console.log("  You're all set! The Ploomes MCP tools are ready to use.");
  } finally {
    rl.close();
  }
}
