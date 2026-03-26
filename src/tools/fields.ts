import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import { listResponse, errorResponse, PloomesListResponse } from "../utils/formatter.js";

export function registerFieldTools(server: McpServer, client: PloomesClient): void {
  // ── LIST FIELDS ──
  server.registerTool(
    "ploomes_fields_list",
    {
      title: "List Fields",
      description:
        "List custom fields configured in Ploomes CRM. Filter by EntityId to get fields for a specific entity (e.g., Contacts, Deals). Useful for discovering FieldKey values to use with OtherProperties.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "EntityId eq 1" (1=Contact, 2=Deal)'),
        select: z.string().optional().describe("Fields to return"),
        expand: z.string().optional().describe("Related entities"),
        orderby: z.string().optional().describe("Sort expression"),
        top: z.number().optional().default(100).describe("Max items (default 100, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Fields", buildODataParams(input));
        return listResponse("field", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
