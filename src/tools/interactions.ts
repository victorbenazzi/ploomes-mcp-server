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

export function registerInteractionTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_interactions_list",
    {
      title: "List Interaction Records",
      description:
        "List interaction records (notes, activities) in Ploomes CRM. Filter by DealId or ContactId to see interactions for a specific entity.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "DealId eq 123"'),
        select: z.string().optional().describe("Fields to return"),
        expand: z.string().optional().describe("Related entities to include"),
        orderby: z.string().optional().describe('Sort. E.g.: "Date desc"'),
        top: z.number().optional().default(50).describe("Max items (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip"),
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

  // ── CREATE ──
  server.registerTool(
    "ploomes_interactions_create",
    {
      title: "Create Interaction Record",
      description:
        "Create a new interaction record (note/activity) in Ploomes CRM. Attach to a deal or contact.",
      inputSchema: {
        Content: z.string().describe("Interaction content / note text (required)"),
        Date: z.string().optional().describe("Date in ISO 8601. Defaults to now if omitted."),
        DealId: z.number().optional().describe("Associated deal ID"),
        ContactId: z.number().optional().describe("Associated contact ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
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
      description: "Update an existing interaction record in Ploomes CRM.",
      inputSchema: {
        id: z.number().describe("Interaction record ID"),
        Content: z.string().optional().describe("Updated content"),
        Date: z.string().optional().describe("Updated date in ISO 8601"),
        DealId: z.number().optional().describe("Deal ID"),
        ContactId: z.number().optional().describe("Contact ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
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
