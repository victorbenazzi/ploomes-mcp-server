import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import {
  listResponse,
  createResponse,
  updateResponse,
  deleteResponse,
  errorResponse,
  PloomesListResponse,
} from "../utils/formatter.js";

const otherPropertySchema = z.object({
  FieldKey: z.string().describe("Custom field key"),
  StringValue: z.string().optional(),
  IntegerValue: z.number().optional(),
  DateTimeValue: z.string().optional(),
  BoolValue: z.boolean().optional(),
  BigStringValue: z.string().optional(),
  ObjectValueName: z.string().optional(),
});

export function registerQuoteTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_quotes_list",
    {
      title: "List Quotes",
      description: "List quotes (proposals) in Ploomes CRM. Filter by DealId, ContactId, etc.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "DealId eq 123"'),
        select: z.string().optional().describe("Fields to return"),
        expand: z.string().optional().describe("Related entities to include"),
        orderby: z.string().optional().describe("Sort expression"),
        top: z.number().optional().default(50).describe("Max items (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Quotes", buildODataParams(input));
        return listResponse("quote", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_quotes_create",
    {
      title: "Create Quote",
      description: "Create a new quote (proposal) in Ploomes CRM.",
      inputSchema: {
        Title: z.string().optional().describe("Quote title"),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/Quotes", input);
        return createResponse("Quote", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_quotes_update",
    {
      title: "Update Quote",
      description: "Update an existing quote in Ploomes CRM.",
      inputSchema: {
        id: z.number().describe("Quote ID to update"),
        Title: z.string().optional().describe("Quote title"),
        DealId: z.number().optional().describe("Deal ID"),
        ContactId: z.number().optional().describe("Contact ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/Quotes(${id})`, fields);
        return updateResponse("Quote", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_quotes_delete",
    {
      title: "Delete Quote",
      description: "Delete a quote from Ploomes CRM by ID.",
      inputSchema: { id: z.number().describe("Quote ID to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Quotes(${id})`);
        return deleteResponse("Quote", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
