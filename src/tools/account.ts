import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PloomesClient } from "../client/ploomes-client.js";
import { jsonResponse, errorResponse } from "../utils/formatter.js";

export function registerAccountTools(server: McpServer, client: PloomesClient): void {
  server.registerTool(
    "ploomes_account_info",
    {
      title: "Get Account Info",
      description: "Get information about the current Ploomes CRM account (company name, settings, etc.).",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await client.get<Record<string, unknown>>("/Account");
        return jsonResponse("Account info:", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
