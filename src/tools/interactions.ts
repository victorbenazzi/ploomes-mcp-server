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

export function registerInteractionTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_interactions_list",
    {
      title: "List Interaction Records",
      description:
        "Search and list interaction records (notes, emails, activities) in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination. Full $expand options: Contact, Deal, Tags, Comments, NotifiedUsers, OtherProperties.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter expression. E.g.: "DealId eq 789", "ContactId eq 123", "Date ge 2025-01-01T00:00:00Z", "TypeId eq 1"'),
        select: z.string().optional().describe('Comma-separated fields to return. E.g.: "Id,Content,Date,DealId,ContactId"'),
        expand: z.string().optional().describe('Related entities to include. Available: Contact, Deal, Tags, Comments, NotifiedUsers, OtherProperties. E.g.: "Contact,Deal,OtherProperties"'),
        orderby: z.string().optional().describe('Sort expression. E.g.: "Date desc"'),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/InteractionRecords", buildODataParams(input));
        return listResponse("interaction record", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── GET ──
  server.registerTool(
    "ploomes_interactions_get",
    {
      title: "Get Interaction Record",
      description:
        "Get a single interaction record by ID from Ploomes CRM. Use $expand to include related entities like Contact, Deal, Tags, Comments, NotifiedUsers, or OtherProperties.",
      inputSchema: {
        id: z.number().describe("Interaction record ID"),
        expand: z.string().optional().describe('Related entities to include. Available: Contact, Deal, Tags, Comments, NotifiedUsers, OtherProperties. E.g.: "Contact,Deal,OtherProperties"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Content,Date,DealId,ContactId"'),
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
        const data = await client.get<PloomesListResponse>("/InteractionRecords", params);
        return getResponse("Interaction record", id, data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_interactions_create",
    {
      title: "Create Interaction Record",
      description:
        "Create a new interaction record (note, email, activity) in Ploomes CRM. Attach to a deal and/or contact. If DealId is provided, ContactId is auto-filled from the deal when omitted.",
      inputSchema: {
        Content: z.string().describe("Interaction content / note text (required)"),
        Title: z.string().optional().describe("Short title for the interaction"),
        Date: z.string().optional().describe("Date in ISO 8601. Defaults to now if omitted."),
        DealId: z.number().optional().describe("Associated deal ID. When provided, ContactId is auto-filled from the deal if not explicitly set."),
        ContactId: z.number().optional().describe("Associated contact ID. Auto-filled from the deal if DealId is provided and ContactId is omitted."),
        OwnerId: z.number().optional().describe("Owner user ID"),
        TypeId: z.number().optional().describe("Interaction type ID — shares the same types as tasks. Use ploomes_tasks_types_list to discover. Default is 1."),
        EmailRecipients: z.string().optional().describe("Comma-separated email recipients if this interaction is an email"),
        EmailSubject: z.string().optional().describe("Email subject line"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/InteractionRecords", input);
        return createResponse("Interaction record", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_interactions_update",
    {
      title: "Update Interaction Record",
      description:
        "Update an existing interaction record in Ploomes CRM. Only provided fields are changed.",
      inputSchema: {
        id: z.number().describe("Interaction record ID"),
        Content: z.string().optional().describe("Updated content / note text"),
        Title: z.string().optional().describe("Short title for the interaction"),
        Date: z.string().optional().describe("Updated date in ISO 8601"),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        TypeId: z.number().optional().describe("Interaction type ID — shares the same types as tasks. Use ploomes_tasks_types_list to discover."),
        EmailRecipients: z.string().optional().describe("Comma-separated email recipients if this interaction is an email"),
        EmailSubject: z.string().optional().describe("Email subject line"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/InteractionRecords(${id})`, fields);
        return updateResponse("Interaction record", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_interactions_delete",
    {
      title: "Delete Interaction Record",
      description: "Delete an interaction record from Ploomes CRM by ID.",
      inputSchema: { id: z.number().describe("Interaction record ID to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/InteractionRecords(${id})`);
        return deleteResponse("Interaction record", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
