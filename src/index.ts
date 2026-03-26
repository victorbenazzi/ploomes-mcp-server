#!/usr/bin/env node

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
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
