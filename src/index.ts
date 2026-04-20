#!/usr/bin/env node

import "dotenv/config";
import { createRequire } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json") as { version: string };

function printHelp(): void {
  console.log(`
  ploomes-mcp-server v${VERSION}
  Unofficial MCP server for Ploomes CRM

  Usage:
    ploomes-mcp-server                       Start the MCP server (stdio)
    ploomes-mcp-server init                  Interactive setup wizard
    ploomes-mcp-server init [flags]          Non-interactive setup (see below)
    ploomes-mcp-server doctor                Verify MCP configs and spawn behavior
    ploomes-mcp-server --help                Show this help
    ploomes-mcp-server --version             Show version

  Init flags (non-interactive):
    --key <user-key>       Ploomes User-Key (or set PLOOMES_USER_KEY env var)
    --target <name>        Which client to configure. One of:
                             claude-desktop
                             claude-code-project
                             claude-code-global
                             cursor
                             vscode
                             all        (configures every global client)
                             manual     (prints JSON, writes nothing)
    --yes                  Overwrite existing "ploomes" entries without asking
    -y                     Alias for --yes

  Environment:
    PLOOMES_USER_KEY      (required) Your Ploomes API key
    MCP_TRANSPORT         "stdio" (default) or "http"
    MCP_HTTP_PORT         HTTP port when using http transport (default: 3000)

  Examples:
    npx ploomes-mcp-server init
    npx ploomes-mcp-server init --key YOUR_KEY --target all --yes
    npx ploomes-mcp-server init --target claude-desktop --yes       # reads PLOOMES_USER_KEY
    npx ploomes-mcp-server doctor
`);
}

interface ParsedInitFlags {
  userKey?: string;
  target?: string;
  yes?: boolean;
}

function parseInitFlags(argv: readonly string[]): ParsedInitFlags {
  const out: ParsedInitFlags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--yes" || arg === "-y" || arg === "--force") {
      out.yes = true;
      continue;
    }
    if (arg === "--key" || arg === "-k") {
      out.userKey = argv[++i];
      continue;
    }
    if (arg.startsWith("--key=")) {
      out.userKey = arg.slice("--key=".length);
      continue;
    }
    if (arg === "--target" || arg === "-t") {
      out.target = argv[++i];
      continue;
    }
    if (arg.startsWith("--target=")) {
      out.target = arg.slice("--target=".length);
      continue;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "init" || arg === "setup") {
    const { runSetup } = await import("./cli/setup.js");
    const flags = parseInitFlags(process.argv.slice(3));
    await runSetup(flags);
    return;
  }

  if (arg === "doctor" || arg === "verify") {
    const { runDoctor } = await import("./cli/doctor.js");
    await runDoctor();
    return;
  }

  if (arg === "--help" || arg === "-h") {
    printHelp();
    return;
  }

  if (arg === "--version" || arg === "-v") {
    console.log(VERSION);
    return;
  }

  // Default: start MCP server
  const transportType = process.env.MCP_TRANSPORT ?? "stdio";
  const server = createServer();

  if (transportType === "http") {
    await startHttpTransport(server);
  } else {
    await startStdioTransport(server);
  }
}

async function startStdioTransport(server: ReturnType<typeof createServer>): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Ploomes MCP server running via stdio");
}

async function startHttpTransport(server: ReturnType<typeof createServer>): Promise<void> {
  // Dynamic imports so stdio mode doesn't require http modules loaded
  const http = await import("node:http");
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );

  const port = Number(process.env.MCP_HTTP_PORT ?? 3000);

  const httpServer = http.createServer(async (req, res) => {
    // Only accept POST /mcp
    if (req.method === "POST" && req.url === "/mcp") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());

          // Stateless: new transport per request
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
          });

          res.on("close", () => transport.close());
          await server.connect(transport);
          await transport.handleRequest(req, res, body);
        } catch (err) {
          logger.error("HTTP request error:", err);
          if (!res.headersSent) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid request" }));
          }
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(port, "127.0.0.1", () => {
    logger.info(`Ploomes MCP server running on http://127.0.0.1:${port}/mcp`);
  });
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
