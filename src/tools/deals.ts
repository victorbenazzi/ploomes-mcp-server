import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import {
  listResponse,
  createResponse,
  updateResponse,
  deleteResponse,
  actionResponse,
  errorResponse,
  jsonResponse,
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

export function registerDealTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_deals_list",
    {
      title: "List Deals",
      description:
        "Search and list deals (opportunities) in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination. Filter by ContactId, StageId, StatusId, etc.",
      inputSchema: {
        filter: z.string().optional().describe('OData $filter. E.g.: "ContactId eq 123 and StatusId eq 1"'),
        select: z.string().optional().describe('Fields to return. E.g.: "Id,Title,Amount"'),
        expand: z.string().optional().describe('Related entities. E.g.: "Contact,Stage,OtherProperties"'),
        orderby: z.string().optional().describe('Sort. E.g.: "Amount desc"'),
        top: z.number().optional().default(50).describe("Max items (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Deals", buildODataParams(input));
        return listResponse("deal", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── GET ──
  server.registerTool(
    "ploomes_deals_get",
    {
      title: "Get Deal",
      description: "Get a single deal by ID from Ploomes CRM.",
      inputSchema: {
        id: z.number().describe("Deal ID"),
        expand: z.string().optional().describe('E.g.: "Contact,Stage,OtherProperties,Tasks"'),
        select: z.string().optional().describe("Fields to return"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, expand, select }) => {
      try {
        const params: Record<string, string> = {};
        if (expand) params["$expand"] = expand;
        if (select) params["$select"] = select;
        const data = await client.get<PloomesListResponse>(`/Deals(${id})`, params);
        return jsonResponse(`Deal ${id}:`, data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_deals_create",
    {
      title: "Create Deal",
      description: "Create a new deal (opportunity) in Ploomes CRM. Title is required.",
      inputSchema: {
        Title: z.string().describe("Deal title (required)"),
        ContactId: z.number().optional().describe("Contact (company) ID"),
        PersonId: z.number().optional().describe("Person contact ID"),
        StageId: z.number().optional().describe("Pipeline stage ID"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        Amount: z.number().optional().describe("Deal monetary value"),
        CurrencyId: z.number().optional().describe("Currency ID"),
        OriginId: z.number().optional().describe("Origin ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.post<PloomesListResponse>("/Deals", input);
        return createResponse("Deal", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_deals_update",
    {
      title: "Update Deal",
      description:
        "Update an existing deal in Ploomes CRM. Use this to change stage (StageId), amount, owner, or custom fields.",
      inputSchema: {
        id: z.number().describe("Deal ID to update"),
        Title: z.string().optional().describe("Deal title"),
        ContactId: z.number().optional().describe("Contact ID"),
        PersonId: z.number().optional().describe("Person contact ID"),
        StageId: z.number().optional().describe("Pipeline stage ID (use to move deal between stages)"),
        OwnerId: z.number().optional().describe("Owner user ID"),
        Amount: z.number().optional().describe("Deal monetary value"),
        CurrencyId: z.number().optional().describe("Currency ID"),
        OriginId: z.number().optional().describe("Origin ID"),
        OtherProperties: z.array(otherPropertySchema).optional().describe("Custom field values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        await client.patch(`/Deals(${id})`, fields);
        return updateResponse("Deal", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_deals_delete",
    {
      title: "Delete Deal",
      description: "Delete a deal from Ploomes CRM by ID. This action is irreversible.",
      inputSchema: { id: z.number().describe("Deal ID to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Deals(${id})`);
        return deleteResponse("Deal", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── WIN ──
  server.registerTool(
    "ploomes_deals_win",
    {
      title: "Win Deal",
      description: "Mark a deal as won in Ploomes CRM.",
      inputSchema: { id: z.number().describe("Deal ID to mark as won") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.post(`/Deals(${id})/Win`, {});
        return actionResponse("Deal", id, "marked as won");
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── LOSE ──
  server.registerTool(
    "ploomes_deals_lose",
    {
      title: "Lose Deal",
      description:
        "Mark a deal as lost in Ploomes CRM. Requires a LossReasonId. Use ploomes_deals_loss_reasons_list to find valid reason IDs.",
      inputSchema: {
        id: z.number().describe("Deal ID to mark as lost"),
        LossReasonId: z.number().describe("Loss reason ID (required)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, LossReasonId }) => {
      try {
        await client.post(`/Deals(${id})/Lose`, { LossReasonId });
        return actionResponse("Deal", id, "marked as lost");
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── REOPEN ──
  server.registerTool(
    "ploomes_deals_reopen",
    {
      title: "Reopen Deal",
      description: "Reopen a previously won or lost deal in Ploomes CRM.",
      inputSchema: { id: z.number().describe("Deal ID to reopen") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.post(`/Deals(${id})/Reopen`, {});
        return actionResponse("Deal", id, "reopened");
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
