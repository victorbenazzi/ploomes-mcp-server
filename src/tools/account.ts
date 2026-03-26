import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import { jsonResponse, errorResponse } from "../utils/formatter.js";

export function registerAccountTools(server: McpServer, client: PloomesClient): void {
  server.registerTool(
    "ploomes_account_info",
    {
      title: "Get Account Info",
      description:
        "Get information about the current Ploomes CRM account including company Name, Email, Phone, Website, " +
        "Register (CNPJ), CityId, StreetAddress, and plan details. " +
        "Use $expand=OtherProperties,Plan to include custom fields and plan info.",
      inputSchema: {
        expand: z.string().optional().describe('Related entities to include. Available: "OtherProperties", "Plan". E.g.: "OtherProperties,Plan"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,Email,Phone,Website,Register"'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const params = buildODataParams(input);
        const data = await client.get<Record<string, unknown>>("/Account", params);
        return jsonResponse("Account info:", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
