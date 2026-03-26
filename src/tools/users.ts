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
        "List users in the Ploomes CRM account. Returns Id, Name, Email, AvatarUrl, RoleId, ProfileId, Phone, etc. " +
        "Use the returned Id as OwnerId when creating or assigning contacts, deals, tasks, and interaction records. " +
        "Use $expand=Role,Profile,Teams,OtherProperties to include related data.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter expression. E.g.: "Name eq \'John\'", "Email eq \'john@example.com\'"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Name,Email,RoleId,ProfileId,Phone"'),
        expand: z.string().optional().describe('Related entities to include. Available: "Role", "Profile", "Teams", "OtherProperties". E.g.: "Role,Profile,Teams,OtherProperties"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Name asc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
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
