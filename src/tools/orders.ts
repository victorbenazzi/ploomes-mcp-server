import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import {
  listResponse,
  getResponse,
  createResponse,
  updateResponse,
  deleteResponse,
  errorResponse,
  PloomesListResponse,
} from "../utils/formatter.js";
import { otherPropertySchema } from "../types/schemas.js";

export function registerOrderTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_orders_list",
    {
      title: "List Orders",
      description:
        "Search and list orders in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination. Use $expand=OtherProperties to include custom fields.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter expression. E.g.: "DealId eq 123", "ContactId eq 456", "StageId eq 10"'),
        select: z.string().optional().describe('Comma-separated fields to return. E.g.: "Id,Title,ContactId,Amount"'),
        expand: z.string().optional().describe('Related entities to include. E.g.: "Contact, Person, Deal, Template, Pages, Products, Sections, Attachments, OtherProperties, Comments"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "CreateDate desc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
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

  // ── GET ──
  server.registerTool(
    "ploomes_orders_get",
    {
      title: "Get Order",
      description: "Get a single order by ID from Ploomes CRM. Use $expand to include related entities like OtherProperties, Products, or Attachments.",
      inputSchema: {
        id: z.number().describe("Order ID"),
        expand: z.string().optional().describe('Related entities to include. E.g.: "OtherProperties,Products,Attachments"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Title,ContactId,Amount"'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, expand, select }) => {
      try {
        const params = buildODataParams({
          filter: `Id eq ${id}`,
          expand,
          select,
          top: 1,
        });
        const data = await client.get<PloomesListResponse>("/Orders", params);
        return getResponse("Order", id, data);
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
      description: "Create a new order in Ploomes CRM. ContactId is required.",
      inputSchema: {
        ContactId: z.number().describe("Associated contact ID (required)"),
        Title: z.string().optional().describe("Order title"),
        DealId: z.number().optional().describe("Associated deal ID"),
        Amount: z.number().optional().describe("Order total amount"),
        Discount: z.number().optional().describe("Discount value"),
        Date: z.string().optional().describe("Order date in ISO 8601 format"),
        PersonId: z.number().optional().describe("Associated person ID"),
        StageId: z.number().optional().describe("Order stage ID — use ploomes_orders_stages_list"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        CurrencyId: z.number().optional().describe("Currency ID"),
        Description: z.string().optional().describe("Order description"),
        InternalComments: z.string().optional().describe("Internal comments (not visible externally)"),
        TemplateId: z.number().optional().describe("Order template ID"),
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
      description: "Update an existing order in Ploomes CRM by ID. Only provided fields are changed.",
      inputSchema: {
        id: z.number().describe("Order ID to update"),
        Title: z.string().optional().describe("Order title"),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        Amount: z.number().optional().describe("Order total amount"),
        Discount: z.number().optional().describe("Discount value"),
        Date: z.string().optional().describe("Order date in ISO 8601 format"),
        PersonId: z.number().optional().describe("Associated person ID"),
        StageId: z.number().optional().describe("Order stage ID — use ploomes_orders_stages_list"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        CurrencyId: z.number().optional().describe("Currency ID"),
        Description: z.string().optional().describe("Order description"),
        InternalComments: z.string().optional().describe("Internal comments (not visible externally)"),
        TemplateId: z.number().optional().describe("Order template ID"),
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
