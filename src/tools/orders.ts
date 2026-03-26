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

export function registerOrderTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_orders_list",
    {
      title: "List Orders",
      description: "List orders in Ploomes CRM. Filter by DealId, ContactId, etc.",
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
        const data = await client.get<PloomesListResponse>("/Orders", buildODataParams(input));
        return listResponse("order", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_orders_create",
    {
      title: "Create Order",
      description: "Create a new order in Ploomes CRM.",
      inputSchema: {
        Title: z.string().optional().describe("Order title"),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/Orders", input);
        return createResponse("Order", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_orders_update",
    {
      title: "Update Order",
      description: "Update an existing order in Ploomes CRM.",
      inputSchema: {
        id: z.number().describe("Order ID to update"),
        Title: z.string().optional().describe("Order title"),
        DealId: z.number().optional().describe("Deal ID"),
        ContactId: z.number().optional().describe("Contact ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/Orders(${id})`, fields);
        return updateResponse("Order", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_orders_delete",
    {
      title: "Delete Order",
      description: "Delete an order from Ploomes CRM by ID.",
      inputSchema: { id: z.number().describe("Order ID to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Orders(${id})`);
        return deleteResponse("Order", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
