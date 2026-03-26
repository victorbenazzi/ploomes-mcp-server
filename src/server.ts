import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PloomesClient } from "./client/ploomes-client.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerDealTools } from "./tools/deals.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerPipelineTools } from "./tools/pipelines.js";
import { registerInteractionTools } from "./tools/interactions.js";
import { registerFieldTools } from "./tools/fields.js";
import { registerUserTools } from "./tools/users.js";
import { registerAccountTools } from "./tools/account.js";
import { registerQuoteTools } from "./tools/quotes.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerProductTools } from "./tools/products.js";

export function createServer(): McpServer {
  const userKey = process.env.PLOOMES_USER_KEY;
  if (!userKey) {
    throw new Error(
      "PLOOMES_USER_KEY environment variable is required. Get your key from Ploomes > Settings > Integration."
    );
  }

  const client = new PloomesClient({
    baseUrl: process.env.PLOOMES_BASE_URL ?? "https://api2.ploomes.com",
    userKey,
    rateLimit: process.env.PLOOMES_RATE_LIMIT ? Number(process.env.PLOOMES_RATE_LIMIT) : undefined,
  });

  const server = new McpServer({
    name: "ploomes-mcp-server",
    version: "1.0.0",
  });

  // Priority 1 — Core
  registerContactTools(server, client);
  registerDealTools(server, client);
  registerTaskTools(server, client);
  registerPipelineTools(server, client);

  // Priority 2 — Context & structure
  registerInteractionTools(server, client);
  registerFieldTools(server, client);
  registerUserTools(server, client);
  registerAccountTools(server, client);

  // Priority 3 — Full coverage
  registerQuoteTools(server, client);
  registerOrderTools(server, client);
  registerProductTools(server, client);

  return server;
}
