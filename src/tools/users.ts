import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import { listResponse, errorResponse, PloomesListResponse } from "../utils/formatter.js";

export function registerUserTools(server: McpServer, client: PloomesClient): void {
  server.registerTool(
    "ploomes_users_list",
    {
      title: "List Users",
      description:
        "List users in the Ploomes CRM account. Useful for finding OwnerId values when creating or assigning contacts, deals, and tasks.",
      inputSchema: {
        filter: z.string().optional().describe("OData $filter expression"),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,Email"'),
        orderby: z.string().optional().describe("Sort expression"),
        top: z.number().optional().default(50).describe("Max items (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Users", buildODataParams(input));
        return listResponse("user", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
