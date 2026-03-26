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

export function registerQuoteTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_quotes_list",
    {
      title: "List Quotes",
      description:
        "Search and list quotes (proposals) in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination. Use $expand=OtherProperties to include custom fields.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter expression. E.g.: "DealId eq 123", "ContactId eq 456", "StatusId eq 1"'),
        select: z.string().optional().describe('Comma-separated fields to return. E.g.: "Id,Title,DealId"'),
        expand: z.string().optional().describe('Related entities to include. E.g.: "Deal, Contact, Template, ApprovalStatus, Approvals, Pages, Comments, ExternalComments, Sections, Products, OtherProperties"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "CreateDate desc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
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

  // ── GET ──
  server.registerTool(
    "ploomes_quotes_get",
    {
      title: "Get Quote",
      description: "Get a single quote (proposal) by ID from Ploomes CRM. Use $expand to include related entities like OtherProperties, Products, Pages, or Comments.",
      inputSchema: {
        id: z.number().describe("Quote ID"),
        expand: z.string().optional().describe('Related entities to include. E.g.: "OtherProperties,Products,Pages"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Title,DealId"'),
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
        const data = await client.get<PloomesListResponse>("/Quotes", params);
        return getResponse("Quote", id, data);
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
      description:
        "Create a new quote (proposal) in Ploomes CRM. DealId is required. The QuoteNumber is auto-generated (read-only).",
      inputSchema: {
        DealId: z.number().describe("Associated deal ID (required)"),
        Title: z.string().optional().describe("Quote title"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        TemplateId: z.number().optional().describe("Quote template ID"),
        Shared: z.boolean().optional().describe("Whether the quote is shared externally"),
        ExternalNotifications: z.boolean().optional().describe("Whether to send external notifications"),
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
      description: "Update an existing quote in Ploomes CRM by ID. Only provided fields are changed. The QuoteNumber is read-only and cannot be updated.",
      inputSchema: {
        id: z.number().describe("Quote ID to update"),
        Title: z.string().optional().describe("Quote title"),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        TemplateId: z.number().optional().describe("Quote template ID"),
        Shared: z.boolean().optional().describe("Whether the quote is shared externally"),
        ExternalNotifications: z.boolean().optional().describe("Whether to send external notifications"),
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
