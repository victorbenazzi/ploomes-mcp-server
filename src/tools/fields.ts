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
        "List custom fields configured in Ploomes CRM. Filter by EntityId to get fields for a specific entity. " +
        "Known EntityId values: 1=Contact, 2=Deal, 4=Order, 7=Quote, 10=Product, 12=Task, 36=Interaction Record. " +
        "Use ploomes_fields_entities_list for the complete mapping. " +
        "Each field has a Key (used in OtherProperties when reading/writing custom field values), Name, and TypeId. " +
        "Use ploomes_fields_types_list to understand which value property to use for each field type " +
        "(e.g., StringValue, IntegerValue, DateTimeValue, BoolValue, BigStringValue, ObjectValueName). " +
        "Use $expand=Entity,Type,OptionsTable to include related info.",
      inputSchema: {
        filter: z.string().optional().describe(
          'OData $filter expression. E.g.: "EntityId eq 1" (Contact fields), "EntityId eq 2" (Deal fields), ' +
          '"EntityId eq 12" (Task fields), "TypeId eq 1", "Name eq \'Custom Field Name\'"'
        ),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Key,Name,EntityId,TypeId"'),
        expand: z.string().optional().describe('Related entities to include. Available: "Entity", "SecondaryEntity", "Type", "OptionsTable". E.g.: "Entity,Type,OptionsTable"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Name asc", "EntityId asc"'),
        top: z.number().optional().default(100).describe("Max items to return (default 100, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
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
