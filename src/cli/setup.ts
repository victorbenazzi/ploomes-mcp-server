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
  },
  {
    label: "Claude Code (this project)",
    description: "Project-level .mcp.json in current directory",
    getPath: () => path.join(process.cwd(), ".mcp.json"),
    scope: "project",
    configKey: "mcpServers",
  },
  {
    label: "Claude Code (global)",
    description: "Global ~/.claude/settings.json",
    getPath: () => path.join(os.homedir(), ".claude", "settings.json"),
    scope: "global",
    configKey: "mcpServers",
  },
  {
    label: "Cursor",
    description: "Global ~/.cursor/mcp.json",
    getPath: () => path.join(os.homedir(), ".cursor", "mcp.json"),
    scope: "global",
    configKey: "mcpServers",
  },
  {
    label: "VS Code (Copilot)",
    description: "Project-level .vscode/mcp.json",
    getPath: () => path.join(process.cwd(), ".vscode", "mcp.json"),
    scope: "project",
    configKey: "servers",
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

export async function runSetup(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("  ╔══════════════════════════════════════════╗");
  console.log("  ║   Ploomes MCP Server — Setup Wizard      ║");
  console.log("  ╚══════════════════════════════════════════╝");

  try {
    const userKey = await askUserKey(rl);
    const targetIndex = await askTarget(rl);
    const serverConfig = buildServerConfig(userKey);

    console.log("");

    // Manual mode — just print the JSON
    if (targetIndex === MANUAL_INDEX) {
      console.log("  Add this to your MCP client configuration:");
      console.log("");
      console.log("  " + JSON.stringify({ ploomes: serverConfig }, null, 2).split("\n").join("\n  "));
      console.log("");
      console.log("  Done! Add the above under your client's \"mcpServers\" key.");
      return;
    }

    // Auto-configure target
    const target = TARGETS[targetIndex];
    const configPath = target.getPath();
    const existing = readJsonFile(configPath);

    // Ensure the servers object exists
    const serversKey = target.configKey;
    if (!existing[serversKey] || typeof existing[serversKey] !== "object") {
      existing[serversKey] = {};
    }

    const servers = existing[serversKey] as Record<string, unknown>;

    // Check if already configured
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

    // Client-specific post-install hints
    if (target.label.startsWith("Claude Desktop")) {
      console.log("  Restart Claude Desktop to activate the server.");
    } else if (target.label.startsWith("Claude Code")) {
      console.log("  The server will be available on your next Claude Code session.");
    } else if (target.label === "Cursor") {
      console.log("  Restart Cursor to activate the server.");
    } else if (target.label.startsWith("VS Code")) {
      console.log("  Reload VS Code window to activate the server.");
    }

    console.log("");
    console.log("  You're all set! The Ploomes MCP tools are ready to use.");
  } finally {
    rl.close();
  }
}
